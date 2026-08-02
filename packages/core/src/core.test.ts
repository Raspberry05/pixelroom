import { describe, expect, it, beforeEach } from "vitest";
import {
  createCharacter,
  createRoom,
  createTextMessage,
  parseCommand,
  performAction,
  resetIdCounter,
  setPresence,
  tickRoom,
  asAccountId,
  findFreeSpotForAction,
} from "./index.js";

beforeEach(() => {
  resetIdCounter();
});

describe("parseCommand", () => {
  it("parses social and solo commands", () => {
    expect(parseCommand("*hug alex")).toEqual({
      action: "hug",
      targetName: "alex",
      raw: "*hug alex",
    });
    expect(parseCommand("*cook")).toEqual({
      action: "cook",
      targetName: null,
      raw: "*cook",
    });
    expect(parseCommand("*watch")).toEqual({
      action: "watch",
      targetName: null,
      raw: "*watch",
    });
    expect(parseCommand("*watch tv")).toEqual({
      action: "watch",
      targetName: null,
      raw: "*watch tv",
    });
    expect(parseCommand("*make bed")).toEqual({
      action: "makebed",
      targetName: null,
      raw: "*make bed",
    });
    expect(parseCommand("*water plant")).toEqual({
      action: "water",
      targetName: null,
      raw: "*water plant",
    });
    expect(parseCommand("*kiss @Sam")).toEqual({
      action: "kiss",
      targetName: "Sam",
      raw: "*kiss @Sam",
    });
  });

  it("rejects unknown verbs", () => {
    expect(parseCommand("*fly")).toBeNull();
    expect(parseCommand("hello")).toBeNull();
  });
});

describe("room presence + actions", () => {
  it("puts absent members to sleep and lets actives interact", () => {
    const alice = createCharacter({
      accountId: asAccountId("a1"),
      displayName: "Alice",
      now: 1,
    });
    const bob = createCharacter({
      accountId: asAccountId("a2"),
      displayName: "Bob",
      now: 1,
    });

    let room = createRoom({
      kind: "dm",
      memberIds: [alice.id, bob.id],
      now: 1,
    });

    expect(room.memberState[alice.id]?.currentAction).toBe("sleep");

    room = setPresence(room, alice.id, "active", 2);
    room = setPresence(room, bob.id, "active", 3);

    const charactersById = new Map([
      [alice.id, alice],
      [bob.id, bob],
    ]);

    const hugged = performAction(room, alice.id, "hug", {
      targetName: "Bob",
      charactersById,
      now: 4,
    });

    expect(hugged.logEntry.action).toBe("hug");
    expect(hugged.room.memberState[alice.id]?.currentAction).toBe("hug");
    expect(hugged.room.memberState[bob.id]?.currentAction).toBe("hug");
    const ax = hugged.room.memberState[alice.id]!.position.x;
    const bx = hugged.room.memberState[bob.id]!.position.x;
    expect(Math.abs(ax - bx)).toBeGreaterThanOrEqual(0.8);
  });

  it("blocks social actions on sleeping members", () => {
    const alice = createCharacter({ accountId: "a1", displayName: "Alice", now: 1 });
    const bob = createCharacter({ accountId: "a2", displayName: "Bob", now: 1 });
    let room = createRoom({ kind: "dm", memberIds: [alice.id, bob.id], now: 1 });
    room = setPresence(room, alice.id, "active", 2);

    expect(() =>
      performAction(room, alice.id, "hug", {
        targetId: bob.id,
        now: 3,
      }),
    ).toThrow(/sleeping/);
  });

  it("requires a free seat to sit and claims the hotspot", () => {
    const alice = createCharacter({ accountId: "a1", displayName: "Alice", now: 1 });
    const bob = createCharacter({ accountId: "a2", displayName: "Bob", now: 1 });
    let room = createRoom({ kind: "dm", memberIds: [alice.id, bob.id], now: 1 });
    room = setPresence(room, alice.id, "active", 2);
    const spot = findFreeSpotForAction(room, "sit", alice.id);
    expect(spot).not.toBeNull();
    const sat = performAction(room, alice.id, "sit", { now: 3 });
    expect(sat.room.memberState[alice.id]?.occupiedSpotId).toBe(spot!.id);
    expect(sat.room.memberState[alice.id]?.currentAction).toBe("sit");
  });

  it("refuses to sit again while already sitting", () => {
    const alice = createCharacter({ accountId: "a1", displayName: "Alice", now: 1 });
    const bob = createCharacter({ accountId: "a2", displayName: "Bob", now: 1 });
    let room = createRoom({ kind: "dm", memberIds: [alice.id, bob.id], now: 1 });
    room = setPresence(room, alice.id, "active", 2);
    room = performAction(room, alice.id, "sit", { now: 3 }).room;
    expect(() => performAction(room, alice.id, "sit", { now: 4 })).toThrow(/already sit/);
  });

  it("enforces auto cooldown but not user-command cooldown", () => {
    const alice = createCharacter({ accountId: "a1", displayName: "Alice", now: 1 });
    const bob = createCharacter({ accountId: "a2", displayName: "Bob", now: 1 });
    let room = createRoom({ kind: "dm", memberIds: [alice.id, bob.id], now: 1 });
    room = setPresence(room, alice.id, "active", 2);
    room = performAction(room, alice.id, "sing", { source: "auto", now: 3 }).room;
    room = {
      ...room,
      memberState: {
        ...room.memberState,
        [alice.id]: { ...room.memberState[alice.id]!, currentAction: "idle" },
      },
    };
    // Auto is blocked by cooldown.
    expect(() =>
      performAction(room, alice.id, "sing", { source: "auto", now: 8_000 }),
    ).toThrow(/cooldown/);
    // User command ignores cooldown.
    const manual = performAction(room, alice.id, "sing", {
      source: "command",
      now: 8_000,
    });
    expect(manual.room.memberState[alice.id]?.currentAction).toBe("sing");
  });

  it("moves sleeping members onto a sit/sleep spot", () => {
    const alice = createCharacter({ accountId: "a1", displayName: "Alice", now: 1 });
    const bob = createCharacter({ accountId: "a2", displayName: "Bob", now: 1 });
    let room = createRoom({ kind: "dm", memberIds: [alice.id, bob.id], now: 1 });
    room = setPresence(room, alice.id, "active", 2);
    room = setPresence(room, alice.id, "sleeping", 3);
    const aliceState = room.memberState[alice.id]!;
    expect(aliceState.currentAction).toBe("sleep");
    expect(aliceState.occupiedSpotId).toBeTruthy();
    const spot = room.hotspots.find((h) => h.id === aliceState.occupiedSpotId);
    expect(spot?.kind).toBe("sit");
    expect(aliceState.position.x).toBeCloseTo(spot!.position.x, 0);
    expect(aliceState.position.y).toBeCloseTo(spot!.position.y, 0);
  });

  it("requires parties to have at least 3 members", () => {
    const a = createCharacter({ accountId: "1", displayName: "A", now: 1 });
    const b = createCharacter({ accountId: "2", displayName: "B", now: 1 });
    expect(() => createRoom({ kind: "party", memberIds: [a.id, b.id], now: 1 })).toThrow(
      /3/,
    );
  });
});

