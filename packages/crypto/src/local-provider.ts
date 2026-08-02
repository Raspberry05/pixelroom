import type {
  CryptoProvider,
  EncryptedPayload,
  IdentityBundle,
  KeyPair,
  MessagingSession,
} from "./types.js";

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

function generateKeyPair(): KeyPair {
  return {
    publicKey: randomBytes(32),
    privateKey: randomBytes(32),
  };
}

/**
 * XOR-based local cipher for development/tests ONLY.
 * Not secure against real adversaries — swap for Signal/MLS before launch.
 */
function xorWithKey(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    const dataByte = data[i] ?? 0;
    const keyByte = key[i % key.length] ?? 0;
    out[i] = dataByte ^ keyByte;
  }
  return out;
}

/** Commutative demo key from both public keys — NOT a real DH. */
function deriveSessionKey(localPublic: Uint8Array, remotePublic: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    const a = localPublic[i % localPublic.length] ?? 0;
    const b = remotePublic[i % remotePublic.length] ?? 0;
    out[i] = (a ^ b ^ ((i * 17) & 0xff)) & 0xff;
  }
  return out;
}

class LocalSession implements MessagingSession {
  readonly remoteIdentity: Uint8Array;
  private readonly key: Uint8Array;
  private readonly localIdentityPublic: Uint8Array;

  constructor(local: IdentityBundle, remoteIdentity: Uint8Array) {
    this.remoteIdentity = remoteIdentity;
    this.localIdentityPublic = local.identityKey.publicKey;
    this.key = deriveSessionKey(local.identityKey.publicKey, remoteIdentity);
  }

  async encrypt(plaintext: Uint8Array): Promise<EncryptedPayload> {
    const nonce = randomBytes(12);
    const body = xorWithKey(plaintext, this.key);
    const ciphertext = new Uint8Array(nonce.length + body.length);
    ciphertext.set(nonce, 0);
    ciphertext.set(body, nonce.length);
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
    if (payload.ciphertext.length < 12) {
      throw new Error("ciphertext too short");
    }
    const body = payload.ciphertext.slice(12);
    return xorWithKey(body, this.key);
  }
}

/**
 * XOR-based local cipher for development/tests ONLY.
 * Not secure against real adversaries — use NaclCryptoProvider for real E2EE.
 */
export class InsecureLocalCryptoProvider implements CryptoProvider {
  async generateIdentity(): Promise<IdentityBundle> {
    return {
      identityKey: generateKeyPair(),
      signedPreKey: generateKeyPair(),
      registrationId: crypto.getRandomValues(new Uint32Array(1))[0] ?? 1,
    };
  }

  async openSession(
    local: IdentityBundle,
    remoteIdentityPublicKey: Uint8Array,
  ): Promise<MessagingSession> {
    return new LocalSession(local, remoteIdentityPublicKey);
  }
}

/** @deprecated Prefer NaclCryptoProvider / createNaclCryptoProvider. */
export class LocalCryptoProvider extends InsecureLocalCryptoProvider {}

export function createLocalCryptoProvider(): CryptoProvider {
  return new InsecureLocalCryptoProvider();
}

export function createInsecureLocalCryptoProvider(): CryptoProvider {
  return new InsecureLocalCryptoProvider();
}
