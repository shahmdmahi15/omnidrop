//! Sparse File Assembly, Chunk Deduplication Cache, and Zero-Copy Streaming I/O.
//!
//! Enables high-performance out-of-order file writes without fragmentation,
//! maintains cross-file deduplication indices, and optimizes disk throughput.

use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs::{File, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use thiserror::Error;

use crate::chunker::ChunkMeta;
use crate::merkle::Blake3Dag;

#[derive(Error, Debug)]
pub enum VfsError {
    #[error("I/O error: {0}")]
    Io(#[from] io::Error),
    #[error("Chunk write offset {offset} + len {len} exceeds target file size {total_size}")]
    OffsetOverflow {
        offset: u64,
        len: usize,
        total_size: u64,
    },
    #[error("Incomplete file assembly: received {received_chunks} of {total_chunks} chunks")]
    IncompleteAssembly {
        received_chunks: usize,
        total_chunks: usize,
    },
    #[error("Deduplication index error: {0}")]
    DedupError(String),
}

/// Deduplication chunk reference pointing to an existing file location.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChunkLocation {
    pub file_path: PathBuf,
    pub offset: u64,
    pub length: usize,
}

/// Persistent in-memory deduplication index mapping BLAKE3 digests to local chunk storage.
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ChunkDeduplicationMap {
    chunks: HashMap<[u8; 32], ChunkLocation>,
    total_indexed_bytes: u64,
}

impl ChunkDeduplicationMap {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a newly verified chunk into the local deduplication cache.
    pub fn index_chunk(&mut self, hash: [u8; 32], location: ChunkLocation) {
        self.total_indexed_bytes += location.length as u64;
        self.chunks.insert(hash, location);
    }

    /// Check if a chunk already exists locally.
    pub fn lookup(&self, hash: &[u8; 32]) -> Option<&ChunkLocation> {
        self.chunks.get(hash)
    }

    /// Given a file manifest, calculate deduplication savings and missing chunk list.
    pub fn analyze_manifest(&self, dag: &Blake3Dag) -> DedupAnalysis {
        let mut missing_indices = Vec::new();
        let mut local_chunk_count = 0;
        let mut local_bytes = 0u64;

        for (idx, meta) in dag.chunks.iter().enumerate() {
            if self.chunks.contains_key(&meta.hash) {
                local_chunk_count += 1;
                local_bytes += meta.length as u64;
            } else {
                missing_indices.push(idx);
            }
        }

        let dedup_ratio = if dag.total_size > 0 {
            local_bytes as f64 / dag.total_size as f64
        } else {
            0.0
        };

        DedupAnalysis {
            total_chunks: dag.chunks.len(),
            local_chunks: local_chunk_count,
            missing_chunk_indices: missing_indices,
            bytes_saved: local_bytes,
            dedup_ratio,
        }
    }

    pub fn total_indexed_chunks(&self) -> usize {
        self.chunks.len()
    }

    pub fn total_indexed_bytes(&self) -> u64 {
        self.total_indexed_bytes
    }
}

/// Result of evaluating a file manifest against the deduplication index.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DedupAnalysis {
    pub total_chunks: usize,
    pub local_chunks: usize,
    pub missing_chunk_indices: Vec<usize>,
    pub bytes_saved: u64,
    pub dedup_ratio: f64,
}

/// Sparse file writer for writing chunks out of order directly to their target byte offsets.
pub struct SparseFileWriter {
    target_path: PathBuf,
    total_size: u64,
    file: File,
    received_chunks: HashSet<usize>,
    total_chunks: usize,
}

impl SparseFileWriter {
    /// Create and pre-allocate target sparse file on disk.
    pub fn create(
        target_path: impl AsRef<Path>,
        total_size: u64,
        total_chunks: usize,
    ) -> Result<Self, VfsError> {
        let path = target_path.as_ref().to_path_buf();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(true)
            .open(&path)?;

        // Pre-allocate target length
        file.set_len(total_size)?;

        Ok(Self {
            target_path: path,
            total_size,
            file,
            received_chunks: HashSet::new(),
            total_chunks,
        })
    }

    /// Write an out-of-order chunk payload to its designated byte offset.
    pub fn write_chunk(
        &mut self,
        chunk_index: usize,
        offset: u64,
        data: &[u8],
    ) -> Result<(), VfsError> {
        if offset + (data.len() as u64) > self.total_size {
            return Err(VfsError::OffsetOverflow {
                offset,
                len: data.len(),
                total_size: self.total_size,
            });
        }

        self.file.seek(SeekFrom::Start(offset))?;
        self.file.write_all(data)?;
        self.received_chunks.insert(chunk_index);

        Ok(())
    }

