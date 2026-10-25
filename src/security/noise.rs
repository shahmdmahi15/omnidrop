//! Noise Protocol Framework XX Handshake & ChaCha20-Poly1305 AEAD Framing.
//!
//! Implements Noise_XX_25519_ChaChaPoly_BLAKE3:
//! -> e
//! <- e, ee, s, es
//! -> s, se
//!
//! Provides mutual authentication, perfect forward secrecy (PFS),
//! and zero-knowledge identity protection across peer-to-peer mesh connections.

use chacha20poly1305::{
    aead::{Aead, KeyInit},
    ChaCha20Poly1305, Key, Nonce,
};
use rand::rngs::OsRng;
use thiserror::Error;
use x25519_dalek::{PublicKey as X25519PublicKey, StaticSecret as X25519Secret};

#[derive(Error, Debug)]
pub enum SecurityError {
    #[error("Handshake state machine error: unexpected message or step {0}")]
    InvalidHandshakeStep(String),
    #[error("Cryptographic authentication failed (AEAD tag mismatch)")]
    DecryptionFailed,
    #[error("Buffer too short or malformed frame: required {expected}, got {actual}")]
    MalformedFrame { expected: usize, actual: usize },
    #[error("Nonce overflow: cipher state reached maximum safe packet count")]
    NonceOverflow,
}

/// A 32-byte public identity key for peer recognition.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct IdentityKey(pub [u8; 32]);

impl IdentityKey {
    pub fn hex(&self) -> String {
        hex::encode(self.0)
    }
}

/// Cryptographic cipher state with ChaCha20-Poly1305 and sequential nonce tracking.
#[derive(Clone)]
pub struct CipherState {
    cipher: ChaCha20Poly1305,
    nonce: u64,
}

impl CipherState {
    pub fn new(key_bytes: &[u8; 32]) -> Self {
        let key = Key::from_slice(key_bytes);
        Self {
            cipher: ChaCha20Poly1305::new(key),
            nonce: 0,
        }
    }

    /// Construct a 12-byte ChaCha20-Poly1305 nonce from a 64-bit counter (little-endian padded).
    fn current_nonce(&self) -> Result<Nonce, SecurityError> {
        if self.nonce == u64::MAX {
            return Err(SecurityError::NonceOverflow);
        }
        let mut nonce_bytes = [0u8; 12];
        nonce_bytes[4..12].copy_from_slice(&self.nonce.to_le_bytes());
        Ok(*Nonce::from_slice(&nonce_bytes))
    }

    /// Encrypt plaintext with authentication tag, automatically advancing the nonce.
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, SecurityError> {
        let nonce = self.current_nonce()?;
        self.nonce += 1;
        self.cipher
            .encrypt(&nonce, plaintext)
            .map_err(|_| SecurityError::DecryptionFailed)
    }

    /// Decrypt ciphertext and verify authentication tag, automatically advancing the nonce.
    pub fn decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, SecurityError> {
        let nonce = self.current_nonce()?;
        self.nonce += 1;
        self.cipher
            .decrypt(&nonce, ciphertext)
            .map_err(|_| SecurityError::DecryptionFailed)
    }

    pub fn nonce(&self) -> u64 {
        self.nonce
    }
}

/// Symmetric state maintaining chained BLAKE3 hash digests and cipher keys during the handshake.
pub struct SymmetricState {
    h: [u8; 32],
    ck: [u8; 32],
    cipher: Option<CipherState>,
}

impl SymmetricState {
    pub fn new(protocol_name: &[u8]) -> Self {
        let h = *blake3::hash(protocol_name).as_bytes();
        let ck = h;
        Self {
            h,
            ck,
            cipher: None,
        }
    }

    pub fn mix_hash(&mut self, data: &[u8]) {
        let mut hasher = blake3::Hasher::new();
        hasher.update(&self.h);
        hasher.update(data);
        self.h = *hasher.finalize().as_bytes();
    }

    pub fn mix_key(&mut self, input_key_material: &[u8; 32]) {
        // Derive new ck and cipher key using BLAKE3 keyed hashing
        let mut hasher1 = blake3::Hasher::new_keyed(&self.ck);
        hasher1.update(input_key_material);
        hasher1.update(b"chaining_key");
        self.ck = *hasher1.finalize().as_bytes();

        let mut hasher2 = blake3::Hasher::new_keyed(&self.ck);
        hasher2.update(input_key_material);
        hasher2.update(b"cipher_key");
        let k = *hasher2.finalize().as_bytes();

        self.cipher = Some(CipherState::new(&k));
    }

