import { WebSocketServer, type WebSocket } from "ws";
import {
  asAccountId,
  asCharacterId,
  asRoomId,
  createSeedCompatibleRoom,
  performAction,
  ROOM_SPAN_X,
  setPresence,
  setRoomStyle,
  tickRoom,
  isRoomStyleId,
  withMemberState,
  type ActionKind,
  type Character,
  type CharacterId,
  type PresenceState,
  type Room,
} from "./domain.js";

type DemoUserKey = "alice" | "bob" | "carol";

type ChatLine = {
  id: string;
  roomId: string;
  senderKey: DemoUserKey;
  senderName: string;
  text: string;
  at: number;
  kind: "text" | "action" | "system";
};

type ClientMsg =
  | { type: "hello"; userKey: DemoUserKey }
  | { type: "join_room"; roomId: string }
  | { type: "leave_room"; roomId: string }
  | { type: "chat"; roomId: string; text: string }
  | {
      type: "action";
      roomId: string;
      action: ActionKind;
      targetName?: string | null;
    }
  | { type: "presence"; roomId: string; presence: PresenceState }
  | { type: "set_room_style"; roomId: string; styleId: string }
  | { type: "set_room_layout"; roomId: string; document: unknown }
  | { type: "set_position"; roomId: string; x: number; y?: number }
  | { type: "typing"; roomId: string; isTyping: boolean };

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
const DM_ROOM_ID = asRoomId("dm:alice:bob");
const PARTY_ROOM_ID = asRoomId("party:alice:bob:carol");

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
      pants: "purple",
      skin: "tan",
      accessory: null,
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
};

const characterByUser: Record<DemoUserKey, CharacterId> = {
  alice: ALICE_ID,
  bob: BOB_ID,
  carol: CAROL_ID,
};

const nameByUser: Record<DemoUserKey, string> = {
  alice: "Alice",
  bob: "Bob",
  carol: "Carol",
};

function userKeyForCharacter(id: CharacterId): DemoUserKey {
  if (id === BOB_ID) return "bob";
  if (id === CAROL_ID) return "carol";
  return "alice";
}

function resolveUserKey(raw: string | undefined): DemoUserKey {
  if (raw === "bob") return "bob";
  if (raw === "carol") return "carol";
  return "alice";
}

const rooms = new Map<string, Room>();
rooms.set(
  String(DM_ROOM_ID),
  createSeedCompatibleRoom(DM_ROOM_ID, [ALICE_ID, BOB_ID], { kind: "dm" }),
);
rooms.set(
  String(PARTY_ROOM_ID),
  createSeedCompatibleRoom(PARTY_ROOM_ID, [ALICE_ID, BOB_ID, CAROL_ID], {
    kind: "party",
    name: "Pixel crew",
    adminIds: [ALICE_ID],
    styleId: "loft",
  }),
);

const messages = new Map<string, ChatLine[]>();
messages.set(String(DM_ROOM_ID), []);
messages.set(String(PARTY_ROOM_ID), []);
/** Shared furniture layout — both members edit; last write wins with rev. */
const layouts = new Map<string, RoomLayoutState>();
/** Skip auto-wander briefly after a player scrolls their character. */
const manualMoveAt = new Map<string, number>();

const sockets = new Map<WebSocket, SocketState>();

