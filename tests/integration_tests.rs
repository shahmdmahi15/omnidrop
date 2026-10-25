use bytes::Bytes;
use omnidrop::chunker::{FastCdcChunker, FastCdcConfig};
use omnidrop::engine::OmniDropEngine;
use omnidrop::security::NoiseXxHandshake;
use omnidrop::transport::{
    MultiPathScheduler, PathMetrics, ReorderRingBuffer, SchedulingPolicy, TransportPacket,
};
use omnidrop::vfs::{ChunkDeduplicationMap, ChunkLocation, SparseFileWriter};
use rand::rngs::OsRng;
use std::fs::File;
use std::io::Read;
use tempfile::tempdir;
use x25519_dalek::StaticSecret;

#[test]
fn test_e2e_engine_indexing_and_verification() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("sample_5mb.bin");

    // Create a 5MB test file
    let mut data = Vec::with_capacity(5 * 1024 * 1024);
    for i in 0..(5 * 1024 * 1024) {
        data.push((i % 251) as u8);
    }
    std::fs::write(&file_path, &data).unwrap();

    let engine = OmniDropEngine::new();
    let (dag, chunks) = engine.index_file(&file_path).unwrap();

    assert_eq!(dag.total_size, 5 * 1024 * 1024);
    assert_eq!(dag.chunks.len(), chunks.len());
    assert!(!chunks.is_empty());

    // Verify all chunks against Merkle DAG proofs
    for (i, chunk) in chunks.iter().enumerate() {
        let proof = dag.generate_proof(i).unwrap();
        assert!(dag.verify_chunk(i, &chunk.data, &proof).is_ok());
    }
}

#[test]
fn test_sparse_vfs_reconstruction_from_chunks() {
    let dir = tempdir().unwrap();
    let original_path = dir.path().join("original.dat");
    let reconstructed_path = dir.path().join("reconstructed.dat");

    let test_bytes = b"OmniDrop ultra-fast distributed mesh test payload with content chunking.";
    std::fs::write(&original_path, test_bytes).unwrap();

    let chunker = FastCdcChunker::with_config(FastCdcConfig::new(8, 16, 32));
    let chunks = chunker.chunk_slice(test_bytes);

    let mut writer =
        SparseFileWriter::create(&reconstructed_path, test_bytes.len() as u64, chunks.len())
            .unwrap();

    // Write chunks in reverse order to prove out-of-order capability
    for chunk in chunks.iter().rev() {
        writer
            .write_chunk(chunk.meta.index as usize, chunk.meta.offset, &chunk.data)
            .unwrap();
    }

    assert!(writer.is_complete());
    writer.finalize().unwrap();

    let mut read_back = Vec::new();
    File::open(&reconstructed_path)
        .unwrap()
        .read_to_end(&mut read_back)
        .unwrap();

    assert_eq!(read_back, test_bytes);
}

#[test]
fn test_noise_handshake_session_data_integrity() {
    let alice_sec = StaticSecret::random_from_rng(OsRng);
    let bob_sec = StaticSecret::random_from_rng(OsRng);

    let mut alice = NoiseXxHandshake::new(alice_sec);
    let mut bob = NoiseXxHandshake::new(bob_sec);

    let msg1 = alice.initiator_msg1().unwrap();
    let msg2 = bob.responder_process_msg1_and_reply(&msg1).unwrap();
    alice.initiator_process_msg2(&msg2).unwrap();
    let (msg3, mut alice_session) = alice.initiator_msg3().unwrap();
    let mut bob_session = bob.responder_process_msg3(&msg3).unwrap();

    // Transmit multiple frames
    for i in 0..10 {
        let message = format!("Mesh packet sequence {}", i).into_bytes();
        let frame = alice_session.frame_message(&message).unwrap();
        let decrypted = bob_session.unframe_message(&frame).unwrap();
        assert_eq!(decrypted, message);
    }
}

#[test]
fn test_multipath_aggregation_and_reorder() {
    let mut scheduler = MultiPathScheduler::new(SchedulingPolicy::RoundRobin);
    scheduler.add_path(PathMetrics::new(1, "Wi-Fi 6", 1200, 2));
    scheduler.add_path(PathMetrics::new(2, "Ethernet", 1000, 1));

    let mut ring = ReorderRingBuffer::new(256);
    let mut received = Vec::new();

    // 10 packets scrambled across paths
    let indices = [3, 0, 1, 4, 2, 7, 5, 6, 9, 8];
    for &idx in &indices {
        let path = scheduler.select_path(64).unwrap();
        let pkt = TransportPacket {
            sequence_number: idx,
            chunk_index: idx,
            path_id: path,
            is_redundant: false,
            data: Bytes::from(format!("Pkt{}", idx)),
        };
        let ready = ring.push(pkt);
        received.extend(ready);
    }

    assert_eq!(received.len(), 10);
    for (expected_seq, pkt) in received.iter().enumerate() {
        assert_eq!(pkt.sequence_number, expected_seq as u64);
    }
}

#[test]
fn test_dedup_cache_hit_and_savings() {
    let mut cache = ChunkDeduplicationMap::new();
    let dummy_hash = [0x55u8; 32];
    cache.index_chunk(
        dummy_hash,
        ChunkLocation {
            file_path: "existing.bin".into(),
            offset: 0,
            length: 128 * 1024,
        },
    );

    assert_eq!(cache.total_indexed_chunks(), 1);
    assert_eq!(cache.total_indexed_bytes(), 128 * 1024);
    assert!(cache.lookup(&dummy_hash).is_some());
}

#[test]
fn test_microbenchmark_execution() {
    let engine = OmniDropEngine::new();
    let report = engine.run_benchmark(4); // 4MB fast test
    assert_eq!(report.test_size_mb, 4);
    assert!(report.chunking_throughput_gbps > 0.0);
    assert!(report.merkle_hash_throughput_gbps > 0.0);
    assert!(report.noise_crypto_throughput_gbps > 0.0);
    assert!(report.simulated_multipath_throughput_gbps >= 2.0);
}
