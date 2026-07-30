/**
 * Crypto interfaces for Pixelroom.
 *
 * Production will plug in Signal Protocol / MLS.
 * The local session below is for unit tests and early client wiring only.
 */

export type KeyPair = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

export type IdentityBundle = {
  identityKey: KeyPair;
  signedPreKey: KeyPair;
  registrationId: number;
};

export type EncryptedPayload = {
  /** Protocol version for future migrations. */
  version: 1;
  /** Sender identity public key (raw bytes). */
  senderIdentity: Uint8Array;
  /** Opaque ciphertext including nonce/mac as implemented by the session. */
  ciphertext: Uint8Array;
};

export type MessagingSession = {
  readonly remoteIdentity: Uint8Array;
  encrypt(plaintext: Uint8Array): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload): Promise<Uint8Array>;
};

export type CryptoProvider = {
  generateIdentity(): Promise<IdentityBundle>;
  /** Establish a 1:1 session from a remote identity public key. */
  openSession(local: IdentityBundle, remoteIdentityPublicKey: Uint8Array): Promise<MessagingSession>;
};

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
