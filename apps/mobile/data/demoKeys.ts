import {
  bytesToBase64,
  identityFromSeed,
  type IdentityBundle,
} from "@pixelroom/crypto";
import type { DemoUserKey } from "./seed";

/**
 * Deterministic demo NaCl identities so any tab can encrypt to demo users
 * without a key directory service.
 */
function seedForUser(key: DemoUserKey): Uint8Array {
  const out = new Uint8Array(32);
  const label = `pixelroom/demo/${key}/v1`;
  for (let i = 0; i < 32; i += 1) {
    const c = label.charCodeAt(i % label.length) || 0;
    out[i] = (c ^ ((i * 17 + key.length * 13) & 0xff)) & 0xff;
  }
  // Ensure non-zero seed (tweetnacl secret key).
  out[0] = out[0] || 1;
  return out;
}

const REG_IDS: Record<DemoUserKey, number> = {
  alice: 1001,
  bob: 1002,
  carol: 1003,
  dave: 1004,
};

const identityCache = new Map<DemoUserKey, IdentityBundle>();

export function demoIdentity(key: DemoUserKey): IdentityBundle {
  const cached = identityCache.get(key);
  if (cached) return cached;
  const identity = identityFromSeed(seedForUser(key), REG_IDS[key]);
  identityCache.set(key, identity);
  return identity;
}

export function demoPublicKey(key: DemoUserKey): Uint8Array {
  return demoIdentity(key).identityKey.publicKey;
}

export function demoPublicKeyBase64(key: DemoUserKey): string {
  return bytesToBase64(demoPublicKey(key));
}

export const DEMO_USER_KEYS: DemoUserKey[] = ["alice", "bob", "carol", "dave"];