describe("tickRoom", () => {
  it("auto-interacts when multiple members are active", () => {
    const a = createCharacter({ accountId: "1", displayName: "A", now: 1 });
    const b = createCharacter({ accountId: "2", displayName: "B", now: 1 });
    let room = createRoom({ kind: "dm", memberIds: [a.id, b.id], now: 1 });
    room = setPresence(room, a.id, "active", 2);
    room = setPresence(room, b.id, "active", 3);

    const result = tickRoom(room, {
      now: 10,
      config: { autoInteractChance: 1, maxAutoInteractions: 1 },
      random: () => 0.1,
    });

    expect(result.events.length).toBeGreaterThanOrEqual(1);
    expect(result.events[0]?.source).toBe("auto");
    expect(["wave", "talk", "sit", "sing"]).toContain(result.events[0]?.action);
  });

  it("keeps a player-commanded action instead of auto thrashing", () => {
    const a = createCharacter({ accountId: "1", displayName: "A", now: 1 });
    const b = createCharacter({ accountId: "2", displayName: "B", now: 1 });
    let room = createRoom({ kind: "dm", memberIds: [a.id, b.id], now: 1 });
    room = setPresence(room, a.id, "active", 2);
    room = setPresence(room, b.id, "active", 3);
    room = performAction(room, a.id, "sit", { source: "command", now: 100 }).room;

    const result = tickRoom(room, {
      now: 5_000,
      config: { autoInteractChance: 1, maxAutoInteractions: 3 },
      random: () => 0.1,
    });

    expect(result.room.memberState[a.id]?.currentAction).toBe("sit");
    expect(
      result.events.every((e) => String(e.actorId) !== String(a.id)),
    ).toBe(true);
  });
});

describe("messages", () => {
  it("creates plaintext text messages for encryption layer", () => {
    const alice = createCharacter({ accountId: "1", displayName: "Alice", now: 1 });
    const bob = createCharacter({ accountId: "2", displayName: "Bob", now: 1 });
    const room = createRoom({ kind: "dm", memberIds: [alice.id, bob.id], now: 1 });
    const msg = createTextMessage({
      roomId: room.id,
      senderId: alice.id,
      text: "hey",
      now: 5,
    });
    expect(msg.type).toBe("text");
    expect(msg.text).toBe("hey");
  });
});
