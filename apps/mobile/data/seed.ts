import {
  asAccountId,
  asCharacterId,
  asRoomId,
  DEFAULT_HOTSPOTS,
  type Appearance,
  type Character,
  type Room,
  type RoomId,
  type RoomStyleId,
} from "@pixelroom/core";
import { TEST_LAB_ROOM_ID } from "./testLab";

export type DemoUserKey = "alice" | "bob" | "carol" | "dave";

export type Contact = {
  userKey: DemoUserKey | string;
  characterId: string;
  displayName: string;
  username: string;
  phone: string;
  country: string;
};

export type ConversationPreview = {
  roomId: RoomId;
  kind: "dm" | "party";
  title: string;
  peerUserKey?: DemoUserKey;
  /** Member keys shown in hallway avatar (peer for DM; others for party). */
  memberKeys: DemoUserKey[];
  preview: string;
  updatedAt: number;
  /** Local-only room skin for DMs (does not sync to peer). */
  personalStyleId?: RoomStyleId;
};

export type StoreItem = {
  id: string;
  kind: "outfit" | "room";
  name: string;
  price: number;
  unlocked: boolean;
};

export type DemoUser = {
  key: DemoUserKey;
  character: Character;
  username: string;
  phone: string;
  country: string;
};

const NOW = 1_700_000_000_000;

export const ALICE_ID = asCharacterId("char_alice");
export const BOB_ID = asCharacterId("char_bob");
export const CAROL_ID = asCharacterId("char_carol");
export const DAVE_ID = asCharacterId("char_dave");
export const PARTY_ROOM_ID = asRoomId("party:alice:bob:carol:dave");
/** Smaller party — Alice, Bob & Carol only. */
export const TRIO_ROOM_ID = asRoomId("party:alice:bob:carol");
export { TEST_LAB_ROOM_ID };

/** All demo members (Pixel crew / Test Lab). */
export const ALL_DEMO_KEYS: DemoUserKey[] = ["alice", "bob", "carol", "dave"];
export const TRIO_KEYS: DemoUserKey[] = ["alice", "bob", "carol"];

/** Canonical DM id for a pair (order-independent). */
export function dmRoomIdFor(a: DemoUserKey, b: DemoUserKey): RoomId {
  const [x, y] = [a, b].sort();
  return asRoomId(`dm:${x}:${y}`);
}

/** Canonical party id from member set (order-independent). */
export function partyRoomIdFor(members: DemoUserKey[]): RoomId {
  const unique = Array.from(new Set(members)).sort();
  return asRoomId(`party:${unique.join(":")}`);
}

/** Alice↔Bob seed DM (legacy alias). */
export const DM_ROOM_ID = dmRoomIdFor("alice", "bob");
export const DM_ALICE_CAROL_ID = dmRoomIdFor("alice", "carol");
export const DM_BOB_CAROL_ID = dmRoomIdFor("bob", "carol");

export function isDemoUserKey(value: string): value is DemoUserKey {
  return (
    value === "alice" ||
    value === "bob" ||
    value === "carol" ||
    value === "dave"
  );
}

/** Parse `dm:alice:bob` / `party:alice:bob:carol:dave` member lists. */
export function parseRoomMemberKeys(roomId: string): DemoUserKey[] | null {
  if (roomId === String(TEST_LAB_ROOM_ID)) {
    return [...ALL_DEMO_KEYS];
  }
  const dm = /^dm:([a-z]+):([a-z]+)$/.exec(roomId);
  if (dm) {
    const a = dm[1]!;
    const b = dm[2]!;
    if (isDemoUserKey(a) && isDemoUserKey(b) && a !== b) {
      return [a, b].sort() as DemoUserKey[];
    }
    return null;
  }
  const party = /^party:((?:[a-z]+:)*[a-z]+)$/.exec(roomId);
  if (party) {
    const parts = party[1]!.split(":");
    if (parts.length >= 2 && parts.every(isDemoUserKey)) {
      return Array.from(new Set(parts as DemoUserKey[])).sort() as DemoUserKey[];
    }
  }
  return null;
}