function ensureRoom(roomId: string): Room {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  const seeded =
    roomId.startsWith("party:")
      ? createSeedCompatibleRoom(asRoomId(roomId), [ALICE_ID, BOB_ID, CAROL_ID], {
          kind: "party",
          name: "Party",
          adminIds: [ALICE_ID],
        })
      : createSeedCompatibleRoom(asRoomId(roomId), [ALICE_ID, BOB_ID], { kind: "dm" });
  rooms.set(roomId, seeded);
  if (!messages.has(roomId)) messages.set(roomId, []);
  return seeded;
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

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function layoutPayload(roomId: string): RoomLayoutState | null {
  return layouts.get(roomId) ?? null;
}

function broadcastRoom(roomId: string) {
  const room = ensureRoom(roomId);
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

function appendMessage(line: ChatLine) {
  const list = messages.get(line.roomId) ?? [];
  list.push(line);
  messages.set(line.roomId, list.slice(-200));
  for (const [ws, state] of sockets) {
    if (state.roomId === line.roomId) {
      send(ws, { type: "chat", message: line });
    }
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
    return;
  }

  if (!state.userKey) {
    send(ws, { type: "error", message: "send hello first" });
    return;
  }

  const userKey = state.userKey;
  const characterId = characterByUser[userKey];

  if (msg.type === "join_room") {
    state.roomId = msg.roomId;
    const room = setPresence(ensureRoom(msg.roomId), characterId, "active");
    setRoomState(msg.roomId, room);
    broadcastRoom(msg.roomId);
    return;
  }

  if (msg.type === "leave_room") {
    if (state.roomId === msg.roomId) {
      state.roomId = null;
    }
    const room = setPresence(ensureRoom(msg.roomId), characterId, "sleeping");
    setRoomState(msg.roomId, room);
    broadcastRoom(msg.roomId);
    return;
  }

  if (msg.type === "presence") {
    const room = setPresence(ensureRoom(msg.roomId), characterId, msg.presence);
    setRoomState(msg.roomId, room);
    broadcastRoom(msg.roomId);
    return;
  }

  if (msg.type === "chat") {
    const text = msg.text.trim();
    if (!text) return;
    const line: ChatLine = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId: msg.roomId,
      senderKey: userKey,
      senderName: nameByUser[userKey],
      text,
      at: Date.now(),
      kind: "text",
    };
    appendMessage(line);
    const room = ensureRoom(msg.roomId);
    setRoomState(msg.roomId, { ...room, updatedAt: Date.now() });
    return;
  }

  if (msg.type === "action") {
    try {
      const result = performAction(ensureRoom(msg.roomId), characterId, msg.action, {
        targetName: msg.targetName ?? null,
        charactersById: charactersById(),
        source: "command",
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
      const current = ensureRoom(msg.roomId);
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
    const prev = layouts.get(msg.roomId);
    const next: RoomLayoutState = {
      document: msg.document,
      rev: (prev?.rev ?? 0) + 1,
    };
    layouts.set(msg.roomId, next);
    broadcastLayout(msg.roomId, userKey);
    return;
  }

  if (msg.type === "set_position") {
    const maxX = worldSpanForRoom(msg.roomId);
    let room = ensureRoom(msg.roomId);
    const current = room.memberState[String(characterId)];
    if (!current || current.presence !== "active") return;
    const x = Math.max(0, Math.min(maxX, Number(msg.x) || 0));
    const y = Math.max(
      0,
      Math.min(4, msg.y == null ? current.position.y : Number(msg.y) || 0),
    );
    const facing =
      Math.abs(x - current.position.x) > 0.05
        ? x < current.position.x
          ? "left"
          : "right"
        : current.facing;
    room = withMemberState(
      room,
      characterId,
      {
        position: { x, y },
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
    return;
  }

  if (msg.type === "typing") {
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
    if (state?.userKey && state.roomId) {
      const room = setPresence(
        ensureRoom(state.roomId),
        characterByUser[state.userKey],
        "sleeping",
      );
      setRoomState(state.roomId, room);
      broadcastRoom(state.roomId);
    }
    sockets.delete(ws);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    const active = Object.values(room.memberState).some((m) => m.presence === "active");
    if (!active) continue;
    const skipWanderIds = Object.values(room.memberState)
      .filter((m) => now - (manualMoveAt.get(String(m.characterId)) ?? 0) < 2800)
      .map((m) => m.characterId);
    const result = tickRoom(room, {
      now,
      config: {
        autoInteractChance: 0.45,
        maxAutoInteractions: 1,
        skipWanderIds,
        floorMaxX: worldSpanForRoom(roomId),
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

console.log(`Pixelroom sync server on ws://localhost:${PORT}`);
console.log(`Open browsers: ?user=alice | ?user=bob | ?user=carol`);