    /// Clone or copy an existing local deduplicated chunk directly into the sparse target.
    pub fn copy_local_chunk(
        &mut self,
        chunk_index: usize,
        offset: u64,
        source: &ChunkLocation,
    ) -> Result<(), VfsError> {
        let mut src_file = File::open(&source.file_path)?;
        src_file.seek(SeekFrom::Start(source.offset))?;
        let mut buf = vec![0u8; source.length];
        src_file.read_exact(&mut buf)?;

        self.write_chunk(chunk_index, offset, &buf)
    }

    /// Finalize and sync sparse file to storage media, verifying 100% chunk receipt.
    pub fn finalize(&mut self) -> Result<PathBuf, VfsError> {
        if self.received_chunks.len() < self.total_chunks {
            return Err(VfsError::IncompleteAssembly {
                received_chunks: self.received_chunks.len(),
                total_chunks: self.total_chunks,
            });
        }

        self.file.sync_all()?;
        Ok(self.target_path.clone())
    }

    pub fn is_complete(&self) -> bool {
        self.received_chunks.len() == self.total_chunks
    }

    pub fn progress_pct(&self) -> f64 {
        if self.total_chunks == 0 {
            100.0
        } else {
            (self.received_chunks.len() as f64 / self.total_chunks as f64) * 100.0
        }
    }
}

/// Zero-copy / buffered streaming file reader for chunk extraction.
pub struct StreamingChunkReader {
    pub path: PathBuf,
    file: File,
    file_size: u64,
}

impl StreamingChunkReader {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, VfsError> {
        let path = path.as_ref().to_path_buf();
        let file = File::open(&path)?;
        let file_size = file.metadata()?.len();

        Ok(Self {
            path,
            file,
            file_size,
        })
    }

    pub fn file_size(&self) -> u64 {
        self.file_size
    }

    /// Read chunk data at specified byte offset and length.
    pub fn read_chunk(&mut self, meta: &ChunkMeta) -> Result<Bytes, VfsError> {
        self.file.seek(SeekFrom::Start(meta.offset))?;
        let mut buffer = vec![0u8; meta.length];
        self.file.read_exact(&mut buffer)?;
        Ok(Bytes::from(buffer))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_sparse_file_out_of_order_assembly() {
        let dir = tempdir().unwrap();
        let target_file = dir.path().join("assembled.bin");

        let chunk0 = b"CHUNK_ZERO____";
        let chunk1 = b"CHUNK_ONE_____";
        let chunk2 = b"CHUNK_TWO_____";

        let total_size = (chunk0.len() + chunk1.len() + chunk2.len()) as u64;
        let mut writer = SparseFileWriter::create(&target_file, total_size, 3).unwrap();

        // Write chunk 2 first, then 0, then 1 (out of order)
        writer.write_chunk(2, 28, chunk2).unwrap();
        assert!(!writer.is_complete());

        writer.write_chunk(0, 0, chunk0).unwrap();
        assert!(!writer.is_complete());

        writer.write_chunk(1, 14, chunk1).unwrap();
        assert!(writer.is_complete());

        let final_path = writer.finalize().unwrap();

        let mut content = Vec::new();
        File::open(final_path)
            .unwrap()
            .read_to_end(&mut content)
            .unwrap();

        let mut expected = Vec::new();
        expected.extend_from_slice(chunk0);
        expected.extend_from_slice(chunk1);
        expected.extend_from_slice(chunk2);

        assert_eq!(content, expected);
    }

    #[test]
    fn test_dedup_cache_analysis() {
        let mut dedup_map = ChunkDeduplicationMap::new();
        let hash_a = [0xAAu8; 32];
        let hash_b = [0xBBu8; 32];
        let hash_c = [0xCCu8; 32];

        dedup_map.index_chunk(
            hash_a,
            ChunkLocation {
                file_path: PathBuf::from("/tmp/cache.bin"),
                offset: 0,
                length: 64 * 1024,
            },
        );

        let chunks = vec![
            ChunkMeta {
                index: 0,
                offset: 0,
                length: 64 * 1024,
                hash: hash_a,
            },
            ChunkMeta {
                index: 1,
                offset: 64 * 1024,
                length: 64 * 1024,
                hash: hash_b,
            },
            ChunkMeta {
                index: 2,
                offset: 128 * 1024,
                length: 64 * 1024,
                hash: hash_c,
            },
        ];

        let dag = Blake3Dag::from_chunks("video.mp4".into(), 192 * 1024, chunks).unwrap();
        let analysis = dedup_map.analyze_manifest(&dag);

        assert_eq!(analysis.total_chunks, 3);
        assert_eq!(analysis.local_chunks, 1);
        assert_eq!(analysis.missing_chunk_indices, vec![1, 2]);
        assert_eq!(analysis.bytes_saved, 64 * 1024);
        assert!((analysis.dedup_ratio - (1.0 / 3.0)).abs() < 0.001);
    }
}
