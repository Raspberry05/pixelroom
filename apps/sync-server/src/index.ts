import { WebSocketServer, type WebSocket } from "ws";
import {
  asAccountId,
  asCharacterId,
  asRoomId,
  createSeedCompatibleRoom,
  DEFAULT_HOTSPOTS,
  hotspotsWithFurnitureSeats,
  performAction,
  resolveWalkPosition,
  ROOM_SPAN_X,
  setPresence,
  setRoomStyle,
  solidBoxesFromFurniture,
  tickRoom,
  isRoomStyleId,
  withMemberState,
  type ActionKind,
  type Character,
  type CharacterId,
  type LayoutFurnitureRef,
  type PresenceState,
  type Room,
} from "./domain.js";

type DemoUserKey = "alice" | "bob" | "carol" | "dave";

type ChatEnvelope = {
  version: 1;
  mode: "dm" | "party";
  senderKey: DemoUserKey;
  senderIdentity: string;
  ciphertext: string;
};

type ChatLine = {
  id: string;
  roomId: string;
  senderKey: DemoUserKey;
  senderName: string;
  /** Empty for E2EE text; plaintext only for action/system. */
  text: string;
  at: number;
  kind: "text" | "action" | "system";
  envelope?: ChatEnvelope;
};

type WebRtcSignalPayload =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | {
      kind: "ice";
      candidate: string;
      sdpMid?: string | null;
      sdpMLineIndex?: number | null;
    };

type ClientMsg =
  | { type: "hello"; userKey: DemoUserKey }
  | { type: "join_room"; roomId: string; memberKeys?: DemoUserKey[] }
  | { type: "leave_room"; roomId: string }
  /** Force every room's presence to match live sockets (clear ghost actives). */
  | { type: "refresh_rooms" }
  | { type: "chat"; roomId: string; envelope: ChatEnvelope }
  | {
      type: "action";
      roomId: string;
      action: ActionKind;
      targetName?: string | null;
    }
  | { type: "presence"; roomId: string; presence: PresenceState }
  | { type: "set_room_style"; roomId: string; styleId: string }
  | { type: "set_room_layout"; roomId: string; document: unknown }
  | { type: "propose_layout_import"; roomId: string; document: unknown }
  | { type: "layout_import_vote"; roomId: string; approve: boolean }
  | { type: "cancel_layout_import"; roomId: string }
  | { type: "propose_layout_reset"; roomId: string }
  | { type: "layout_reset_vote"; roomId: string; approve: boolean }
  | { type: "cancel_layout_reset"; roomId: string }
  | { type: "set_position"; roomId: string; x: number; y?: number }
  | { type: "typing"; roomId: string; isTyping: boolean }
  | { type: "call_invite"; roomId: string; targetKey?: DemoUserKey }
  | { type: "call_accept"; roomId: string }
  | { type: "call_decline"; roomId: string }
  | { type: "call_end"; roomId: string }
  | {
      type: "webrtc_signal";
      roomId: string;
      targetKey: DemoUserKey;
      payload: WebRtcSignalPayload;
    };

type ActiveCallSession = {
  isGroup: boolean;
  groupName: string | null;
  /** People currently on the call (host + anyone who accepted/joined). */
  participants: Set<DemoUserKey>;
};

type RoomLayoutState = {
  document: unknown;
  rev: number;
};

type SocketState = {
  userKey: DemoUserKey | null;
  roomId: string | null;
};

const PORT = Number(process.env.PIXELROOM_SYNC_PORT ?? 8787);
const TICK_MS = 1000;

const ALICE_ID = asCharacterId("char_alice");
const BOB_ID = asCharacterId("char_bob");
const CAROL_ID = asCharacterId("char_carol");
const DAVE_ID = asCharacterId("char_dave");
const DM_ALICE_BOB = asRoomId("dm:alice:bob");
const DM_ALICE_CAROL = asRoomId("dm:alice:carol");
const DM_ALICE_DAVE = asRoomId("dm:alice:dave");
const DM_BOB_CAROL = asRoomId("dm:bob:carol");
const DM_BOB_DAVE = asRoomId("dm:bob:dave");
const DM_CAROL_DAVE = asRoomId("dm:carol:dave");
const PARTY_ROOM_ID = asRoomId("party:alice:bob:carol:dave");
const TRIO_ROOM_ID = asRoomId("party:alice:bob:carol");
const TEST_LAB_ROOM_ID = "dm:local:test-lab";
const ALL_DEMO_KEYS: DemoUserKey[] = ["alice", "bob", "carol", "dave"];

function isDemoUserKey(value: string): value is DemoUserKey {
  return (
    value === "alice" ||
    value === "bob" ||
    value === "carol" ||
    value === "dave"
  );
}

