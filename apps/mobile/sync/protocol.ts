import type { ActionKind, PresenceState, Room } from "@pixelroom/core";
import type { RoomDocument } from "../data/roomLayout";
import type { DemoUserKey } from "../data/seed";

export type ChatLine = {
  id: string;
  roomId: string;
  senderKey: DemoUserKey;
  senderName: string;
  text: string;
  at: number;
  kind: "text" | "action" | "system";
};

export type RoomLayoutPayload = {
  document: RoomDocument;
  rev: number;
};

export type ClientToServer =
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
  | { type: "set_room_layout"; roomId: string; document: RoomDocument }
  | {
      type: "set_position";
      roomId: string;
      x: number;
      y?: number;
    }
  | { type: "typing"; roomId: string; isTyping: boolean };

export type ServerToClient =
  | { type: "hello_ok"; userKey: DemoUserKey }
  | {
      type: "room_state";
      room: Room;
      messages: ChatLine[];
      layout?: RoomLayoutPayload | null;
    }
  | { type: "chat"; message: ChatLine }
  | {
      type: "room_layout";
      roomId: string;
      document: RoomDocument;
      rev: number;
      fromUserKey: DemoUserKey;
    }
  | {
      type: "peer_typing";
      roomId: string;
      userKey: DemoUserKey;
      isTyping: boolean;
    }
  | { type: "error"; message: string };
