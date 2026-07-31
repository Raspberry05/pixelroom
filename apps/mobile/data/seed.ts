import {
  asAccountId,
  asCharacterId,
  asRoomId,
  DEFAULT_HOTSPOTS,
  type Character,
  type Room,
  type RoomId,
  type RoomStyleId,
} from "@pixelroom/core";

export type DemoUserKey = "alice" | "bob";

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
export const DM_ROOM_ID = asRoomId("dm:alice:bob");

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
        pants: "purple",
        skin: "tan",
        accessory: null,
      },
      createdAt: NOW,
    },
  },
};

export function resolveDemoUser(raw: string | null | undefined): DemoUserKey {
  return raw === "bob" ? "bob" : "alice";
}

export function getPeerKey(self: DemoUserKey): DemoUserKey {
  return self === "alice" ? "bob" : "alice";
}

export function contactsFor(self: DemoUserKey): Contact[] {
  const peer = DEMO_USERS[getPeerKey(self)];
  return [
    {
      userKey: peer.key,
      characterId: String(peer.character.id),
      displayName: peer.character.displayName,
      username: peer.username,
      phone: peer.phone,
      country: peer.country,
    },
  ];
}

export function initialConversations(self: DemoUserKey): ConversationPreview[] {
  const peer = DEMO_USERS[getPeerKey(self)];
  return [
    {
      roomId: DM_ROOM_ID,
      kind: "dm",
      title: peer.character.displayName,
      peerUserKey: peer.key,
      preview: "Open the room to hang out",
      updatedAt: NOW,
      personalStyleId: "garden",
    },
  ];
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
      [String(ALICE_ID)]: {
        characterId: ALICE_ID,
        presence: "sleeping",
        position: { x: 3, y: 1.6 },
        facing: "right",
        currentAction: "sleep",
        actionTargetId: null,
        occupiedSpotId: null,
        lastActiveAt: NOW,
      },
      [String(BOB_ID)]: {
        characterId: BOB_ID,
        presence: "sleeping",
        position: { x: 8, y: 2.4 },
        facing: "left",
        currentAction: "sleep",
        actionTargetId: null,
        occupiedSpotId: null,
        lastActiveAt: NOW,
      },
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
