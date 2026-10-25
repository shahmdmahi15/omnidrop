//! FastCDC: Content-Defined Chunking using the Gear Hash Algorithm
//!
//! Implements the USENIX ATC '16 FastCDC paper with dynamic dual-mask cut-point
//! detection, achieving multi-gigabyte/sec chunking throughput.

use bytes::Bytes;
use serde::{Deserialize, Serialize};

/// Precomputed 64-bit Gear Hash lookup table with high entropy.
pub const GEAR_TABLE: [u64; 256] = [
    0x8a927d73be14b609,
    0xb629a43a1372cf90,
    0xb285cbe98c25dbcb,
    0xc1ff3d8e574cdd20,
    0xa61314227f5a11c1,
    0x93309a4d875c7423,
    0x8b655745e69e4f45,
    0xcd6251b1836171f2,
    0x8898b9f7cb67fcf9,
    0x95977926b010b904,
    0x1f5cfefca5c4b57d,
    0x2424fa7fb23896df,
    0x918349942a98f121,
    0x4f128c94628f4c28,
    0x76b5cf8d71221f7e,
    0x47e83463a948e65e,
    0x892a065f4104d471,
    0x8085b3cb244c45ab,
    0x6e245a4a51d9f82d,
    0xd001cc0332886f4a,
    0xb3d5aa619c9e89d1,
    0x49f658ff90466b02,
    0x5181754020a1dbbf,
    0x6972ec93566fae96,
    0x546b38c29b7a151b,
    0x650085d774ef6d96,
    0x9fb438aaec1a49ae,
    0x6a56e525a74ff518,
    0x7b587d12f6da8081,
    0xb800bc1b9dbd6e53,
    0x99a38f3cfb088574,
    0xb1d428574b6a7155,
    0xa8677f59d5718ee4,
    0x2213cc647e3a2414,
    0x655f05353d2d14cb,
    0xecb4d1b82d07e600,
    0x9c4c414d334cb944,
    0x3d027170884ef4b0,
    0x78a63118ef3c09b6,
    0xc1d5c22501cf5d85,
    0xb6cc66db89ff14ee,
    0x6e28e67a7d5be69b,
    0x8ff62cd070387556,
    0xa1cb092cf4a6f2bb,
    0x8d5c414e047f08c3,
    0xbeeecc6e91f63009,
    0x4645ae499b25fb47,
    0x4d5f0e137c54157a,
    0xb0839e56e012fe77,
    0x460cb053ab54e7c7,
    0xd88801d0a51c7750,
    0x7e8b61c169225c56,
    0x619941a87799514e,
    0x608354c4aa637505,
    0x7b3ff43cfc09f87f,
    0x2c6f131a980590a2,
    0x9e31d77aa150e7f7,
    0xebfa146d99723ecb,
    0xa4c6883bfd1266b0,
    0x7c73a4b918073b6f,
    0x8577fd1506b72a6b,
    0x1b44ecf719b2a759,
    0x05f88f01b17e4f3a,
    0x6331a61304910cf9,
    0x5358053648eb46b4,
    0x422f2fd1f45cd33a,
    0x2cbe7d0a273b50ea,
    0x2ee785ca82ff4fa6,
    0xd95781a943a4128f,
    0x9e726488a08c028c,
    0x4bb57c83f982efb1,
    0x1531e2ec3105ffc4,
    0x61dc7381ffb39fcb,
    0x8d1e670d8a571f83,
    0x1990494df3848b48,
    0x51cbeea0f9cf89a5,
    0x60011a618d3c1e28,
    0xc1074a621e84606f,
    0xb798df6c5b058729,
    0xd0ff1ec55239e24d,
    0xb655b38a7c29362f,
    0x384a8618eb79e2c6,
    0x3d02a0b12bc1209b,
    0xa6c268875ec821a7,
    0x2b4ec91444d47154,
    0xfa3a4791845bb29e,
    0xb73347963d4e8b39,
    0xb2ccf88b868e61f2,
    0xb32c86e0c704a29a,
    0x30931e5f8f55333d,
    0x56a6a9b40742f5eb,
    0x93309a4dc5bf6394,
    0x40026e6425c2763f,
    0xc5562dfd1eb3488f,
    0x323a7bbd3876e5d8,
    0x42e05cb6b29efc60,
    0x39a19c5a146059d0,
    0x4ff3e459392e07dd,
    0x6a2468bfb846f4eb,
    0x5f81255866164287,
    0x1c8b74c4e7fb676b,
    0x22c23a718b5b7f2f,
    0x57be45fc11b5e135,
    0x3785a9bc060875b1,
    0x0277df6a17b075e8,
    0x7c731518f8e5fbb4,
    0xb68e1694f4a9b23b,
    0x28972a9e334df5a9,
    0x54625e51dfcf214b,
    0xb0e87b744a72d1a3,
    0xa1cc9713efd85c88,
    0x9852f822e1189c47,
    0x712a818c35697a5b,
    0x6e2c3bb474b7c6c9,
    0xb338787f7e91d577,
    0x3f5c1c8f42fa02cb,
    0x8e82ef6b39c049b4,
    0x9a7d32c589e4726b,
    0x05f8e5e6e8d1a196,
    0x1d955fa98c362143,
    0x7f457713d3329fc5,
    0xb9ff97a549887556,
    0x38b8156db74cf15d,
    0x79401772658950c4,
    0x5a18a99b4d1b72e5,
    0xd0307963a77a94ee,
    0x7e5f32b137ff7a91,
    0x69680512c0182650,
    0x2c0f68e0d4bb92a7,
    0x925f2b84cb13d509,
    0xb4826131f41b2584,
    0x5a4cbcf530f78235,
    0x7f113a0781744158,
    0xb09e66347f985012,
    0xd882e3c04874c718,
    0x8b8e0582260ff0d4,
    0x8f0c6c74d6423548,
    0x3235b2e3ffb0c704,
    0x7460e59a45b1285d,
    0x673059275cb70d5a,
    0xd09756b19a164b38,
    0x32d32db8586c9d74,
    0xb068a86a68285516,
    0x22c2a5dc9426f584,
    0x712a02c815254d35,
    0xd6c29199859f518e,
    0x464287bc1289139f,
    0x8a927a7c5c2d9e05,
    0xa61895a285d851e3,
    0x55fa8669460d3d52,
    0x6968846c76891307,
    0x12d6a599292852a4,
    0x406256f10887df92,
    0x460c5c4e976b91c8,
    0x5a542b5cb56c80c0,
    0x2098679f187a55c2,
    0x3093282b09a7a928,
    0xa1cb3d8b76c81358,
    0xa4a0d8e20257e108,
    0xd209142cfd1e0f09,
    0x1531e28d44c8c7f9,
    0x05f88c83a74b1220,
    0x7c73a4b9175490df,
    0x95977926b010c79d,
    0x7940177265896a2f,
    0x1c8b74c4e7fb7425,
    0x8ff62cd070386241,
    0x56a6a9b40742f102,
    0x4ff3e459392e2cd3,
    0xb800bc1b9dbd6328,
    0xd88801d0a51c4a17,
    0xb73347963d4e840a,
    0x2c6f131a980587d6,
    0xd0307963a77a94cb,
    0x608354c4aa6365b2,
    0x619941a87799482b,
    0x54625e51dfcf2f3a,
    0x78a63118ef3c0f73,
    0xb1d428574b6a6bb4,
    0x8b655745e69e4f01,
    0xb3d5aa619c9e9cc2,
    0x9c4c414d334cb012,
    0x4645ae499b25f208,
    0x8d5c414e047f0174,
    0x3785a9bc06087b20,
    0x712a818c3569719d,
    0x6a2468bfb846fc45,
    0x2213cc647e3a2db5,
    0x3f5c1c8f42fa0570,
    0xb68e1694f4a9b9a6,
    0x655f05353d2d1fe2,
    0x93309a4dc5bf6dc5,
    0xd09756b19a164101,
    0x51cbeea0f9cf8271,
    0x49f658ff9046603a,
    0x7e5f32b137ff7138,
    0xd001cc0332886470,
    0x3d027170884efb9a,
    0x99a38f3cfb088b39,
    0xb6cc66db89ff1db1,
    0xa6c268875ec82f50,
    0x47e83463a948e11a,
    0x6972ec93566fa54b,
    0x8a927d73be14b2d3,
    0x61dc7381ffb39414,
    0x40026e6425c270a6,
    0x1f5cfefca5c4ba99,
    0x892a065f4104d9c7,
    0x8898b9f7cb67f10b,
    0xd95781a943a41852,
    0x7b587d12f6da8cc0,
    0x918349942a98f7be,
    0x2cbe7d0a273b5bb5,
    0x384a8618eb79e99a,
    0xb798df6c5b058c44,
    0x5a18a99b4d1b7b77,
    0x546b38c29b7a1cd1,
    0x4d5f0e137c541c60,
    0x8d1e670d8a5716c2,
    0x9e726488a08c07e1,
    0x2b4ec91444d47c43,
    0xb285cbe98c25d233,
    0x650085d774ef6454,
    0xecb4d1b82d07e127,
    0xb32c86e0c704af52,
    0x30931e5f8f553a15,
    0x323a7bbd3876ee60,
    0x7c731518f8e5f039,
    0x1990494df3848130,
    0x9fb438aaec1a403f,
    0xc1ff3d8e574cd658,
    0x6e245a4a51d9f109,
    0x8577fd1506b72384,
    0xa8677f59d5718536,
    0x22c23a718b5b7617,
    0xa1cb092cf4a6fafe,
    0x57be45fc11b5eab6,
    0x460cb053ab54ecc0,
    0x3d02a0b12bc129e6,
    0xb629a43a1372c3d5,
    0x60011a618d3c1782,
    0xb2ccf88b868e6b1d,
    0x8085b3cb244c4cd0,
    0x5181754020a1d2e9,
    0x7b3ff43cfc09f193,
    0x8b8e0582260ff72e,
    0x28972a9e334dfc4a,
    0x422f2fd1f45cda28,
    0x42e05cb6b29ef74e,
    0xc1d5c22501cf540c,
    0xb0e87b744a72d8e4,
    0x0277df6a17b07c23,
    0x6e28e67a7d5beffc,
    0x7e8b61c169225574,
    0x1b44ecf719b2a1a1,
    0x6331a61304910543,
];

