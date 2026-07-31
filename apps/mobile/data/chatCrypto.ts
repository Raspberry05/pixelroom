import type { Room } from "@pixelroom/core";
import {
  base64ToBytes,
  bytesToBase64,
  createNaclCryptoProvider,
  derivePartyRoomKey,
  secretboxDecrypt,
  secretboxEncrypt,
  utf8Decode,
  utf8Encode,
  type MessagingSession,
} from "@pixelroom/crypto";
import { demoIdentity, demoPublicKey, DEMO_USER_KEYS } from "./demoKeys";
import {
  ALICE_ID,
  BOB_ID,
  CAROL_ID,
  type DemoUserKey,
} from "./seed";
import type { ChatEnvelope, ChatLine } from "../sync/protocol";

const cryptoProvider = createNaclCryptoProvider();
const sessionCache = new Map<string, MessagingSession>();

const CHAR_TO_USER: Record<string, DemoUserKey> = {
  [String(ALICE_ID)]: "alice",
  [String(BOB_ID)]: "bob",
  [String(CAROL_ID)]: "carol",
};

function sessionCacheKey(local: DemoUserKey, remote: DemoUserKey): string {
  return `${local}->${remote}`;
}

async function dmSession(
  selfKey: DemoUserKey,
  peerKey: DemoUserKey,
): Promise<MessagingSession> {
  const key = sessionCacheKey(selfKey, peerKey);
  const cached = sessionCache.get(key);
  if (cached) return cached;
  const session = await cryptoProvider.openSession(
    demoIdentity(selfKey),
    demoPublicKey(peerKey),
  );
  sessionCache.set(key, session);
  return session;
}

export function userKeysFromRoom(room: Room): DemoUserKey[] {
  const keys: DemoUserKey[] = [];
  for (const id of room.memberIds) {
    const user = CHAR_TO_USER[String(id)];
    if (user) keys.push(user);
  }
  return keys.length > 0 ? keys : [...DEMO_USER_KEYS];
}

function peerForDm(room: Room, selfKey: DemoUserKey): DemoUserKey | null {
  const members = userKeysFromRoom(room).filter((k) => k !== selfKey);
  return members[0] ?? null;
}

function partyKeyForRoom(room: Room): Uint8Array {
  const members = userKeysFromRoom(room);
  return derivePartyRoomKey(members.map((k) => demoPublicKey(k)));
}

export async function encryptChatText(input: {
  text: string;
  room: Room;
  selfKey: DemoUserKey;
}): Promise<ChatEnvelope> {
  const { text, room, selfKey } = input;
  const plain = utf8Encode(text);
  const senderIdentity = bytesToBase64(demoPublicKey(selfKey));

  if (room.kind === "party") {
    const key = partyKeyForRoom(room);
    const ciphertext = bytesToBase64(secretboxEncrypt(plain, key));
    return {
      version: 1,
      mode: "party",
      senderKey: selfKey,
      senderIdentity,
      ciphertext,
    };
  }

  const peer = peerForDm(room, selfKey);
  if (!peer) {
    throw new Error("no DM peer to encrypt to");
  }
  const session = await dmSession(selfKey, peer);
  const payload = await session.encrypt(plain);
  return {
    version: 1,
    mode: "dm",
    senderKey: selfKey,
    senderIdentity: bytesToBase64(payload.senderIdentity),
    ciphertext: bytesToBase64(payload.ciphertext),
  };
}

export async function decryptChatLine(
  line: ChatLine,
  selfKey: DemoUserKey,
  room: Room | null,
): Promise<ChatLine> {
  if (line.kind !== "text" || !line.envelope) {
    return line;
  }
  try {
    const env = line.envelope;
    if (env.mode === "party") {
      const members = room ? userKeysFromRoom(room) : DEMO_USER_KEYS;
      const key = derivePartyRoomKey(members.map((k) => demoPublicKey(k)));
      const plain = utf8Decode(secretboxDecrypt(base64ToBytes(env.ciphertext), key));
      return { ...line, text: plain };
    }

    // DM: open session toward sender
    const sender = env.senderKey;
    if (sender === selfKey) {
      // Echo of our own message — decrypt with peer session if possible,
      // otherwise we already know plaintext from send path; try peer from room.
      const peer = room ? peerForDm(room, selfKey) : null;
      if (!peer) {
        return { ...line, text: line.text || "[encrypted]" };
      }
      const session = await dmSession(selfKey, peer);
      const plain = utf8Decode(
        await session.decrypt({
          version: 1,
          senderIdentity: base64ToBytes(env.senderIdentity),
          ciphertext: base64ToBytes(env.ciphertext),
        }),
      );
      return { ...line, text: plain };
    }

    const session = await dmSession(selfKey, sender);
    const plain = utf8Decode(
      await session.decrypt({
        version: 1,
        senderIdentity: base64ToBytes(env.senderIdentity),
        ciphertext: base64ToBytes(env.ciphertext),
      }),
    );
    return { ...line, text: plain };
  } catch {
    return { ...line, text: "[unable to decrypt]" };
  }
}

export async function decryptChatLines(
  lines: ChatLine[],
  selfKey: DemoUserKey,
  room: Room | null,
): Promise<ChatLine[]> {
  return Promise.all(lines.map((line) => decryptChatLine(line, selfKey, room)));
}
