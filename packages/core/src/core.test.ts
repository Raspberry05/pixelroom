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

    expect(result.events.length).toBe(1);
    expect(result.events[0]?.source).toBe("auto");
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