function parseRoomMemberKeys(roomId: string): DemoUserKey[] | null {
  if (roomId === TEST_LAB_ROOM_ID) {
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

const characters: Record<string, Character> = {
  [String(ALICE_ID)]: {
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
    createdAt: Date.now(),
  },
  [String(BOB_ID)]: {
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
    createdAt: Date.now(),
  },
  [String(CAROL_ID)]: {
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
    createdAt: Date.now(),
  },
  [String(DAVE_ID)]: {
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
    createdAt: Date.now(),
  },
};

const characterByUser: Record<DemoUserKey, CharacterId> = {
  alice: ALICE_ID,
  bob: BOB_ID,
  carol: CAROL_ID,
  dave: DAVE_ID,
};

function characterIdsForKeys(keys: DemoUserKey[]): CharacterId[] {
  return keys.map((k) => characterByUser[k]);
}

const nameByUser: Record<DemoUserKey, string> = {
  alice: "Alice",
  bob: "Bob",
  carol: "Carol",
  dave: "Dave",
};

function userKeyForCharacter(id: CharacterId): DemoUserKey {
  if (id === BOB_ID) return "bob";
  if (id === CAROL_ID) return "carol";
  if (id === DAVE_ID) return "dave";
  return "alice";
}

function resolveUserKey(raw: string | undefined): DemoUserKey {
  if (raw === "bob") return "bob";
  if (raw === "carol") return "carol";
  if (raw === "dave") return "dave";
  return "alice";
}

const rooms = new Map<string, Room>();
rooms.set(
  String(DM_ALICE_BOB),
  createSeedCompatibleRoom(DM_ALICE_BOB, [ALICE_ID, BOB_ID], { kind: "dm" }),
);
rooms.set(
  String(DM_ALICE_CAROL),
  createSeedCompatibleRoom(DM_ALICE_CAROL, [ALICE_ID, CAROL_ID], { kind: "dm" }),
);
rooms.set(
  String(DM_ALICE_DAVE),
  createSeedCompatibleRoom(DM_ALICE_DAVE, [ALICE_ID, DAVE_ID], { kind: "dm" }),
);
rooms.set(
  String(DM_BOB_CAROL),
  createSeedCompatibleRoom(DM_BOB_CAROL, [BOB_ID, CAROL_ID], { kind: "dm" }),
);
rooms.set(
  String(DM_BOB_DAVE),
  createSeedCompatibleRoom(DM_BOB_DAVE, [BOB_ID, DAVE_ID], { kind: "dm" }),
);
rooms.set(
  String(DM_CAROL_DAVE),
  createSeedCompatibleRoom(DM_CAROL_DAVE, [CAROL_ID, DAVE_ID], { kind: "dm" }),
);
rooms.set(
  String(PARTY_ROOM_ID),
  createSeedCompatibleRoom(PARTY_ROOM_ID, [ALICE_ID, BOB_ID, CAROL_ID, DAVE_ID], {
    kind: "party",
    name: "Pixel crew",
    adminIds: [ALICE_ID],
    styleId: "loft",
  }),
);
rooms.set(
  String(TRIO_ROOM_ID),
  createSeedCompatibleRoom(TRIO_ROOM_ID, [ALICE_ID, BOB_ID, CAROL_ID], {
    kind: "party",
    name: "Trio",
    adminIds: [ALICE_ID],
    styleId: "loft",
  }),
);
rooms.set(
  TEST_LAB_ROOM_ID,
  createSeedCompatibleRoom(asRoomId(TEST_LAB_ROOM_ID), [ALICE_ID, BOB_ID, CAROL_ID, DAVE_ID], {
    kind: "party",
    name: "Test Lab",
    adminIds: [ALICE_ID],
    styleId: "loft",
  }),
);

const messages = new Map<string, ChatLine[]>();
messages.set(String(DM_ALICE_BOB), []);
messages.set(String(DM_ALICE_CAROL), []);
messages.set(String(DM_ALICE_DAVE), []);
messages.set(String(DM_BOB_CAROL), []);
messages.set(String(DM_BOB_DAVE), []);
messages.set(String(DM_CAROL_DAVE), []);
messages.set(String(PARTY_ROOM_ID), []);
messages.set(String(TRIO_ROOM_ID), []);
messages.set(TEST_LAB_ROOM_ID, []);
/** Shared furniture layout — both members edit; last write wins with rev. */
const layouts = new Map<string, RoomLayoutState>();
/** Skip auto-wander briefly after a player scrolls their character. */
const manualMoveAt = new Map<string, number>();

type PendingLayoutImport = {
  document: unknown;
  fromUserKey: DemoUserKey;
  approvals: Set<DemoUserKey>;
  required: DemoUserKey[];
};
/** Full JSON layout imports require every room member to approve. */
const pendingLayoutImports = new Map<string, PendingLayoutImport>();

type PendingLayoutReset = {
  fromUserKey: DemoUserKey;
  approvals: Set<DemoUserKey>;
  required: DemoUserKey[];
};
const pendingLayoutResets = new Map<string, PendingLayoutReset>();

const EMPTY_ROOM_LAYOUT = {
  version: 4,
  furniture: [],
  windows: [
    {
      id: "window_main",
      gx: 3,
      gy: 3,
      w: 6,
      h: 4,
    },
  ],
  expansionsLeft: 0,
  expansionsRight: 0,
  floorFill: true,
  floorTiles: {},
  wallTiles: {},
  expansionPurchases: [],
};

const sockets = new Map<WebSocket, SocketState>();
/** Live call sessions keyed by room id — enables late join without re-ringing. */
const activeCalls = new Map<string, ActiveCallSession>();

function resolveMemberKeysForCreate(
  roomId: string,
  claimed?: DemoUserKey[],
): DemoUserKey[] | null {
  const parsed = parseRoomMemberKeys(roomId);
  if (parsed) return parsed;
  if (claimed && claimed.length >= 1 && claimed.every(isDemoUserKey)) {
    return Array.from(new Set(claimed)).sort() as DemoUserKey[];
  }
  return null;
}

function ensureRoom(roomId: string, memberKeys?: DemoUserKey[]): Room {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  const keys = resolveMemberKeysForCreate(roomId, memberKeys);
  if (!keys || keys.length === 0) {
    throw new Error("unknown private room");
  }
  const memberIds = characterIdsForKeys(keys);
  const kind = keys.length >= 3 || roomId.startsWith("party:") || roomId === TEST_LAB_ROOM_ID
    ? "party"
    : "dm";
  const seeded = createSeedCompatibleRoom(asRoomId(roomId), memberIds, {
    kind,
    name:
      roomId === TEST_LAB_ROOM_ID
        ? "Test Lab"
        : kind === "party"
          ? "Party"
          : null,
    adminIds: kind === "party" ? [memberIds[0]!] : [],
    styleId: kind === "party" ? "loft" : "garden",
  });
  rooms.set(roomId, seeded);
  if (!messages.has(roomId)) messages.set(roomId, []);
  return seeded;
}

function assertRoomMember(room: Room, userKey: DemoUserKey): void {
  if (!userKeysForRoom(room).includes(userKey)) {
    throw new Error("not a member of this private room");
  }
}

function requireMembership(
  roomId: string,
  userKey: DemoUserKey,
  claimedMembers?: DemoUserKey[],
): Room {
  let room = rooms.get(roomId);
  if (!room) {
    // Layout/chat can race ahead of join_room — create canonical rooms on demand
    // when the id encodes members (dm:a:b / party:a:b:c) or claim is provided.
    const keys = resolveMemberKeysForCreate(roomId, claimedMembers);
    if (keys?.includes(userKey)) {
      room = ensureRoom(roomId, keys);
    } else {
      throw new Error("room not found");
    }
  }
  assertRoomMember(room, userKey);
  return room;
}

function setRoomState(roomId: string, next: Room) {
  rooms.set(roomId, next);
}

function worldSpanForRoom(roomId: string): number {
  const doc = layouts.get(roomId)?.document as
    | { expansionsLeft?: number; expansionsRight?: number }
    | undefined;
  const chunks =
    1 + Math.max(0, doc?.expansionsLeft ?? 0) + Math.max(0, doc?.expansionsRight ?? 0);
  return ROOM_SPAN_X * chunks;
}

function furnitureFromLayoutDoc(document: unknown): LayoutFurnitureRef[] {
  const doc = document as { furniture?: LayoutFurnitureRef[] } | null;
  if (!doc || !Array.isArray(doc.furniture)) return [];
  return doc.furniture.filter(
    (f) => f && typeof f.id === "string" && typeof f.sprite === "string",
  );
}

/** Match mobile FLOOR_DEPTH_CELLS for gy → logical depth mapping. */
const LAYOUT_FLOOR_DEPTH_CELLS = 7;

function solidBoxesFromLayout(roomId: string) {
  const furniture = furnitureFromLayoutDoc(layouts.get(roomId)?.document);
  return solidBoxesFromFurniture(furniture, LAYOUT_FLOOR_DEPTH_CELLS);
}

function notifyLayoutImportResolved(
  roomId: string,
  payload: {
    type: "layout_import_resolved";
    roomId: string;
    status: "applied" | "declined" | "cancelled";
    fromUserKey: DemoUserKey;
    byUserKey?: DemoUserKey;
    document?: unknown;
  },
  memberKeys: DemoUserKey[],
) {
  broadcastToRoom(roomId, payload);
  for (const key of memberKeys) {
    sendToUser(key, payload);
  }
}

/** Rebuild sit hotspots from placed chairs whenever layout changes. */
function applyFurnitureSeatsToRoom(roomId: string, document: unknown) {
  const room = rooms.get(roomId);
  if (!room) return;
  const furniture = furnitureFromLayoutDoc(document);
  const nextHotspots = hotspotsWithFurnitureSeats(
    DEFAULT_HOTSPOTS.map((h) => ({ ...h, position: { ...h.position } })),
    furniture,
  );
  setRoomState(roomId, {
    ...room,
    hotspots: nextHotspots,
    updatedAt: Date.now(),
  });
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function layoutPayload(roomId: string): RoomLayoutState | null {
  return layouts.get(roomId) ?? null;
}

/** User keys that currently have this room selected on an open socket. */
function connectedKeysForRoom(roomId: string): Set<DemoUserKey> {
  const keys = new Set<DemoUserKey>();
  for (const [, st] of sockets) {
    if (st.roomId === roomId && st.userKey) keys.add(st.userKey);
  }
  return keys;
}

/**
 * Presence follows live sockets: active only while joined to this room.
 * Clears ghost "online" members who left/hallway without a clean leave.
 */
function reconcileRoomPresence(roomId: string): Room {
  let room = ensureRoom(roomId);
  const connected = connectedKeysForRoom(roomId);
  for (const userKey of userKeysForRoom(room)) {
    const characterId = characterByUser[userKey];
    const member = room.memberState[String(characterId)];
    if (!member) continue;
    const wantActive = connected.has(userKey);
    if (wantActive && member.presence !== "active") {
      room = setPresence(room, characterId, "active");
    } else if (!wantActive && member.presence === "active") {
      room = setPresence(room, characterId, "sleeping");
    }
  }
  setRoomState(roomId, room);
  return room;
}

/** Reconcile every room; push clean snapshots to any room that has viewers. */
function refreshAllRoomsPresence() {
  for (const roomId of [...rooms.keys()]) {
    reconcileRoomPresence(roomId);
    const hasAudience = [...sockets.values()].some((s) => s.roomId === roomId);
    if (hasAudience) {
      broadcastRoom(roomId);
    }
  }
}

/**
 * Put this user to sleep in every room where none of their sockets are joined.
 * Fixes multi-room ghost "active" after tab switches / missed leave.
 */
function sleepUserInOtherRooms(userKey: DemoUserKey, exceptRoomId: string | null) {
  for (const roomId of [...rooms.keys()]) {
    if (exceptRoomId && roomId === exceptRoomId) continue;
    const stillJoined = [...sockets.values()].some(
      (s) => s.userKey === userKey && s.roomId === roomId,
    );
    if (stillJoined) continue;
    let room = rooms.get(roomId);
    if (!room) continue;
    const characterId = characterByUser[userKey];
    if (!room.memberIds.some((id) => id === characterId)) continue;
    const member = room.memberState[String(characterId)];
    if (!member || member.presence !== "active") continue;
    room = setPresence(room, characterId, "sleeping");
    setRoomState(roomId, room);
    if ([...sockets.values()].some((s) => s.roomId === roomId)) {
      broadcastRoom(roomId);
    }
  }
}

function broadcastRoom(roomId: string) {
  const room = reconcileRoomPresence(roomId);
  const layout = layoutPayload(roomId);
  const payload = {
    type: "room_state",
    room,
    messages: messages.get(roomId) ?? [],
    layout,
  };
  for (const [ws, state] of sockets) {
    if (state.roomId === roomId) {
      send(ws, payload);
    }
  }
}

function broadcastLayout(roomId: string, fromUserKey: DemoUserKey) {
  const layout = layouts.get(roomId);
  if (!layout) return;
  const payload = {
    type: "room_layout",
    roomId,
    document: layout.document,
    rev: layout.rev,
    fromUserKey,
  };
  for (const [ws, state] of sockets) {
    if (state.roomId === roomId) {
      send(ws, payload);
    }
  }
}

function broadcastToRoom(roomId: string, payload: unknown) {
  for (const [ws, state] of sockets) {
    if (state.roomId === roomId) {
      send(ws, payload);
    }
  }
}

function broadcastLayoutImportPending(roomId: string) {
  const pending = pendingLayoutImports.get(roomId);
  if (!pending) return;
  const payload = {
    type: "layout_import_pending",
    roomId,
    fromUserKey: pending.fromUserKey,
    document: pending.document,
    approvals: [...pending.approvals],
    required: pending.required,
  };
  // In-room members get the live banner; everyone else gets a notify (hallway / other room).
  broadcastToRoom(roomId, payload);
  for (const key of pending.required) {
    let inRoom = false;
    for (const [, st] of sockets) {
      if (st.userKey === key && st.roomId === roomId) {
        inRoom = true;
        break;
      }
    }
    if (!inRoom) {
      sendToUser(key, payload);
    }
  }
}

function commitLayoutImport(roomId: string, fromUserKey: DemoUserKey) {
  const pending = pendingLayoutImports.get(roomId);
  if (!pending) return;
  const prev = layouts.get(roomId);
  const next: RoomLayoutState = {
    document: pending.document,
    rev: (prev?.rev ?? 0) + 1,
  };
  layouts.set(roomId, next);
  applyFurnitureSeatsToRoom(roomId, pending.document);
  pendingLayoutImports.delete(roomId);
  const resolved = {
    type: "layout_import_resolved" as const,
    roomId,
    status: "applied" as const,
    fromUserKey,
    document: pending.document,
  };
  notifyLayoutImportResolved(
    roomId,
    resolved,
    userKeysForRoom(ensureRoom(roomId)),
  );
  broadcastLayout(roomId, fromUserKey);
  broadcastRoom(roomId);
}

function broadcastLayoutResetPending(roomId: string) {
  const pending = pendingLayoutResets.get(roomId);
  if (!pending) return;
  broadcastToRoom(roomId, {
    type: "layout_reset_pending",
    roomId,
    fromUserKey: pending.fromUserKey,
    approvals: [...pending.approvals],
    required: pending.required,
  });
}

function commitLayoutReset(roomId: string, fromUserKey: DemoUserKey) {
  if (!pendingLayoutResets.has(roomId)) return;
  const prev = layouts.get(roomId);
  const next: RoomLayoutState = {
    document: {
      ...EMPTY_ROOM_LAYOUT,
      windows: EMPTY_ROOM_LAYOUT.windows.map((w) => ({ ...w })),
    },
    rev: (prev?.rev ?? 0) + 1,
  };
  layouts.set(roomId, next);
  applyFurnitureSeatsToRoom(roomId, next.document);
  pendingLayoutResets.delete(roomId);
  broadcastToRoom(roomId, {
    type: "layout_reset_resolved",
    roomId,
    status: "applied",
    fromUserKey,
  });
  broadcastLayout(roomId, fromUserKey);
  broadcastRoom(roomId);
}

function userKeysForRoom(room: Room): DemoUserKey[] {
  const keys: DemoUserKey[] = [];
  for (const [key, id] of Object.entries(characterByUser) as [DemoUserKey, CharacterId][]) {
    if (room.memberIds.some((mid) => mid === id)) keys.push(key);
  }
  return keys;
}

function sendToUser(userKey: DemoUserKey, payload: unknown) {
  for (const [ws, state] of sockets) {
    if (state.userKey === userKey) send(ws, payload);
  }
}

function appendMessage(line: ChatLine) {
  const list = messages.get(line.roomId) ?? [];
  list.push(line);
  messages.set(line.roomId, list.slice(-200));

  const memberKeys = userKeysForRoom(ensureRoom(line.roomId));
  for (const [ws, state] of sockets) {
    if (!state.userKey || !memberKeys.includes(state.userKey)) continue;
    // Sender echo into the live room only (they're already composing there).
    if (state.userKey === line.senderKey) {
      if (state.roomId === line.roomId) {
        send(ws, { type: "chat", message: line });
      }
      continue;
    }
    // Recipients currently in this room → live chat (bubbles / HUD).
    if (state.roomId === line.roomId) {
      send(ws, { type: "chat", message: line });
      continue;
    }
    // Recipients elsewhere (hallway, another room) → notify only this conversation.
    send(ws, {
      type: "chat_notify",
      message: line,
      memberKeys,
    });
  }
}

function charactersById(): Map<CharacterId, Character> {
  return new Map(Object.values(characters).map((c) => [c.id, c] as const));
}

function handleMessage(ws: WebSocket, raw: string) {
  let msg: ClientMsg;
  try {
    msg = JSON.parse(raw) as ClientMsg;
  } catch {
    send(ws, { type: "error", message: "invalid json" });
    return;
  }

  const state = sockets.get(ws);
  if (!state) return;

  if (msg.type === "hello") {
    state.userKey = resolveUserKey(msg.userKey);
    send(ws, { type: "hello_ok", userKey: state.userKey });
    // Clear any ghost "active" for this user outside rooms they still occupy.
    sleepUserInOtherRooms(state.userKey, state.roomId);
    return;
  }

  if (!state.userKey) {
    send(ws, { type: "error", message: "send hello first" });
    return;
  }

  const userKey = state.userKey;
  const characterId = characterByUser[userKey];

  if (msg.type === "refresh_rooms") {
    refreshAllRoomsPresence();
    return;
  }

  if (msg.type === "join_room") {
    try {
      const claimed = Array.isArray(msg.memberKeys)
        ? msg.memberKeys.filter(isDemoUserKey)
        : undefined;
      const room = ensureRoom(msg.roomId, claimed);
      assertRoomMember(room, userKey);
      // Leaving a previous room must clear presence there (openRoom can switch).
      const previousRoomId = state.roomId;
      if (previousRoomId && previousRoomId !== msg.roomId) {
        state.roomId = null;
        // Always reconcile+broadcast previous room — never skip on assert errors.
        if (rooms.has(previousRoomId)) {
          broadcastRoom(previousRoomId);
        }
      }
      state.roomId = msg.roomId;
      // Drop ghost actives for this user in every other room.
      sleepUserInOtherRooms(userKey, msg.roomId);
      const existingLayout = layouts.get(msg.roomId);
      if (existingLayout) {
        applyFurnitureSeatsToRoom(msg.roomId, existingLayout.document);
      }
      // broadcastRoom reconciles active = connected sockets for this room.
      broadcastRoom(msg.roomId);
      if (pendingLayoutImports.has(msg.roomId)) {
        broadcastLayoutImportPending(msg.roomId);
      }
      if (pendingLayoutResets.has(msg.roomId)) {
        broadcastLayoutResetPending(msg.roomId);
      }
    } catch (err) {
      state.roomId = null;
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "failed to join room",
      });
    }
    return;
  }

  if (msg.type === "leave_room") {
    if (state.roomId === msg.roomId) {
      state.roomId = null;
    }
    // Force-sleep this user in the room they left unless another of their
    // tabs is still joined there (fixes Alice staying "active" on Bob's screen).
    if (rooms.has(msg.roomId)) {
      const stillJoined = [...sockets.values()].some(
        (s) => s.userKey === userKey && s.roomId === msg.roomId,
      );
      if (!stillJoined) {
        let room = rooms.get(msg.roomId)!;
        const member = room.memberState[String(characterId)];
        if (member && member.presence === "active") {
          room = setPresence(room, characterId, "sleeping");
          setRoomState(msg.roomId, room);
        }
      }
      broadcastRoom(msg.roomId);
    }
    sleepUserInOtherRooms(userKey, state.roomId);
    return;
  }

  if (msg.type === "presence") {
    try {
      // Presence only applies while this socket is actually in the room.
      if (state.roomId !== msg.roomId) {
        send(ws, {
          type: "error",
          message: "join the room before updating presence",
        });
        return;
      }
      const room = requireMembership(msg.roomId, userKey);
      const next = setPresence(room, characterId, msg.presence);
      setRoomState(msg.roomId, next);
      broadcastRoom(msg.roomId);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "presence update failed",
      });
    }
    return;
  }

  if (msg.type === "chat") {
    const envelope = msg.envelope;
    if (
      !envelope ||
      envelope.version !== 1 ||
      typeof envelope.ciphertext !== "string" ||
      !envelope.ciphertext
    ) {
      send(ws, { type: "error", message: "invalid chat envelope" });
      return;
    }
    try {
      requireMembership(msg.roomId, userKey);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
      return;
    }
    const line: ChatLine = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId: msg.roomId,
      senderKey: userKey,
      senderName: nameByUser[userKey],
      text: "",
      at: Date.now(),
      kind: "text",
      envelope: {
        version: 1,
        mode: envelope.mode === "party" ? "party" : "dm",
        senderKey: userKey,
        senderIdentity: String(envelope.senderIdentity ?? ""),
        ciphertext: envelope.ciphertext,
      },
    };
    appendMessage(line);
    const room = requireMembership(msg.roomId, userKey);
    setRoomState(msg.roomId, { ...room, updatedAt: Date.now() });
    return;
  }

  if (msg.type === "action") {
    try {
      const room = requireMembership(msg.roomId, userKey);
      const result = performAction(room, characterId, msg.action, {
        targetName: msg.targetName ?? null,
        charactersById: charactersById(),
        source: "command",
        solidBoxes: solidBoxesFromLayout(msg.roomId),
      });
      setRoomState(msg.roomId, result.room);
      const target = result.logEntry.targetId
        ? characters[String(result.logEntry.targetId)]?.displayName
        : null;
      appendMessage({
        id: result.logEntry.id,
        roomId: msg.roomId,
        senderKey: userKey,
        senderName: nameByUser[userKey],
        text: target ? `*${msg.action} ${target}` : `*${msg.action}`,
        at: result.logEntry.at,
        kind: "action",
      });
      broadcastRoom(msg.roomId);
    } catch (error) {
      send(ws, {
        type: "error",
        message: error instanceof Error ? error.message : "action failed",
      });
    }
    return;
  }

  if (msg.type === "set_room_style") {
    try {
      if (!isRoomStyleId(msg.styleId)) {
        throw new Error("unknown room style");
      }
      const current = requireMembership(msg.roomId, userKey);
      if (current.kind === "dm") {
        send(ws, {
          type: "error",
          message: "DM room styles are personal — change them in your settings only",
        });
        return;
      }
      setRoomState(msg.roomId, setRoomStyle(current, msg.styleId, characterId));
      broadcastRoom(msg.roomId);
    } catch (error) {
      send(ws, {
        type: "error",
        message: error instanceof Error ? error.message : "style change failed",
      });
    }
    return;
  }

  if (msg.type === "set_room_layout") {
    if (!msg.document || typeof msg.document !== "object") {
      send(ws, { type: "error", message: "invalid room layout" });
      return;
    }
    try {
      requireMembership(msg.roomId, userKey);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
      return;
    }
    if (pendingLayoutImports.has(msg.roomId) || pendingLayoutResets.has(msg.roomId)) {
      send(ws, {
        type: "error",
        message: "layout change waiting for room approval — finish or cancel it first",
      });
      return;
    }
    const prev = layouts.get(msg.roomId);
    const next: RoomLayoutState = {
      document: msg.document,
      rev: (prev?.rev ?? 0) + 1,
    };
    layouts.set(msg.roomId, next);
    applyFurnitureSeatsToRoom(msg.roomId, msg.document);
    broadcastLayout(msg.roomId, userKey);
    broadcastRoom(msg.roomId);
    return;
  }

  if (msg.type === "propose_layout_import") {
    if (!msg.document || typeof msg.document !== "object") {
      send(ws, { type: "error", message: "invalid layout import" });
      return;
    }
    try {
      const room = requireMembership(msg.roomId, userKey);
      const required = userKeysForRoom(room);
      if (required.length < 2) {
        send(ws, {
          type: "error",
          message: "layout import needs at least two room members",
        });
        return;
      }
      if (pendingLayoutImports.has(msg.roomId) || pendingLayoutResets.has(msg.roomId)) {
        send(ws, {
          type: "error",
          message: "a layout change is already waiting for approval",
        });
        return;
      }
      pendingLayoutImports.set(msg.roomId, {
        document: msg.document,
        fromUserKey: userKey,
        approvals: new Set([userKey]),
        required,
      });
      broadcastLayoutImportPending(msg.roomId);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
    }
    return;
  }

  if (msg.type === "layout_import_vote") {
    try {
      requireMembership(msg.roomId, userKey);
      const pending = pendingLayoutImports.get(msg.roomId);
      if (!pending) {
        send(ws, { type: "error", message: "no layout import pending" });
        return;
      }
      if (!pending.required.includes(userKey)) {
        send(ws, { type: "error", message: "not a room member" });
        return;
      }
      if (!msg.approve) {
        pendingLayoutImports.delete(msg.roomId);
        notifyLayoutImportResolved(
          msg.roomId,
          {
            type: "layout_import_resolved",
            roomId: msg.roomId,
            status: "declined",
            fromUserKey: pending.fromUserKey,
            byUserKey: userKey,
          },
          pending.required,
        );
        return;
      }
      pending.approvals.add(userKey);
      const allIn = pending.required.every((k) => pending.approvals.has(k));
      if (allIn) {
        commitLayoutImport(msg.roomId, pending.fromUserKey);
      } else {
        broadcastLayoutImportPending(msg.roomId);
      }
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
    }
    return;
  }

  if (msg.type === "cancel_layout_import") {
    try {
      requireMembership(msg.roomId, userKey);
      const pending = pendingLayoutImports.get(msg.roomId);
      if (!pending) return;
      if (pending.fromUserKey !== userKey) {
        send(ws, {
          type: "error",
          message: "only the proposer can cancel the import",
        });
        return;
      }
      pendingLayoutImports.delete(msg.roomId);
      notifyLayoutImportResolved(
        msg.roomId,
        {
          type: "layout_import_resolved",
          roomId: msg.roomId,
          status: "cancelled",
          fromUserKey: userKey,
          byUserKey: userKey,
        },
        pending.required,
      );
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
    }
    return;
  }

  if (msg.type === "propose_layout_reset") {
    try {
      const room = requireMembership(msg.roomId, userKey);
      const required = userKeysForRoom(room);
      if (required.length < 2) {
        send(ws, {
          type: "error",
          message: "layout reset needs at least two room members",
        });
        return;
      }
      if (pendingLayoutImports.has(msg.roomId) || pendingLayoutResets.has(msg.roomId)) {
        send(ws, {
          type: "error",
          message: "a layout change is already waiting for approval",
        });
        return;
      }
      pendingLayoutResets.set(msg.roomId, {
        fromUserKey: userKey,
        approvals: new Set([userKey]),
        required,
      });
      broadcastLayoutResetPending(msg.roomId);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
    }
    return;
  }

  if (msg.type === "layout_reset_vote") {
    try {
      requireMembership(msg.roomId, userKey);
      const pending = pendingLayoutResets.get(msg.roomId);
      if (!pending) {
        send(ws, { type: "error", message: "no layout reset pending" });
        return;
      }
      if (!pending.required.includes(userKey)) {
        send(ws, { type: "error", message: "not a room member" });
        return;
      }
      if (!msg.approve) {
        pendingLayoutResets.delete(msg.roomId);
        broadcastToRoom(msg.roomId, {
          type: "layout_reset_resolved",
          roomId: msg.roomId,
          status: "declined",
          fromUserKey: pending.fromUserKey,
          byUserKey: userKey,
        });
        return;
      }
      pending.approvals.add(userKey);
      if (pending.required.every((k) => pending.approvals.has(k))) {
        commitLayoutReset(msg.roomId, pending.fromUserKey);
      } else {
        broadcastLayoutResetPending(msg.roomId);
      }
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
    }
    return;
  }

  if (msg.type === "cancel_layout_reset") {
    try {
      requireMembership(msg.roomId, userKey);
      const pending = pendingLayoutResets.get(msg.roomId);
      if (!pending) return;
      if (pending.fromUserKey !== userKey) {
        send(ws, {
          type: "error",
          message: "only the proposer can cancel the reset",
        });
        return;
      }
      pendingLayoutResets.delete(msg.roomId);
      broadcastToRoom(msg.roomId, {
        type: "layout_reset_resolved",
        roomId: msg.roomId,
        status: "cancelled",
        fromUserKey: userKey,
        byUserKey: userKey,
      });
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
    }
    return;
  }

  if (msg.type === "set_position") {
    try {
      const maxX = worldSpanForRoom(msg.roomId);
      let room = requireMembership(msg.roomId, userKey);
      const current = room.memberState[String(characterId)];
      if (!current || current.presence !== "active") return;
      const rawX = Math.max(0, Math.min(maxX, Number(msg.x) || 0));
      const rawY = Math.max(
        0,
        Math.min(4, msg.y == null ? current.position.y : Number(msg.y) || 0),
      );
      const walked = resolveWalkPosition(
        { x: rawX, y: rawY },
        solidBoxesFromLayout(msg.roomId),
        maxX,
      );
      const facing =
        Math.abs(walked.x - current.position.x) > 0.05
          ? walked.x < current.position.x
            ? "left"
            : "right"
          : current.facing;
      room = withMemberState(
        room,
        characterId,
        {
          position: walked,
          facing,
          currentAction: "walk",
          occupiedSpotId: null,
          actionTargetId: null,
        },
        Date.now(),
      );
      setRoomState(msg.roomId, room);
      manualMoveAt.set(String(characterId), Date.now());
      broadcastRoom(msg.roomId);
    } catch {
      // ignore position from non-members
    }
    return;
  }

  if (msg.type === "typing") {
    try {
      requireMembership(msg.roomId, userKey);
    } catch {
      return;
    }
    for (const [peer, peerState] of sockets) {
      if (peer === ws) continue;
      if (peerState.roomId !== msg.roomId) continue;
      send(peer, {
        type: "peer_typing",
        roomId: msg.roomId,
        userKey,
        isTyping: Boolean(msg.isTyping),
      });
    }
    return;
  }

  if (msg.type === "call_invite") {
    let room: Room;
    try {
      room = requireMembership(msg.roomId, userKey);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
      return;
    }
    const members = userKeysForRoom(room);
    const isGroup = room.kind === "party";
    const groupName = isGroup ? (room.name ?? "Party") : null;
    const existing = activeCalls.get(msg.roomId);

    // Late join: someone else already on this call — connect without re-ringing.
    if (existing && existing.participants.size > 0) {
      if (existing.participants.has(userKey)) {
        send(ws, {
          type: "call_joined",
          roomId: msg.roomId,
          isGroup: existing.isGroup,
          groupName: existing.groupName,
          participants: Array.from(existing.participants),
        });
        return;
      }

      existing.participants.add(userKey);
      send(ws, {
        type: "call_joined",
        roomId: msg.roomId,
        isGroup: existing.isGroup,
        groupName: existing.groupName,
        participants: Array.from(existing.participants),
      });
      // Tell people already on the call someone joined (reuse accept signal).
      for (const peer of existing.participants) {
        if (peer === userKey) continue;
        sendToUser(peer, {
          type: "call_accept",
          roomId: msg.roomId,
          fromKey: userKey,
        });
      }
      return;
    }

    const targets = msg.targetKey
      ? members.includes(msg.targetKey)
        ? [msg.targetKey]
        : []
      : members.filter((k) => k !== userKey);

    if (targets.length === 0) {
      send(ws, { type: "error", message: "no one to call" });
      return;
    }

    activeCalls.set(msg.roomId, {
      isGroup,
      groupName,
      participants: new Set([userKey]),
    });

    for (const targetKey of targets) {
      if (!characterByUser[targetKey]) continue;
      sendToUser(targetKey, {
        type: "call_invite",
        roomId: msg.roomId,
        fromKey: userKey,
        fromName: nameByUser[userKey],
        isGroup,
        groupName,
      });
    }
    return;
  }

  if (msg.type === "call_accept") {
    let room: Room;
    try {
      room = requireMembership(msg.roomId, userKey);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
      return;
    }
    const session = activeCalls.get(msg.roomId);
    if (session) {
      session.participants.add(userKey);
    } else {
      activeCalls.set(msg.roomId, {
        isGroup: room.kind === "party",
        groupName: room.kind === "party" ? (room.name ?? "Party") : null,
        participants: new Set([userKey]),
      });
    }
    const others = userKeysForRoom(room).filter((k) => k !== userKey);
    for (const other of others) {
      sendToUser(other, {
        type: "call_accept",
        roomId: msg.roomId,
        fromKey: userKey,
      });
    }
    return;
  }

  if (msg.type === "call_decline") {
    let room: Room;
    try {
      room = requireMembership(msg.roomId, userKey);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
      return;
    }
    const others = userKeysForRoom(room).filter((k) => k !== userKey);
    for (const other of others) {
      sendToUser(other, {
        type: "call_decline",
        roomId: msg.roomId,
        fromKey: userKey,
      });
    }
    return;
  }

  if (msg.type === "call_end") {
    let room: Room;
    try {
      room = requireMembership(msg.roomId, userKey);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
      return;
    }
    const session = activeCalls.get(msg.roomId);
    const isGroup = session?.isGroup ?? room.kind === "party";

    if (session) {
      session.participants.delete(userKey);
    }

    if (isGroup && session && session.participants.size > 0) {
      // Leave group call — others keep talking.
      for (const peer of session.participants) {
        sendToUser(peer, {
          type: "call_peer_left",
          roomId: msg.roomId,
          fromKey: userKey,
        });
      }
      return;
    }

    // DM end, or last person left the group call.
    activeCalls.delete(msg.roomId);
    const others = userKeysForRoom(room).filter((k) => k !== userKey);
    for (const other of others) {
      sendToUser(other, {
        type: "call_end",
        roomId: msg.roomId,
        fromKey: userKey,
      });
    }
    return;
  }

  if (msg.type === "webrtc_signal") {
    try {
      const room = requireMembership(msg.roomId, userKey);
      if (!userKeysForRoom(room).includes(msg.targetKey)) {
        send(ws, { type: "error", message: "webrtc target not in room" });
        return;
      }
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "not allowed",
      });
      return;
    }
    sendToUser(msg.targetKey, {
      type: "webrtc_signal",
      roomId: msg.roomId,
      fromKey: userKey,
      payload: msg.payload,
    });
    return;
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  sockets.set(ws, { userKey: null, roomId: null });

  ws.on("message", (data) => {
    handleMessage(ws, String(data));
  });

  ws.on("close", () => {
    const state = sockets.get(ws);
    const roomId = state?.roomId ?? null;
    // Remove socket before reconcile so presence is not counted as joined.
    sockets.delete(ws);
    if (roomId) {
      broadcastRoom(roomId);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomId] of rooms) {
    // Drop ghost actives before deciding whether to tick; always notify if
    // reconcile changed anyone so peers don't keep a stale "active" snapshot.
    const before = rooms.get(roomId);
    const live = reconcileRoomPresence(roomId);
    const presenceChanged =
      before != null &&
      userKeysForRoom(live).some((k) => {
        const id = String(characterByUser[k]);
        return before.memberState[id]?.presence !== live.memberState[id]?.presence;
      });
    const active = Object.values(live.memberState).some((m) => m.presence === "active");
    if (!active) {
      if (presenceChanged) broadcastRoom(roomId);
      continue;
    }
    const skipWanderIds = Object.values(live.memberState)
      .filter((m) => now - (manualMoveAt.get(String(m.characterId)) ?? 0) < 1200)
      .map((m) => m.characterId);
    const solidBoxes = solidBoxesFromLayout(roomId);
    const result = tickRoom(live, {
      now,
      config: {
        // Lower chance + core hold/command locks keep actions coherent.
        autoInteractChance: 0.22,
        maxAutoInteractions: 1,
        skipWanderIds,
        floorMaxX: worldSpanForRoom(roomId),
        solidBoxes,
      },
    });
    setRoomState(roomId, result.room);
    const list = messages.get(roomId) ?? [];
    for (const event of result.events) {
      const actor = characters[String(event.actorId)];
      const target = event.targetId ? characters[String(event.targetId)] : null;
      list.push({
        id: event.id,
        roomId,
        senderKey: userKeyForCharacter(event.actorId),
        senderName: actor?.displayName ?? "Someone",
        text: target ? `*${event.action} ${target.displayName}` : `*${event.action}`,
        at: event.at,
        kind: "action",
      });
    }
    messages.set(roomId, list.slice(-200));
    broadcastRoom(roomId);
  }
}, TICK_MS);

console.log(`Roomie sync server on ws://localhost:${PORT}`);
console.log(`Open browsers: ?user=alice | ?user=bob | ?user=carol | ?user=dave`);