/// Configuration parameters for FastCDC chunking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct FastCdcConfig {
    /// Minimum chunk size in bytes (default: 16 KB)
    pub min_size: usize,
    /// Target (average) chunk size in bytes (default: 64 KB)
    pub avg_size: usize,
    /// Maximum chunk size in bytes (default: 256 KB)
    pub max_size: usize,
    /// Dual-mask S (small region between min_size and avg_size)
    pub mask_s: u64,
    /// Dual-mask L (large region between avg_size and max_size)
    pub mask_l: u64,
}

impl Default for FastCdcConfig {
    fn default() -> Self {
        Self::new(16 * 1024, 64 * 1024, 256 * 1024)
    }
}

impl FastCdcConfig {
    /// Create a new FastCDC configuration with target boundaries.
    ///
    /// Bitmasks are automatically derived based on target average size.
    pub fn new(min_size: usize, avg_size: usize, max_size: usize) -> Self {
        assert!(min_size > 0, "min_size must be > 0");
        assert!(min_size <= avg_size, "min_size must be <= avg_size");
        assert!(avg_size <= max_size, "avg_size must be <= max_size");

        let bits = (avg_size as f64).log2().round() as u32;
        // Dynamic dual-mask derivation:
        // MaskS is slightly more restrictive (e.g. bits + 1 or bits - 1)
        // Following FastCDC USENIX ATC '16:
        // Normalization: In [min, avg), use mask with bits+1 zeros to make cut less likely
        // In [avg, max), use mask with bits-1 zeros to make cut more likely
        let mask_s = (1u64 << (bits + 1)) - 1;
        let mask_l = (1u64 << (bits - 1)) - 1;

        Self {
            min_size,
            avg_size,
            max_size,
            mask_s,
            mask_l,
        }
    }
}