export function userIsRoomMember(
  roomId: string,
  userKey: DemoUserKey,
  memberKeys?: DemoUserKey[],
): boolean {
  if (memberKeys?.includes(userKey)) return true;
  const parsed = parseRoomMemberKeys(roomId);
  if (parsed) return parsed.includes(userKey);
  return false;
}

export const DEMO_USERS: Record<DemoUserKey, DemoUser> = {
  alice: {
    key: "alice",
    username: "alice",
    phone: "+1 555 0101",
    country: "US",
    character: {
      id: ALICE_ID,
      accountId: asAccountId("acct_alice"),
      displayName: "Alice",
      appearance: {
        kit: "cozy",
        sheetId: "50",
        hair: "brown",
        outfit: "red",
        pants: "blue",
        skin: "fair",
        accessory: null,
      },
      createdAt: NOW,
    },
  },
  bob: {
    key: "bob",
    username: "bob",
    phone: "+1 555 0102",
    country: "US",
    character: {
      id: BOB_ID,
      accountId: asAccountId("acct_bob"),
      displayName: "Bob",
      appearance: {
        kit: "cozy",
        sheetId: "80",
        hair: "brown",
        outfit: "red",
        pants: "blue",
        skin: "tan",
        accessory: "purple",
      },
      createdAt: NOW,
    },
  },
  carol: {
    key: "carol",
    username: "carol",
    phone: "+1 555 0103",
    country: "US",
    character: {
      id: CAROL_ID,
      accountId: asAccountId("acct_carol"),
      displayName: "Carol",
      appearance: {
        kit: "cozy",
        sheetId: "120",
        hair: "black",
        outfit: "red",
        pants: "blue",
        skin: "fair",
        accessory: null,
      },
      createdAt: NOW,
    },
  },
  dave: {
    key: "dave",
    username: "dave",
    phone: "+1 555 0104",
    country: "US",
    character: {
      id: DAVE_ID,
      accountId: asAccountId("acct_dave"),
      displayName: "Dave",
      appearance: {
        kit: "cozy",
        sheetId: "200",
        hair: "blond",
        outfit: "red",
        pants: "blue",
        skin: "tan",
        accessory: null,
      },
      createdAt: NOW,
    },
  },
};

export function resolveDemoUser(raw: string | null | undefined): DemoUserKey {
  if (raw === "bob") return "bob";
  if (raw === "carol") return "carol";
  if (raw === "dave") return "dave";
  return "alice";
}

export function getPeerKey(self: DemoUserKey): DemoUserKey {
  return self === "alice" ? "bob" : "alice";
}

/** Hallway avatar faces — always peers only (never self); parties use up to 2. */
export function appearancesForConversation(
  memberKeys: DemoUserKey[],
  kind: "dm" | "party",
  selfKey: DemoUserKey,
): Appearance[] {
  const peers = memberKeys.filter((k) => k !== selfKey);
  const keys =
    kind === "dm" ? peers.slice(0, 1) : peers.slice(0, 3);
  return keys.map((k) => DEMO_USERS[k].character.appearance);
}

export function contactsFor(self: DemoUserKey): Contact[] {
  return (Object.keys(DEMO_USERS) as DemoUserKey[])
    .filter((k) => k !== self)
    .map((k) => {
      const peer = DEMO_USERS[k];
      return {
        userKey: peer.key,
        characterId: String(peer.character.id),
        displayName: peer.character.displayName,
        username: peer.username,
        phone: peer.phone,
        country: peer.country,
      };
    });
}

