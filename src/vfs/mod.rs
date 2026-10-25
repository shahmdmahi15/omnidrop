pub mod sparse_stream;

pub use sparse_stream::{
    ChunkDeduplicationMap, ChunkLocation, DedupAnalysis, SparseFileWriter, StreamingChunkReader,
    VfsError,
};
