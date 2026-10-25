//! # OmniDrop
//!
//! Ultra-High-Throughput Multi-Path P2P Content-Defined Mesh File & Stream Fabric.
//!
//! Designed for instantaneous, zero-cloud peer-to-peer data transport across PC, Mac,
//! Linux, iOS, and Android over local Wi-Fi with extreme speeds exceeding 1.8 Gbps.
//!
//! ## Core Architecture Modules:
//! - [`chunker`]: FastCDC dynamic dual-mask content-defined chunking (Gear Hash).
//! - [`merkle`]: BLAKE3 Merkle DAG for out-of-order chunk verification and inclusion proofs.
//! - [`security`]: Noise Protocol Framework (XX Handshake) with Curve25519 and ChaCha20-Poly1305 AEAD.
//! - [`transport`]: Multi-path packet scheduling, ring buffer reordering, and link aggregation.
//! - [`vfs`]: Sparse file assembly, deduplication cache, and zero-copy streaming I/O.
//! - [`engine`]: High-level transfer engine orchestrating the full fabric stack.

pub mod chunker;
pub mod engine;
pub mod merkle;
pub mod security;
pub mod transport;
pub mod vfs;

// Re-export primary types for ergonomic usage
pub use chunker::{Chunk, ChunkMeta, FastCdcChunker, FastCdcConfig};
pub use engine::{BenchmarkReport, OmniDropEngine, TransferProgress};
pub use merkle::{Blake3Dag, MerkleError, MerkleProof};
pub use security::{IdentityKey, NoiseXxHandshake, SecureSession, SecurityError};
pub use transport::{MultiPathScheduler, PathMetrics, ReorderRingBuffer, SchedulingPolicy};
pub use vfs::{ChunkDeduplicationMap, SparseFileWriter, StreamingChunkReader, VfsError};