export function initialConversations(self: DemoUserKey): ConversationPreview[] {
  const peers = (Object.keys(DEMO_USERS) as DemoUserKey[]).filter((k) => k !== self);
  const dms: ConversationPreview[] = peers.map((peerKey, index) => {
    const peer = DEMO_USERS[peerKey];
    return {
      roomId: dmRoomIdFor(self, peerKey),
      kind: "dm" as const,
      title: peer.character.displayName,
      peerUserKey: peerKey,
      memberKeys: [self, peerKey].sort() as DemoUserKey[],
      preview: "Private room · just the two of you",
      updatedAt: NOW - index,
      personalStyleId: "garden" as const,
    };
  });

  return [
    {
      roomId: TEST_LAB_ROOM_ID,
      kind: "party",
      title: "Test Lab",
      memberKeys: [...ALL_DEMO_KEYS],
      preview: "Shared sandbox · all demo users",
      updatedAt: NOW + 2,
      personalStyleId: "loft",
    },
    {
      roomId: PARTY_ROOM_ID,
      kind: "party",
      title: "Pixel crew",
      memberKeys: [...ALL_DEMO_KEYS],
      preview: "Party · Alice, Bob, Carol & Dave",
      updatedAt: NOW + 1,
    },
    ...(TRIO_KEYS.includes(self)
      ? [
          {
            roomId: TRIO_ROOM_ID,
            kind: "party" as const,
            title: "Trio",
            memberKeys: [...TRIO_KEYS],
            preview: "Party · Alice, Bob & Carol",
            updatedAt: NOW,
          },
        ]
      : []),
    ...dms,
  ];
}

function sleepingMember(
  characterId: ReturnType<typeof asCharacterId>,
  x: number,
  y: number,
  facing: "left" | "right",
) {
  return {
    characterId,
    presence: "sleeping" as const,
    position: { x, y },
    facing,
    currentAction: "sleep" as const,
    actionTargetId: null,
    occupiedSpotId: null,
    lastActiveAt: NOW,
  };
}

export function createSeedDmRoom(): Room {
  return {
    id: DM_ROOM_ID,
    kind: "dm",
    name: null,
    memberIds: [ALICE_ID, BOB_ID],
    adminIds: [],
    styleId: "garden",
    hotspots: DEFAULT_HOTSPOTS.map((h) => ({ ...h, position: { ...h.position } })),
    memberState: {
      [String(ALICE_ID)]: sleepingMember(ALICE_ID, 3, 1.6, "right"),
      [String(BOB_ID)]: sleepingMember(BOB_ID, 8, 2.4, "left"),
    },
    actionLog: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export function createSeedPartyRoom(): Room {
  return {
    id: PARTY_ROOM_ID,
    kind: "party",
    name: "Pixel crew",
    memberIds: [ALICE_ID, BOB_ID, CAROL_ID, DAVE_ID],
    adminIds: [ALICE_ID],
    styleId: "loft",
    hotspots: DEFAULT_HOTSPOTS.map((h) => ({ ...h, position: { ...h.position } })),
    memberState: {
      [String(ALICE_ID)]: sleepingMember(ALICE_ID, 3, 1.6, "right"),
      [String(BOB_ID)]: sleepingMember(BOB_ID, 6, 2.2, "left"),
      [String(CAROL_ID)]: sleepingMember(CAROL_ID, 9, 1.4, "left"),
      [String(DAVE_ID)]: sleepingMember(DAVE_ID, 12, 2.0, "left"),
    },
    actionLog: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export const STORE_CATALOG: StoreItem[] = [
  { id: "outfit_hoodie", kind: "outfit", name: "Moss Hoodie", price: 120, unlocked: false },
  { id: "outfit_overalls", kind: "outfit", name: "Pixel Overalls", price: 180, unlocked: false },
  { id: "room_loft", kind: "room", name: "Loft Studio", price: 400, unlocked: false },
  { id: "room_garden", kind: "room", name: "Garden Nook", price: 520, unlocked: true },
  { id: "outfit_starter", kind: "outfit", name: "Starter Set", price: 0, unlocked: true },
];
