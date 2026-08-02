import { describe, expect, it } from "vitest";
import {
  createNaclCryptoProvider,
  derivePartyRoomKey,
  identityFromSeed,
  secretboxDecrypt,
  secretboxEncrypt,
  utf8Decode,
  utf8Encode,
} from "./index.js";

describe("NaclCryptoProvider", () => {
  it("round-trips plaintext between two identities", async () => {
    const cryptoProvider = createNaclCryptoProvider();
    const alice = await cryptoProvider.generateIdentity();
    const bob = await cryptoProvider.generateIdentity();

    const aliceSession = await cryptoProvider.openSession(
      alice,
      bob.identityKey.publicKey,
    );
    const bobSession = await cryptoProvider.openSession(
      bob,
      alice.identityKey.publicKey,
    );

    const payload = await aliceSession.encrypt(utf8Encode("secret hi"));
    const plain = utf8Decode(await bobSession.decrypt(payload));
    expect(plain).toBe("secret hi");
    expect(bobSession.remoteIdentity).toEqual(alice.identityKey.publicKey);
  });

  it("rejects tampered ciphertext", async () => {
    const cryptoProvider = createNaclCryptoProvider();
    const alice = await cryptoProvider.generateIdentity();
    const bob = await cryptoProvider.generateIdentity();
    const aliceSession = await cryptoProvider.openSession(
      alice,
      bob.identityKey.publicKey,
    );
    const bobSession = await cryptoProvider.openSession(
      bob,
      alice.identityKey.publicKey,
    );
    const payload = await aliceSession.encrypt(utf8Encode("secret hi"));
    const last = payload.ciphertext.length - 1;
    const prev = payload.ciphertext[last];
    if (prev === undefined) throw new Error("empty ciphertext");
    payload.ciphertext[last] = prev ^ 0xff;
    await expect(bobSession.decrypt(payload)).rejects.toThrow();
  });
});

describe("party secretbox", () => {
  it("derives the same key from sorted member pubkeys", () => {
    const a = identityFromSeed(new Uint8Array(32).fill(1));
    const b = identityFromSeed(new Uint8Array(32).fill(2));
    const c = identityFromSeed(new Uint8Array(32).fill(3));
    const k1 = derivePartyRoomKey([
      a.identityKey.publicKey,
      b.identityKey.publicKey,
      c.identityKey.publicKey,
    ]);
    const k2 = derivePartyRoomKey([
      c.identityKey.publicKey,
      a.identityKey.publicKey,
      b.identityKey.publicKey,
    ]);
    expect(k1).toEqual(k2);
  });

  it("round-trips party ciphertext", () => {
    const a = identityFromSeed(new Uint8Array(32).fill(7));
    const b = identityFromSeed(new Uint8Array(32).fill(8));
    const key = derivePartyRoomKey([
      a.identityKey.publicKey,
      b.identityKey.publicKey,
    ]);
    const ct = secretboxEncrypt(utf8Encode("party hi"), key);
    expect(utf8Decode(secretboxDecrypt(ct, key))).toBe("party hi");
  });
});
