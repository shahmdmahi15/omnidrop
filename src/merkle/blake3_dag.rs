//! BLAKE3 Merkle Directed Acyclic Graph (DAG) for out-of-order chunk verification.
//!
//! Provides verifiable Merkle trees, audit paths, and out-of-order chunk validation
//! with sub-microsecond proof verification per chunk.

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::chunker::ChunkMeta;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum MerkleError {
    #[error("Empty chunk list cannot produce a Merkle DAG")]
    EmptyChunkList,
    #[error("Invalid chunk index {index} for DAG with {total} chunks")]
    IndexOutOfBounds { index: usize, total: usize },
    #[error("Merkle proof verification failed for chunk index {index}")]
    ProofVerificationFailed { index: usize },
    #[error("Hash mismatch: expected {expected}, actual {actual}")]
    HashMismatch { expected: String, actual: String },
    #[error("Serialization error: {0}")]
    Serialization(String),
}

/// Node domain separator for internal nodes in the Merkle Tree.
const INTERNAL_NODE_DOMAIN: u8 = 0x01;

/// Compute parent hash from two child hashes using BLAKE3.
#[inline]
pub fn combine_hashes(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let mut hasher = blake3::Hasher::new();
    hasher.update(&[INTERNAL_NODE_DOMAIN]);
    hasher.update(left);
    hasher.update(right);
    *hasher.finalize().as_bytes()
}

/// Cryptographic audit path (inclusion proof) for a specific chunk leaf.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MerkleProof {
    /// Zero-based chunk index
    pub chunk_index: usize,
    /// Total number of leaf chunks in the DAG
    pub total_chunks: usize,
    /// Sibling hashes along the path from leaf to root
    /// Tuple of (is_right_sibling, sibling_hash)
    pub audit_path: Vec<(bool, [u8; 32])>,
}

impl MerkleProof {
    /// Verify this proof against a known root hash and the chunk's BLAKE3 digest.
    pub fn verify(&self, chunk_hash: &[u8; 32], expected_root: &[u8; 32]) -> bool {
        let mut current_hash = *chunk_hash;

        for (is_right_sibling, sibling_hash) in &self.audit_path {
            if *is_right_sibling {
                current_hash = combine_hashes(&current_hash, sibling_hash);
            } else {
                current_hash = combine_hashes(sibling_hash, &current_hash);
            }
        }

        &current_hash == expected_root
    }
}

/// BLAKE3 Merkle DAG Manifest for a file or directory payload.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Blake3Dag {
    /// Resource name / relative file path
    pub name: String,
    /// Total file size in bytes
    pub total_size: u64,
    /// Root hash of the entire Merkle DAG
    pub root_hash: [u8; 32],
    /// Metadata for all leaf chunks
    pub chunks: Vec<ChunkMeta>,
}

impl Blake3Dag {
    /// Build a Merkle DAG from chunk metadata.
    pub fn from_chunks(
        name: String,
        total_size: u64,
        chunks: Vec<ChunkMeta>,
    ) -> Result<Self, MerkleError> {
        if chunks.is_empty() {
            return Err(MerkleError::EmptyChunkList);
        }

        let leaf_hashes: Vec<[u8; 32]> = chunks.iter().map(|c| c.hash).collect();
        let root_hash = Self::calculate_root(&leaf_hashes);

        Ok(Self {
            name,
            total_size,
            root_hash,
            chunks,
        })
    }

    /// Calculate the root hash of a set of leaf hashes.
    pub fn calculate_root(leaf_hashes: &[[u8; 32]]) -> [u8; 32] {
        if leaf_hashes.is_empty() {
            return *blake3::hash(b"").as_bytes();
        }
        if leaf_hashes.len() == 1 {
            return leaf_hashes[0];
        }

        let mut current_level = leaf_hashes.to_vec();

        while current_level.len() > 1 {
            let mut next_level = Vec::with_capacity(current_level.len().div_ceil(2));
            for chunk in current_level.chunks(2) {
                if chunk.len() == 2 {
                    next_level.push(combine_hashes(&chunk[0], &chunk[1]));
                } else {
                    // Odd element is promoted to next level or hashed with itself
                    next_level.push(combine_hashes(&chunk[0], &chunk[0]));
                }
            }
            current_level = next_level;
        }

        current_level[0]
    }