/// Metadata and digest information for an individual content-defined chunk.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChunkMeta {
    /// Sequential index of the chunk within the source stream
    pub index: u64,
    /// Starting byte offset within the source stream
    pub offset: u64,
    /// Length of the chunk in bytes
    pub length: usize,
    /// BLAKE3 256-bit cryptographic digest
    pub hash: [u8; 32],
}

/// A fully materialized chunk with payload and metadata.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Chunk {
    pub meta: ChunkMeta,
    pub data: Bytes,
}

/// Production FastCDC Chunker.
#[derive(Debug, Clone)]
pub struct FastCdcChunker {
    config: FastCdcConfig,
}

impl FastCdcChunker {
    /// Initialize with default configuration (16KB min, 64KB target, 256KB max).
    pub fn new() -> Self {
        Self {
            config: FastCdcConfig::default(),
        }
    }

    /// Initialize with custom configuration.
    pub fn with_config(config: FastCdcConfig) -> Self {
        Self { config }
    }

    /// Return the active chunker configuration.
    pub fn config(&self) -> &FastCdcConfig {
        &self.config
    }

    /// Finds the next cut-point in the buffer starting at position 0.
    ///
    /// Returns the length of the next chunk in bytes.
    #[inline]
    pub fn cut_point(&self, buffer: &[u8]) -> usize {
        let len = buffer.len();
        if len <= self.config.min_size {
            return len;
        }

        let mut fp: u64 = 0;
        let scan_limit = len.min(self.config.max_size);
        let min_s = self.config.min_size;
        let avg_s = self.config.avg_size.min(scan_limit);

        // Phase 1: [min_size, avg_size) using mask_s
        let mut i = min_s;
        while i < avg_s {
            let byte = buffer[i];
            fp = (fp << 1).wrapping_add(GEAR_TABLE[byte as usize]);
            if (fp & self.config.mask_s) == 0 {
                return i + 1;
            }
            i += 1;
        }

        // Phase 2: [avg_size, max_size) using mask_l
        while i < scan_limit {
            let byte = buffer[i];
            fp = (fp << 1).wrapping_add(GEAR_TABLE[byte as usize]);
            if (fp & self.config.mask_l) == 0 {
                return i + 1;
            }
            i += 1;
        }

        // Phase 3: Exceeded max_size or buffer ended
        scan_limit
    }

