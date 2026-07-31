import type { ActionKind, PresenceState, Room } from "@pixelroom/core";
import type { RoomDocument } from "../data/roomLayout";
import type { DemoUserKey } from "../data/seed";

/** Opaque E2EE chat payload — server stores/fans out without reading plaintext. */
export type ChatEnvelope = {
  version: 1;
  mode: "dm" | "party";
  senderKey: DemoUserKey;
  /** Base64 sender identity public key. */
  senderIdentity: string;
  /** Base64 ciphertext (nonce || box). */
  ciphertext: string;
};

export type ChatLine = {
  id: string;
  roomId: string;
  senderKey: DemoUserKey;
  senderName: string;
  /**
   * Plaintext for action/system, or decrypted text on the client.
   * Encrypted text messages may arrive with empty text + envelope.
   */
  text: string;
  at: number;
  kind: "text" | "action" | "system";
  envelope?: ChatEnvelope;
};

export type RoomLayoutPayload = {
  document: RoomDocument;
  rev: number;
};

export type WebRtcSignalPayload =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | {
      kind: "ice";
      candidate: string;
      sdpMid?: string | null;
      sdpMLineIndex?: number | null;
    };

export type ClientToServer =
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
  | { type: "set_room_layout"; roomId: string; document: RoomDocument }
  | {
      type: "set_position";
      roomId: string;
      x: number;
      y?: number;
    }
  | { type: "typing"; roomId: string; isTyping: boolean }
  /** Invite one peer (DM) or omit targetKey to ring everyone else in the room (party). */
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
      /** Offline-from-room alert for conversation recipients only. */
      type: "chat_notify";
      message: ChatLine;
    }
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
  | {
      type: "call_invite";
      roomId: string;
      fromKey: DemoUserKey;
      fromName: string;
      isGroup?: boolean;
      groupName?: string | null;
    }
  /** Confirms you joined an in-progress group call (no ring storm). */
  | {
      type: "call_joined";
      roomId: string;
      isGroup: boolean;
      groupName?: string | null;
      participants: DemoUserKey[];
    }
  | {
      type: "call_accept";
      roomId: string;
      fromKey: DemoUserKey;
    }
  | {
      type: "call_decline";
      roomId: string;
      fromKey: DemoUserKey;
    }
  /** Someone left a group call; others stay connected. */
  | {
      type: "call_peer_left";
      roomId: string;
      fromKey: DemoUserKey;
    }
  | {
      type: "call_end";
      roomId: string;
      fromKey: DemoUserKey;
    }
  | {
      type: "webrtc_signal";
      roomId: string;
      fromKey: DemoUserKey;
      payload: WebRtcSignalPayload;
    }
  | { type: "error"; message: string };