    pub fn encrypt_and_hash(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, SecurityError> {
        if let Some(ref mut cipher) = self.cipher {
            let ciphertext = cipher.encrypt(plaintext)?;
            self.mix_hash(&ciphertext);
            Ok(ciphertext)
        } else {
            self.mix_hash(plaintext);
            Ok(plaintext.to_vec())
        }
    }

    pub fn decrypt_and_hash(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, SecurityError> {
        if let Some(ref mut cipher) = self.cipher {
            let plaintext = cipher.decrypt(ciphertext)?;
            self.mix_hash(ciphertext);
            Ok(plaintext)
        } else {
            self.mix_hash(ciphertext);
            Ok(ciphertext.to_vec())
        }
    }

    /// Split symmetric state into send and receive transport ciphers.
    pub fn split(&self) -> (CipherState, CipherState) {
        let mut h1 = blake3::Hasher::new_keyed(&self.ck);
        h1.update(b"initiator_transport_key");
        let k1 = *h1.finalize().as_bytes();

        let mut h2 = blake3::Hasher::new_keyed(&self.ck);
        h2.update(b"responder_transport_key");
        let k2 = *h2.finalize().as_bytes();

        (CipherState::new(&k1), CipherState::new(&k2))
    }
}

/// Transport session with separated full-duplex secure channels.
pub struct SecureSession {
    pub send_cipher: CipherState,
    pub recv_cipher: CipherState,
    pub remote_static_key: IdentityKey,
}

impl SecureSession {
    /// Encrypt and frame an outgoing message payload (4-byte length prefix + ciphertext + tag).
    pub fn frame_message(&mut self, payload: &[u8]) -> Result<Vec<u8>, SecurityError> {
        let ciphertext = self.send_cipher.encrypt(payload)?;
        let len = (ciphertext.len() as u32).to_be_bytes();
        let mut framed = Vec::with_capacity(4 + ciphertext.len());
        framed.extend_from_slice(&len);
        framed.extend_from_slice(&ciphertext);
        Ok(framed)
    }

    /// Decrypt a received framed payload.
    pub fn unframe_message(&mut self, framed: &[u8]) -> Result<Vec<u8>, SecurityError> {
        if framed.len() < 4 {
            return Err(SecurityError::MalformedFrame {
                expected: 4,
                actual: framed.len(),
            });
        }
        let len = u32::from_be_bytes([framed[0], framed[1], framed[2], framed[3]]) as usize;
        if framed.len() < 4 + len {
            return Err(SecurityError::MalformedFrame {
                expected: 4 + len,
                actual: framed.len(),
            });
        }
        self.recv_cipher.decrypt(&framed[4..4 + len])
    }
}

/// Noise XX Handshake State Machine for Initiator and Responder.
pub struct NoiseXxHandshake {
    static_secret: X25519Secret,
    static_public: X25519PublicKey,
    ephemeral_secret: Option<X25519Secret>,
    ephemeral_public: Option<X25519PublicKey>,
    remote_ephemeral: Option<X25519PublicKey>,
    remote_static: Option<X25519PublicKey>,
    state: SymmetricState,
    step: u8,
}

impl NoiseXxHandshake {
    pub const PROTOCOL_NAME: &'static [u8] = b"Noise_XX_25519_ChaChaPoly_BLAKE3";

    /// Initialize a new handshake actor with a long-term static identity key.
    pub fn new(static_secret: X25519Secret) -> Self {
        let static_public = X25519PublicKey::from(&static_secret);
        let state = SymmetricState::new(Self::PROTOCOL_NAME);
        Self {
            static_secret,
            static_public,
            ephemeral_secret: None,
            ephemeral_public: None,
            remote_ephemeral: None,
            remote_static: None,
            state,
            step: 0,
        }
    }

    pub fn static_identity(&self) -> IdentityKey {
        IdentityKey(*self.static_public.as_bytes())
    }

    // -------------------------------------------------------------
    // Initiator Path
    // -------------------------------------------------------------

    /// Step 1 (Initiator -> Responder): Generate ephemeral key `e` and send public key.
    pub fn initiator_msg1(&mut self) -> Result<Vec<u8>, SecurityError> {
        if self.step != 0 {
            return Err(SecurityError::InvalidHandshakeStep(
                "initiator_msg1 requires step 0".into(),
            ));
        }
        let eph_secret = X25519Secret::random_from_rng(OsRng);
        let eph_public = X25519PublicKey::from(&eph_secret);

        self.state.mix_hash(eph_public.as_bytes());
        self.ephemeral_secret = Some(eph_secret);
        self.ephemeral_public = Some(eph_public);
        self.step = 1;

        Ok(eph_public.as_bytes().to_vec())
    }

    /// Step 3 (Initiator receives msg2 from Responder):
    /// Expects `e, ee, s, es`
    pub fn initiator_process_msg2(&mut self, msg2: &[u8]) -> Result<(), SecurityError> {
        if self.step != 1 {
            return Err(SecurityError::InvalidHandshakeStep(
                "initiator_process_msg2 requires step 1".into(),
            ));
        }
        if msg2.len() < 32 + 48 {
            // 32 bytes ephemeral + 48 bytes (32 static encrypted + 16 poly tag)
            return Err(SecurityError::MalformedFrame {
                expected: 80,
                actual: msg2.len(),
            });
        }

        // 1. Read Responder's ephemeral public key
        let mut re_bytes = [0u8; 32];
        re_bytes.copy_from_slice(&msg2[0..32]);
        let re_pub = X25519PublicKey::from(re_bytes);
        self.state.mix_hash(re_pub.as_bytes());
        self.remote_ephemeral = Some(re_pub);

        // 2. Perform DH(e, re)
        let eph_secret = self.ephemeral_secret.as_ref().unwrap();
        let ee = eph_secret.diffie_hellman(&re_pub);
        self.state.mix_key(ee.as_bytes());

        // 3. Decrypt remote static public key
        let s_enc = &msg2[32..32 + 48];
        let s_plain = self.state.decrypt_and_hash(s_enc)?;
        let mut rs_bytes = [0u8; 32];
        rs_bytes.copy_from_slice(&s_plain[0..32]);
        let rs_pub = X25519PublicKey::from(rs_bytes);
        self.remote_static = Some(rs_pub);

        // 4. Perform DH(e, rs)
        let es = eph_secret.diffie_hellman(&rs_pub);
        self.state.mix_key(es.as_bytes());

        // 5. Decrypt optional trailing payload
        if msg2.len() > 80 {
            let payload_enc = &msg2[80..];
            let _ = self.state.decrypt_and_hash(payload_enc)?;
        }

        self.step = 2;
        Ok(())
    }

    /// Step 4 (Initiator sends msg3 to Responder):
    /// Produces `s, se`
    pub fn initiator_msg3(&mut self) -> Result<(Vec<u8>, SecureSession), SecurityError> {
        if self.step != 2 {
            return Err(SecurityError::InvalidHandshakeStep(
                "initiator_msg3 requires step 2".into(),
            ));
        }

        // 1. Encrypt and send Initiator static key
        let s_enc = self.state.encrypt_and_hash(self.static_public.as_bytes())?;

        // 2. Perform DH(s, re)
        let re_pub = self.remote_ephemeral.as_ref().unwrap();
        let se = self.static_secret.diffie_hellman(re_pub);
        self.state.mix_key(se.as_bytes());

        // 3. Encrypt empty payload for completion tag
        let payload_enc = self.state.encrypt_and_hash(b"OMNIDROP_OK")?;

        let mut msg3 = Vec::with_capacity(s_enc.len() + payload_enc.len());
        msg3.extend_from_slice(&s_enc);
        msg3.extend_from_slice(&payload_enc);

        // Split into final transport session
        let (send_cipher, recv_cipher) = self.state.split();
        let session = SecureSession {
            send_cipher,
            recv_cipher,
            remote_static_key: IdentityKey(*self.remote_static.as_ref().unwrap().as_bytes()),
        };

        self.step = 3;
        Ok((msg3, session))
    }

    // -------------------------------------------------------------
    // Responder Path
    // -------------------------------------------------------------

    /// Step 2 (Responder processes msg1 from Initiator and generates msg2):
    pub fn responder_process_msg1_and_reply(
        &mut self,
        msg1: &[u8],
    ) -> Result<Vec<u8>, SecurityError> {
        if self.step != 0 {
            return Err(SecurityError::InvalidHandshakeStep(
                "responder requires step 0".into(),
            ));
        }
        if msg1.len() < 32 {
            return Err(SecurityError::MalformedFrame {
                expected: 32,
                actual: msg1.len(),
            });
        }

        // 1. Read Initiator's ephemeral public key
        let mut ie_bytes = [0u8; 32];
        ie_bytes.copy_from_slice(&msg1[0..32]);
        let ie_pub = X25519PublicKey::from(ie_bytes);
        self.state.mix_hash(ie_pub.as_bytes());
        self.remote_ephemeral = Some(ie_pub);

        // 2. Generate Responder ephemeral key `e`
        let re_secret = X25519Secret::random_from_rng(OsRng);
        let re_public = X25519PublicKey::from(&re_secret);
        self.state.mix_hash(re_public.as_bytes());

        // 3. DH(re, ie)
        let ee = re_secret.diffie_hellman(&ie_pub);
        self.state.mix_key(ee.as_bytes());

        // 4. Encrypt Responder static key
        let s_enc = self.state.encrypt_and_hash(self.static_public.as_bytes())?;

        // 5. DH(rs, ie)
        let es = self.static_secret.diffie_hellman(&ie_pub);
        self.state.mix_key(es.as_bytes());

        // 6. Encrypt handshake confirmation payload
        let payload_enc = self.state.encrypt_and_hash(b"OMNIDROP_ACK")?;

        let mut msg2 = Vec::with_capacity(32 + s_enc.len() + payload_enc.len());
        msg2.extend_from_slice(re_public.as_bytes());
        msg2.extend_from_slice(&s_enc);
        msg2.extend_from_slice(&payload_enc);

        self.ephemeral_secret = Some(re_secret);
        self.ephemeral_public = Some(re_public);
        self.step = 1;

        Ok(msg2)
    }

    /// Step 5 (Responder processes msg3 from Initiator and establishes session):
    pub fn responder_process_msg3(&mut self, msg3: &[u8]) -> Result<SecureSession, SecurityError> {
        if self.step != 1 {
            return Err(SecurityError::InvalidHandshakeStep(
                "responder_process_msg3 requires step 1".into(),
            ));
        }
        if msg3.len() < 48 {
            return Err(SecurityError::MalformedFrame {
                expected: 48,
                actual: msg3.len(),
            });
        }

        // 1. Decrypt Initiator static key
        let s_enc = &msg3[0..48];
        let s_plain = self.state.decrypt_and_hash(s_enc)?;
        let mut is_bytes = [0u8; 32];
        is_bytes.copy_from_slice(&s_plain[0..32]);
        let is_pub = X25519PublicKey::from(is_bytes);
        self.remote_static = Some(is_pub);

        // 2. DH(re, is)
        let re_secret = self.ephemeral_secret.as_ref().unwrap();
        let se = re_secret.diffie_hellman(&is_pub);
        self.state.mix_key(se.as_bytes());

        // 3. Decrypt confirmation payload
        if msg3.len() > 48 {
            let payload_enc = &msg3[48..];
            let _ = self.state.decrypt_and_hash(payload_enc)?;
        }

        // Split into final transport session (reverse send/recv compared to initiator)
        let (send_cipher, recv_cipher) = self.state.split();
        let session = SecureSession {
            send_cipher: recv_cipher, // Responder sends with k2
            recv_cipher: send_cipher, // Responder receives with k1
            remote_static_key: IdentityKey(*self.remote_static.as_ref().unwrap().as_bytes()),
        };

        self.step = 2;
        Ok(session)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_noise_xx_full_handshake_and_transport() {
        let alice_static = X25519Secret::random_from_rng(OsRng);
        let bob_static = X25519Secret::random_from_rng(OsRng);

        let alice_identity = IdentityKey(*X25519PublicKey::from(&alice_static).as_bytes());
        let bob_identity = IdentityKey(*X25519PublicKey::from(&bob_static).as_bytes());

        let mut alice = NoiseXxHandshake::new(alice_static);
        let mut bob = NoiseXxHandshake::new(bob_static);

        // Message 1: Alice -> Bob
        let msg1 = alice.initiator_msg1().unwrap();
        assert_eq!(msg1.len(), 32);

        // Message 2: Bob processes msg1 and replies
        let msg2 = bob.responder_process_msg1_and_reply(&msg1).unwrap();

        // Message 3: Alice processes msg2 and completes
        alice.initiator_process_msg2(&msg2).unwrap();
        let (msg3, mut alice_session) = alice.initiator_msg3().unwrap();

        // Bob completes with msg3
        let mut bob_session = bob.responder_process_msg3(&msg3).unwrap();

        // Verify mutual authentication of identity keys
        assert_eq!(alice_session.remote_static_key, bob_identity);
        assert_eq!(bob_session.remote_static_key, alice_identity);

        // Secure bidirectional transport framing test
        let alice_data = b"Hello from Alice over high-speed mesh!";
        let framed_from_alice = alice_session.frame_message(alice_data).unwrap();

        let bob_received = bob_session.unframe_message(&framed_from_alice).unwrap();
        assert_eq!(bob_received, alice_data);

        let bob_data = b"Acknowledged by Bob over multi-path aggregation.";
        let framed_from_bob = bob_session.frame_message(bob_data).unwrap();

        let alice_received = alice_session.unframe_message(&framed_from_bob).unwrap();
        assert_eq!(alice_received, bob_data);
    }
}
