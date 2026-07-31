import nacl from "tweetnacl";
import type {
  CryptoProvider,
  EncryptedPayload,
  IdentityBundle,
  KeyPair,
  MessagingSession,
} from "./types.js";

function toKeyPair(pair: nacl.BoxKeyPair): KeyPair {
  return {
    publicKey: new Uint8Array(pair.publicKey),
    privateKey: new Uint8Array(pair.secretKey),
  };
}

/**
 * Deterministic keypair from a 32-byte seed (demo identities / tests).
 */
export function keyPairFromSeed(seed: Uint8Array): KeyPair {
  if (seed.length !== 32) {
    throw new Error("seed must be 32 bytes");
  }
  return toKeyPair(nacl.box.keyPair.fromSecretKey(seed));
}

/**
 * Demo party room key: SHA-512 of sorted public keys, truncated to 32 bytes.
 * All members with the same member pubkey set derive the same secretbox key.
 */
export function derivePartyRoomKey(publicKeys: readonly Uint8Array[]): Uint8Array {
  if (publicKeys.length === 0) {
    throw new Error("need at least one public key");
  }
  const sorted = [...publicKeys].sort((a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i += 1) {
      const d = (a[i] ?? 0) - (b[i] ?? 0);
      if (d !== 0) return d;
    }
    return a.length - b.length;
  });
  let total = 0;
  for (const k of sorted) total += k.length;
  const concat = new Uint8Array(total);
  let offset = 0;
  for (const k of sorted) {
    concat.set(k, offset);
    offset += k.length;
  }
  const digest = nacl.hash(concat);
  return digest.slice(0, 32);
}

export function secretboxEncrypt(
  plaintext: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const boxed = nacl.secretbox(plaintext, nonce, key);
  if (!boxed) throw new Error("secretbox encrypt failed");
  const out = new Uint8Array(nonce.length + boxed.length);
  out.set(nonce, 0);
  out.set(boxed, nonce.length);
  return out;
}

export function secretboxDecrypt(
  ciphertext: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const nonceLen = nacl.secretbox.nonceLength;
  if (ciphertext.length < nonceLen + nacl.secretbox.overheadLength) {
    throw new Error("ciphertext too short");
  }
  const nonce = ciphertext.slice(0, nonceLen);
  const boxed = ciphertext.slice(nonceLen);
  const plain = nacl.secretbox.open(boxed, nonce, key);
  if (!plain) throw new Error("secretbox decrypt failed");
  return plain;
}

class NaclBoxSession implements MessagingSession {
  readonly remoteIdentity: Uint8Array;
  private readonly shared: Uint8Array;
  private readonly localIdentityPublic: Uint8Array;

  constructor(local: IdentityBundle, remoteIdentity: Uint8Array) {
    this.remoteIdentity = remoteIdentity;
    this.localIdentityPublic = local.identityKey.publicKey;
    this.shared = nacl.box.before(remoteIdentity, local.identityKey.privateKey);
  }

  async encrypt(plaintext: Uint8Array): Promise<EncryptedPayload> {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const boxed = nacl.box.after(plaintext, nonce, this.shared);
    if (!boxed) throw new Error("box encrypt failed");
    const ciphertext = new Uint8Array(nonce.length + boxed.length);
    ciphertext.set(nonce, 0);
    ciphertext.set(boxed, nonce.length);
    return {
      version: 1,
      senderIdentity: this.localIdentityPublic,
      ciphertext,
    };
  }

  async decrypt(payload: EncryptedPayload): Promise<Uint8Array> {
    if (payload.version !== 1) {
      throw new Error(`unsupported crypto version: ${payload.version}`);
    }
    const nonceLen = nacl.box.nonceLength;
    if (payload.ciphertext.length < nonceLen + nacl.box.overheadLength) {
      throw new Error("ciphertext too short");
    }
    const nonce = payload.ciphertext.slice(0, nonceLen);
    const boxed = payload.ciphertext.slice(nonceLen);
    const plain = nacl.box.open.after(boxed, nonce, this.shared);
    if (!plain) throw new Error("box decrypt failed");
    return plain;
  }
}

/**
 * Production-oriented NaCl box provider (tweetnacl).
 * Swap for Signal/MLS when those land; API stays the same.
 */
export class NaclCryptoProvider implements CryptoProvider {
  async generateIdentity(): Promise<IdentityBundle> {
    const identityKey = toKeyPair(nacl.box.keyPair());
    const signedPreKey = toKeyPair(nacl.box.keyPair());
    const registrationId =
      (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) >>> 0;
    return { identityKey, signedPreKey, registrationId };
  }

  async openSession(
    local: IdentityBundle,
    remoteIdentityPublicKey: Uint8Array,
  ): Promise<MessagingSession> {
    return new NaclBoxSession(local, remoteIdentityPublicKey);
  }
}

export function createNaclCryptoProvider(): CryptoProvider {
  return new NaclCryptoProvider();
}

/** Build an IdentityBundle from a known seed (demo users). */
export function identityFromSeed(seed: Uint8Array, registrationId = 1): IdentityBundle {
  const identityKey = keyPairFromSeed(seed);
  // Deterministic signedPreKey derived from seed XOR constant (demo only).
  const preSeed = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    preSeed[i] = (seed[i] ?? 0) ^ 0xa5;
  }
  const signedPreKey = keyPairFromSeed(preSeed);
  return { identityKey, signedPreKey, registrationId };
}