    /// Chunk an entire in-memory byte slice into a vector of materialized `Chunk`s.
    pub fn chunk_slice(&self, data: &[u8]) -> Vec<Chunk> {
        let mut chunks = Vec::new();
        let mut cursor = 0;
        let mut index = 0u64;

        while cursor < data.len() {
            let remaining = &data[cursor..];
            let chunk_len = self.cut_point(remaining);
            let chunk_data = Bytes::copy_from_slice(&remaining[..chunk_len]);
            let hash = *blake3::hash(&chunk_data).as_bytes();

            chunks.push(Chunk {
                meta: ChunkMeta {
                    index,
                    offset: cursor as u64,
                    length: chunk_len,
                    hash,
                },
                data: chunk_data,
            });

            cursor += chunk_len;
            index += 1;
        }

        chunks
    }

    /// Fast metadata-only scan of data without copying chunk buffers.
    pub fn scan_meta(&self, data: &[u8]) -> Vec<ChunkMeta> {
        let mut metas = Vec::new();
        let mut cursor = 0;
        let mut index = 0u64;

        while cursor < data.len() {
            let remaining = &data[cursor..];
            let chunk_len = self.cut_point(remaining);
            let chunk_slice = &remaining[..chunk_len];
            let hash = *blake3::hash(chunk_slice).as_bytes();

            metas.push(ChunkMeta {
                index,
                offset: cursor as u64,
                length: chunk_len,
                hash,
            });

            cursor += chunk_len;
            index += 1;
        }

        metas
    }
}

impl Default for FastCdcChunker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generate_lcg(size: usize, mut seed: u64) -> Vec<u8> {
        let mut data = Vec::with_capacity(size);
        for _ in 0..size {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
            data.push((seed >> 33) as u8);
        }
        data
    }

    #[test]
    fn test_chunk_boundaries() {
        let chunker = FastCdcChunker::new();
        let test_data = generate_lcg(1024 * 1024, 12345);

        let chunks = chunker.chunk_slice(&test_data);
        assert!(!chunks.is_empty());

        let mut total_len = 0;
        for (i, chunk) in chunks.iter().enumerate() {
            assert_eq!(chunk.meta.index, i as u64);
            assert_eq!(chunk.meta.offset, total_len as u64);
            assert_eq!(chunk.meta.length, chunk.data.len());
            // Verify BLAKE3 hash
            let computed = *blake3::hash(&chunk.data).as_bytes();
            assert_eq!(chunk.meta.hash, computed);

            if i < chunks.len() - 1 {
                assert!(chunk.meta.length >= chunker.config().min_size);
                assert!(chunk.meta.length <= chunker.config().max_size);
            }
            total_len += chunk.meta.length;
        }
        assert_eq!(total_len, test_data.len());
    }

    #[test]
    fn test_deduplication_stability() {
        let chunker = FastCdcChunker::new();
        let block_a = generate_lcg(250 * 1024, 42);
        let block_b = generate_lcg(300 * 1024, 99);

        let mut data1 = Vec::new();
        data1.extend_from_slice(&block_a);
        data1.extend_from_slice(&block_b);

        let mut data2 = Vec::new();
        // Insert 10 bytes at the very beginning (simulating a shifted insertion)
        data2.extend_from_slice(b"INSERTION_");
        data2.extend_from_slice(&block_a);
        data2.extend_from_slice(&block_b);

        let chunks1 = chunker.chunk_slice(&data1);
        let chunks2 = chunker.chunk_slice(&data2);

        // Content-defined chunking should rediscover identical boundaries in block_b
        let hashes1: Vec<_> = chunks1.iter().map(|c| c.meta.hash).collect();
        let hashes2: Vec<_> = chunks2.iter().map(|c| c.meta.hash).collect();

        let shared_hashes = hashes1.iter().filter(|h| hashes2.contains(h)).count();
        assert!(
            shared_hashes > 0,
            "FastCDC must detect shifted duplicate chunks"
        );
    }
}
