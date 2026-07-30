import { describe, expect, it } from "vitest";
import {
  createLocalCryptoProvider,
  utf8Decode,
  utf8Encode,
} from "./index.js";

describe("LocalCryptoProvider", () => {
  it("round-trips plaintext between two identities", async () => {
    const cryptoProvider = createLocalCryptoProvider();
    const alice = await cryptoProvider.generateIdentity();
    const bob = await cryptoProvider.generateIdentity();

    const aliceSession = await cryptoProvider.openSession(alice, bob.identityKey.publicKey);
    const bobSession = await cryptoProvider.openSession(bob, alice.identityKey.publicKey);

    const payload = await aliceSession.encrypt(utf8Encode("secret hi"));
    const plain = utf8Decode(await bobSession.decrypt(payload));
    expect(plain).toBe("secret hi");
    expect(bobSession.remoteIdentity).toEqual(alice.identityKey.publicKey);
  });
});
