import { createId } from "./id.js";
import { asMessageId, type ActionKind, type CharacterId, type MessageId, type PlaintextMessage, type RoomId } from "./types.js";

export type CreateTextMessageInput = {
  roomId: RoomId;
  senderId: CharacterId;
  text: string;
  now?: number;
  id?: MessageId;
};

export type CreateActionMessageInput = {
  roomId: RoomId;
  senderId: CharacterId;
  action: ActionKind;
  actionTargetId?: CharacterId | null;
  text?: string | null;
  now?: number;
  id?: MessageId;
};

export function createTextMessage(input: CreateTextMessageInput): PlaintextMessage {
  const text = input.text.trim();
  if (text.length === 0) {
    throw new Error("text message cannot be empty");
  }

  return {
    id: input.id ?? asMessageId(createId("msg")),
    roomId: input.roomId,
    senderId: input.senderId,
    sentAt: input.now ?? Date.now(),
    type: "text",
    text,
    action: null,
    actionTargetId: null,
  };
}

export function createActionMessage(input: CreateActionMessageInput): PlaintextMessage {
  return {
    id: input.id ?? asMessageId(createId("msg")),
    roomId: input.roomId,
    senderId: input.senderId,
    sentAt: input.now ?? Date.now(),
    type: "action",
    text: input.text ?? null,
    action: input.action,
    actionTargetId: input.actionTargetId ?? null,
  };
}

/**
 * High-level chat input handler: commands become action messages,
 * everything else becomes text (caller encrypts before send).
 */
export function classifyChatInput(text: string): "command" | "text" {
  return text.trim().startsWith("*") ? "command" : "text";
}
