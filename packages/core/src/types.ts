/** Unique opaque IDs used across the domain. */
export type CharacterId = string & { readonly __brand: "CharacterId" };
export type RoomId = string & { readonly __brand: "RoomId" };
export type AccountId = string & { readonly __brand: "AccountId" };
export type MessageId = string & { readonly __brand: "MessageId" };

export function asCharacterId(value: string): CharacterId {
  return value as CharacterId;
}

export function asRoomId(value: string): RoomId {
  return value as RoomId;
}

export function asAccountId(value: string): AccountId {
  return value as AccountId;
}

export function asMessageId(value: string): MessageId {
  return value as MessageId;
}

export type PresenceState = "active" | "away" | "sleeping";

export type RoomKind = "dm" | "group";

export type Appearance = {
  hair: string;
  outfit: string;
  skin: string;
  accessory: string | null;
};

export type Character = {
  id: CharacterId;
  accountId: AccountId;
  displayName: string;
  appearance: Appearance;
  createdAt: number;
};

export type Vec2 = {
  x: number;
  y: number;
};

export type ActionKind =
  | "idle"
  | "sleep"
  | "walk"
  | "cook"
  | "clean"
  | "hug"
  | "kiss"
  | "wave"
  | "talk"
  | "sit"
  | "dance";

export type RoomMemberState = {
  characterId: CharacterId;
  presence: PresenceState;
  position: Vec2;
  facing: "left" | "right";
  currentAction: ActionKind;
  actionTargetId: CharacterId | null;
  lastActiveAt: number;
};

export type RoomActionLogEntry = {
  id: string;
  at: number;
  actorId: CharacterId;
  action: ActionKind;
  targetId: CharacterId | null;
  source: "command" | "auto" | "presence";
};

export type Room = {
  id: RoomId;
  kind: RoomKind;
  name: string | null;
  memberIds: CharacterId[];
  memberState: Record<string, RoomMemberState>;
  actionLog: RoomActionLogEntry[];
  createdAt: number;
  updatedAt: number;
};

export type ParsedCommand = {
  action: ActionKind;
  targetName: string | null;
  raw: string;
};

export type ChatMessageType = "text" | "action" | "system";

export type PlaintextMessage = {
  id: MessageId;
  roomId: RoomId;
  senderId: CharacterId;
  sentAt: number;
  type: ChatMessageType;
  text: string | null;
  action: ActionKind | null;
  actionTargetId: CharacterId | null;
};