    /// Generate an inclusion proof for an out-of-order chunk at `chunk_index`.
    pub fn generate_proof(&self, chunk_index: usize) -> Result<MerkleProof, MerkleError> {
        if chunk_index >= self.chunks.len() {
            return Err(MerkleError::IndexOutOfBounds {
                index: chunk_index,
                total: self.chunks.len(),
            });
        }

        if self.chunks.len() == 1 {
            return Ok(MerkleProof {
                chunk_index: 0,
                total_chunks: 1,
                audit_path: Vec::new(),
            });
        }

        let mut audit_path = Vec::new();
        let mut current_level: Vec<[u8; 32]> = self.chunks.iter().map(|c| c.hash).collect();
        let mut idx = chunk_index;

        while current_level.len() > 1 {
            let is_odd = !idx.is_multiple_of(2);
            let sibling_idx = if is_odd { idx - 1 } else { idx + 1 };

            if sibling_idx < current_level.len() {
                // Sibling exists
                audit_path.push((!is_odd, current_level[sibling_idx]));
            } else {
                // Sibling was duplicate of itself
                audit_path.push((!is_odd, current_level[idx]));
            }

            // Move to next tree level
            let mut next_level = Vec::with_capacity(current_level.len().div_ceil(2));
            for chunk in current_level.chunks(2) {
                if chunk.len() == 2 {
                    next_level.push(combine_hashes(&chunk[0], &chunk[1]));
                } else {
                    next_level.push(combine_hashes(&chunk[0], &chunk[0]));
                }
            }

            idx /= 2;
            current_level = next_level;
        }

        Ok(MerkleProof {
            chunk_index,
            total_chunks: self.chunks.len(),
            audit_path,
        })
    }

    /// Verify an out-of-order received chunk payload with its index and proof.
    pub fn verify_chunk(
        &self,
        chunk_index: usize,
        chunk_payload: &[u8],
        proof: &MerkleProof,
    ) -> Result<(), MerkleError> {
        let meta = self
            .chunks
            .get(chunk_index)
            .ok_or(MerkleError::IndexOutOfBounds {
                index: chunk_index,
                total: self.chunks.len(),
            })?;

        let actual_hash = *blake3::hash(chunk_payload).as_bytes();
        if actual_hash != meta.hash {
            return Err(MerkleError::HashMismatch {
                expected: hex::encode(meta.hash),
                actual: hex::encode(actual_hash),
            });
        }

        if !proof.verify(&actual_hash, &self.root_hash) {
            return Err(MerkleError::ProofVerificationFailed { index: chunk_index });
        }

        Ok(())
    }

    /// Hexadecimal representation of root hash.
    pub fn root_hex(&self) -> String {
        hex::encode(self.root_hash)
    }

    /// Serialize manifest to JSON string.
    pub fn to_json(&self) -> Result<String, MerkleError> {
        serde_json::to_string_pretty(self).map_err(|e| MerkleError::Serialization(e.to_string()))
    }

    /// Deserialize manifest from JSON string.
    pub fn from_json(json_str: &str) -> Result<Self, MerkleError> {
        serde_json::from_str(json_str).map_err(|e| MerkleError::Serialization(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_chunk_dag() {
        let data = b"single chunk test payload";
        let hash = *blake3::hash(data).as_bytes();
        let chunk = ChunkMeta {
            index: 0,
            offset: 0,
            length: data.len(),
            hash,
        };

        let dag =
            Blake3Dag::from_chunks("test.txt".into(), data.len() as u64, vec![chunk]).unwrap();
        assert_eq!(dag.root_hash, hash);

        let proof = dag.generate_proof(0).unwrap();
        assert!(dag.verify_chunk(0, data, &proof).is_ok());
    }

    #[test]
    fn test_multi_chunk_out_of_order_verification() {
        let chunk_count = 17; // Odd number to test edge padding
        let mut chunks = Vec::new();
        let mut payloads = Vec::new();

        for i in 0..chunk_count {
            let payload = format!("payload chunk content number {}", i).into_bytes();
            let hash = *blake3::hash(&payload).as_bytes();
            chunks.push(ChunkMeta {
                index: i as u64,
                offset: (i * 100) as u64,
                length: payload.len(),
                hash,
            });
            payloads.push(payload);
        }

        let dag = Blake3Dag::from_chunks("stream.bin".into(), 1700, chunks).unwrap();

        // Verify out of order (e.g. chunk 15, then 2, then 0, then 16)
        let order = [15, 2, 0, 16, 7, 11, 4];
        for &idx in &order {
            let proof = dag.generate_proof(idx).unwrap();
            assert!(dag.verify_chunk(idx, &payloads[idx], &proof).is_ok());

            // Corrupt data must fail
            let mut corrupted = payloads[idx].clone();
            corrupted[0] ^= 0xFF;
            assert!(dag.verify_chunk(idx, &corrupted, &proof).is_err());
        }
    }
}
