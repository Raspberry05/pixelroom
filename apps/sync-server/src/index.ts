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
const DM_ALICE_BOB = asRoomId("dm:alice:bob");
const DM_ALICE_CAROL = asRoomId("dm:alice:carol");
const DM_BOB_CAROL = asRoomId("dm:bob:carol");
const PARTY_ROOM_ID = asRoomId("party:alice:bob:carol");
const TEST_LAB_ROOM_ID = "dm:local:test-lab";

function isDemoUserKey(value: string): value is DemoUserKey {
  return value === "alice" || value === "bob" || value === "carol";
}

function parseRoomMemberKeys(roomId: string): DemoUserKey[] | null {
  if (roomId === TEST_LAB_ROOM_ID) {
    return ["alice", "bob", "carol"];
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
};

const characterByUser: Record<DemoUserKey, CharacterId> = {
  alice: ALICE_ID,
  bob: BOB_ID,
  carol: CAROL_ID,
};

function characterIdsForKeys(keys: DemoUserKey[]): CharacterId[] {
  return keys.map((k) => characterByUser[k]);
}

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
  String(DM_ALICE_BOB),
  createSeedCompatibleRoom(DM_ALICE_BOB, [ALICE_ID, BOB_ID], { kind: "dm" }),
);
rooms.set(
  String(DM_ALICE_CAROL),
  createSeedCompatibleRoom(DM_ALICE_CAROL, [ALICE_ID, CAROL_ID], { kind: "dm" }),
);
rooms.set(
  String(DM_BOB_CAROL),
  createSeedCompatibleRoom(DM_BOB_CAROL, [BOB_ID, CAROL_ID], { kind: "dm" }),
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
rooms.set(
  TEST_LAB_ROOM_ID,
  createSeedCompatibleRoom(asRoomId(TEST_LAB_ROOM_ID), [ALICE_ID, BOB_ID, CAROL_ID], {
    kind: "party",
    name: "Test Lab",
    adminIds: [ALICE_ID],
    styleId: "loft",
  }),
);

const messages = new Map<string, ChatLine[]>();
messages.set(String(DM_ALICE_BOB), []);
messages.set(String(DM_ALICE_CAROL), []);
messages.set(String(DM_BOB_CAROL), []);
messages.set(String(PARTY_ROOM_ID), []);
messages.set(TEST_LAB_ROOM_ID, []);
/** Shared furniture layout — both members edit; last write wins with rev. */
const layouts = new Map<string, RoomLayoutState>();
/** Skip auto-wander briefly after a player scrolls their character. */
const manualMoveAt = new Map<string, number>();

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
    send(ws, { type: "chat_notify", message: line });
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
    try {
      const claimed = Array.isArray(msg.memberKeys)
        ? msg.memberKeys.filter(isDemoUserKey)
        : undefined;
      const room = ensureRoom(msg.roomId, claimed);
      assertRoomMember(room, userKey);
      state.roomId = msg.roomId;
      const next = setPresence(room, characterId, "active");
      setRoomState(msg.roomId, next);
      broadcastRoom(msg.roomId);
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
    try {
      const room = rooms.get(msg.roomId);
      if (!room) return;
      assertRoomMember(room, userKey);
      const next = setPresence(room, characterId, "sleeping");
      setRoomState(msg.roomId, next);
      broadcastRoom(msg.roomId);
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "failed to leave room",
      });
    }
    return;
  }

  if (msg.type === "presence") {
    try {
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
    try {
      const maxX = worldSpanForRoom(msg.roomId);
      let room = requireMembership(msg.roomId, userKey);
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
