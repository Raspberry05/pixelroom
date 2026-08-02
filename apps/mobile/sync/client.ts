import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionKind, PresenceState, Room } from "@pixelroom/core";
import { decryptChatLine, decryptChatLines, encryptChatText, roomStubForCrypto } from "../data/chatCrypto";
import type { RoomDocument } from "../data/roomLayout";
import { createSeedDmRoom, type DemoUserKey } from "../data/seed";
import type {
  ChatLine,
  ClientToServer,
  RoomLayoutPayload,
  ServerToClient,
  WebRtcSignalPayload,
} from "./protocol";

export type SyncedLayout = RoomLayoutPayload & {
  fromUserKey?: DemoUserKey;
};

export type LayoutImportPending = {
  roomId: string;
  fromUserKey: DemoUserKey;
  document: RoomDocument;
  approvals: DemoUserKey[];
  required: DemoUserKey[];
};

export type LayoutImportResolved = {
  roomId: string;
  status: "applied" | "declined" | "cancelled";
  fromUserKey: DemoUserKey;
  byUserKey?: DemoUserKey;
  document?: RoomDocument;
};

export type LayoutResetPending = {
  roomId: string;
  fromUserKey: DemoUserKey;
  approvals: DemoUserKey[];
  required: DemoUserKey[];
};

export type LayoutResetResolved = {
  roomId: string;
  status: "applied" | "declined" | "cancelled";
  fromUserKey: DemoUserKey;
  byUserKey?: DemoUserKey;
};

export type IncomingCall = {
  roomId: string;
  fromKey: DemoUserKey;
  fromName: string;
  isGroup?: boolean;
  groupName?: string | null;
  at: number;
};

export type CallSignal =
  | { type: "accept"; roomId: string; fromKey: DemoUserKey; at: number }
  | { type: "decline"; roomId: string; fromKey: DemoUserKey; at: number }
  | { type: "end"; roomId: string; fromKey: DemoUserKey; at: number }
  | {
      type: "joined";
      roomId: string;
      isGroup: boolean;
      groupName?: string | null;
      participants: DemoUserKey[];
      at: number;
    }
  | { type: "peer_left"; roomId: string; fromKey: DemoUserKey; at: number };

export type WebRtcSignalEvent = {
  roomId: string;
  fromKey: DemoUserKey;
  payload: WebRtcSignalPayload;
  at: number;
};

const DEFAULT_SYNC_URL = "ws://localhost:8787";

function syncUrl(): string {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SYNC_URL) {
    return process.env.EXPO_PUBLIC_SYNC_URL;
  }
  return DEFAULT_SYNC_URL;
}

export type SyncStatus = "connecting" | "open" | "closed";

export function usePixelSync(userKey: DemoUserKey, enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<SyncStatus>(enabled ? "connecting" : "closed");
  const [room, setRoom] = useState<Room>(() => createSeedDmRoom());
  const roomRef = useRef(room);
  roomRef.current = room;
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [layout, setLayout] = useState<SyncedLayout | null>(null);
  const [layoutImportPending, setLayoutImportPending] =
    useState<LayoutImportPending | null>(null);
  const [layoutImportResolved, setLayoutImportResolved] =
    useState<LayoutImportResolved | null>(null);
  const [layoutResetPending, setLayoutResetPending] =
    useState<LayoutResetPending | null>(null);
  const [layoutResetResolved, setLayoutResetResolved] =
    useState<LayoutResetResolved | null>(null);
  const [peerTyping, setPeerTyping] = useState<Partial<Record<DemoUserKey, boolean>>>({});
  const [lastError, setLastError] = useState<string | null>(null);
  /** Chat events for notifications (includes messages while not in that room). */
  const [notifyChat, setNotifyChat] = useState<ChatLine | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callSignal, setCallSignal] = useState<CallSignal | null>(null);
  const [webrtcQueue, setWebrtcQueue] = useState<WebRtcSignalEvent[]>([]);
  const webrtcSeqRef = useRef(0);
  const joinedRoomRef = useRef<string | null>(null);
  const joinedMemberKeysRef = useRef<DemoUserKey[] | null>(null);
  const pendingSendRef = useRef<ClientToServer[]>([]);

  const send = useCallback((msg: ClientToServer) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return;
    }
    // Don't drop leave/join — queue until the socket is open again.
    if (
      msg.type === "leave_room" ||
      msg.type === "join_room" ||
      msg.type === "refresh_rooms" ||
      msg.type === "hello"
    ) {
      pendingSendRef.current.push(msg);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("closed");
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket;

    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(syncUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setStatus("open");
        ws.send(JSON.stringify({ type: "hello", userKey } satisfies ClientToServer));
        // Clear any ghost "active" leftovers from prior sessions / missed leaves.
        ws.send(JSON.stringify({ type: "refresh_rooms" } satisfies ClientToServer));
        const queued = pendingSendRef.current;
        pendingSendRef.current = [];
        for (const msg of queued) {
          if (msg.type === "hello") continue;
          ws.send(JSON.stringify(msg));
        }
        if (joinedRoomRef.current) {
          ws.send(
            JSON.stringify({
              type: "join_room",
              roomId: joinedRoomRef.current,
              ...(joinedMemberKeysRef.current
                ? { memberKeys: joinedMemberKeysRef.current }
                : {}),
            } satisfies ClientToServer),
          );
        }
      };

      ws.onmessage = (event) => {
        void (async () => {
          const data = JSON.parse(String(event.data)) as ServerToClient;
          if (data.type === "room_state") {
            // Ignore snapshots for rooms we are not currently joined to
            // (stale broadcasts after a hallway/room switch cause ghost "active").
            if (
              joinedRoomRef.current != null &&
              String(data.room.id) !== String(joinedRoomRef.current)
            ) {
              return;
            }
            if (joinedRoomRef.current == null) {
              return;
            }
            setRoom(data.room);
            const decrypted = await decryptChatLines(data.messages, userKey, data.room);
            if (cancelled) return;
            setMessages(decrypted);
            if (data.layout) {
              setLayout(data.layout);
            }
          } else if (data.type === "room_layout") {
            setLayout({
              document: data.document,
              rev: data.rev,
              fromUserKey: data.fromUserKey,
            });
          } else if (data.type === "layout_import_pending") {
            setLayoutImportPending({
              roomId: data.roomId,
              fromUserKey: data.fromUserKey,
              document: data.document,
              approvals: data.approvals,
              required: data.required,
            });
          } else if (data.type === "layout_import_resolved") {
            setLayoutImportPending(null);
            setLayoutImportResolved({
              roomId: data.roomId,
              status: data.status,
              fromUserKey: data.fromUserKey,
              byUserKey: data.byUserKey,
              document: data.document,
            });
          } else if (data.type === "layout_reset_pending") {
            setLayoutResetPending({
              roomId: data.roomId,
              fromUserKey: data.fromUserKey,
              approvals: data.approvals,
              required: data.required,
            });
          } else if (data.type === "layout_reset_resolved") {
            setLayoutResetPending(null);
            setLayoutResetResolved({
              roomId: data.roomId,
              status: data.status,
              fromUserKey: data.fromUserKey,
              byUserKey: data.byUserKey,
            });
          } else if (data.type === "peer_typing") {
            setPeerTyping((prev) => ({ ...prev, [data.userKey]: data.isTyping }));
          } else if (data.type === "chat") {
            const decrypted = await decryptChatLine(
              data.message,
              userKey,
              roomRef.current,
            );
            if (cancelled) return;
            if (joinedRoomRef.current === decrypted.roomId) {
              setMessages((prev) => [...prev, decrypted].slice(-200));
            }
            setPeerTyping((prev) => ({ ...prev, [decrypted.senderKey]: false }));
          } else if (data.type === "chat_notify") {
            const mode = data.message.envelope?.mode ?? "dm";
            const notifyRoom =
              joinedRoomRef.current === data.message.roomId && roomRef.current
                ? roomRef.current
                : roomStubForCrypto(
                    data.message.roomId,
                    data.memberKeys ?? [],
                    mode,
                  );
            const decrypted = await decryptChatLine(
              data.message,
              userKey,
              notifyRoom,
            );
            if (cancelled) return;
            setNotifyChat(decrypted);
          } else if (data.type === "call_invite") {
            setIncomingCall({
              roomId: data.roomId,
              fromKey: data.fromKey,
              fromName: data.fromName,
              isGroup: Boolean(data.isGroup),
              groupName: data.groupName ?? null,
              at: Date.now(),
            });
          } else if (data.type === "call_joined") {
            setCallSignal({
              type: "joined",
              roomId: data.roomId,
              isGroup: Boolean(data.isGroup),
              groupName: data.groupName ?? null,
              participants: data.participants ?? [],
              at: Date.now(),
            });
          } else if (data.type === "call_accept") {
            setCallSignal({
              type: "accept",
              roomId: data.roomId,
              fromKey: data.fromKey,
              at: Date.now(),
            });
          } else if (data.type === "call_decline") {
            setCallSignal({
              type: "decline",
              roomId: data.roomId,
              fromKey: data.fromKey,
              at: Date.now(),
            });
          } else if (data.type === "call_peer_left") {
            setCallSignal({
              type: "peer_left",
              roomId: data.roomId,
              fromKey: data.fromKey,
              at: Date.now(),
            });
          } else if (data.type === "call_end") {
            setCallSignal({
              type: "end",
              roomId: data.roomId,
              fromKey: data.fromKey,
              at: Date.now(),
            });
          } else if (data.type === "webrtc_signal") {
            // Queue every signal — ICE floods; a single state slot drops peers.
            webrtcSeqRef.current += 1;
            const seq = webrtcSeqRef.current;
            setWebrtcQueue((prev) => [
              ...prev,
              {
                roomId: data.roomId,
                fromKey: data.fromKey,
                payload: data.payload,
                at: seq,
              },
            ]);
          } else if (data.type === "error") {
            setLastError(data.message);
          }
        })();
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        retryTimer = setTimeout(connect, 1500);
      };
    };

    connect();

    // Tab close / background: leave so peers don't keep a ghost "active".
    const onPageHide = () => {
      const roomId = joinedRoomRef.current;
      if (!roomId) return;
      joinedRoomRef.current = null;
      joinedMemberKeysRef.current = null;
      try {
        wsRef.current?.send(
          JSON.stringify({ type: "leave_room", roomId } satisfies ClientToServer),
        );
      } catch {
        // ignore
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("beforeunload", onPageHide);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("beforeunload", onPageHide);
      }
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userKey, enabled]);

  const joinRoom = useCallback(
    (roomId: string, memberKeys?: DemoUserKey[]) => {
      const previous = joinedRoomRef.current;
      if (previous && previous !== roomId) {
        // Explicit leave so peers clear presence even if join fails/races.
        send({ type: "leave_room", roomId: previous });
      }
      joinedRoomRef.current = roomId;
      joinedMemberKeysRef.current = memberKeys ?? null;
      send({
        type: "join_room",
        roomId,
        ...(memberKeys && memberKeys.length > 0 ? { memberKeys } : {}),
      });
    },
    [send],
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      // Clear local join intent first so a reconnect cannot silently re-enter.
      if (joinedRoomRef.current === roomId) {
        joinedRoomRef.current = null;
        joinedMemberKeysRef.current = null;
      }
      send({ type: "leave_room", roomId });
      send({ type: "refresh_rooms" });
    },
    [send],
  );

  const sendChat = useCallback(
    async (roomId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        const envelope = await encryptChatText({
          text: trimmed,
          room: roomRef.current,
          selfKey: userKey,
        });
        send({ type: "chat", roomId, envelope });
      } catch (err) {
        setLastError(err instanceof Error ? err.message : "encrypt failed");
      }
    },
    [send, userKey],
  );

  const sendAction = useCallback(
    (roomId: string, action: ActionKind, targetName?: string | null) => {
      send({ type: "action", roomId, action, targetName });
    },
    [send],
  );

  const sendPresence = useCallback(
    (roomId: string, presence: PresenceState) => {
      send({ type: "presence", roomId, presence });
    },
    [send],
  );

  const sendRoomStyle = useCallback(
    (roomId: string, styleId: string) => {
      send({ type: "set_room_style", roomId, styleId });
    },
    [send],
  );

  const sendRoomLayout = useCallback(
    (roomId: string, document: RoomDocument) => {
      send({ type: "set_room_layout", roomId, document });
    },
    [send],
  );

  const proposeLayoutImport = useCallback(
    (roomId: string, document: RoomDocument) => {
      send({ type: "propose_layout_import", roomId, document });
    },
    [send],
  );

  const voteLayoutImport = useCallback(
    (roomId: string, approve: boolean) => {
      send({ type: "layout_import_vote", roomId, approve });
    },
    [send],
  );

  const cancelLayoutImport = useCallback(
    (roomId: string) => {
      send({ type: "cancel_layout_import", roomId });
    },
    [send],
  );

  const proposeLayoutReset = useCallback(
    (roomId: string) => {
      send({ type: "propose_layout_reset", roomId });
    },
    [send],
  );

  const voteLayoutReset = useCallback(
    (roomId: string, approve: boolean) => {
      send({ type: "layout_reset_vote", roomId, approve });
    },
    [send],
  );

  const cancelLayoutReset = useCallback(
    (roomId: string) => {
      send({ type: "cancel_layout_reset", roomId });
    },
    [send],
  );

  const sendPosition = useCallback(
    (roomId: string, x: number, y?: number) => {
      send({ type: "set_position", roomId, x, y });
    },
    [send],
  );

  const sendTyping = useCallback(
    (roomId: string, isTyping: boolean) => {
      send({ type: "typing", roomId, isTyping });
    },
    [send],
  );

  const sendCallInvite = useCallback(
    (roomId: string, targetKey?: DemoUserKey) => {
      send(
        targetKey
          ? { type: "call_invite", roomId, targetKey }
          : { type: "call_invite", roomId },
      );
    },
    [send],
  );

  const sendCallAccept = useCallback(
    (roomId: string) => {
      send({ type: "call_accept", roomId });
    },
    [send],
  );

  const sendCallDecline = useCallback(
    (roomId: string) => {
      send({ type: "call_decline", roomId });
    },
    [send],
  );

  const sendCallEnd = useCallback(
    (roomId: string) => {
      send({ type: "call_end", roomId });
    },
    [send],
  );

  const sendWebrtcSignal = useCallback(
    (roomId: string, targetKey: DemoUserKey, payload: WebRtcSignalPayload) => {
      send({ type: "webrtc_signal", roomId, targetKey, payload });
    },
    [send],
  );

  const clearWebrtcSignal = useCallback((at?: number | number[]) => {
    if (at == null) {
      setWebrtcQueue([]);
      return;
    }
    const drop = new Set(Array.isArray(at) ? at : [at]);
    setWebrtcQueue((prev) => prev.filter((s) => !drop.has(s.at)));
  }, []);

  return {
    status,
    room,
    messages,
    layout,
    layoutImportPending,
    layoutImportResolved,
    clearLayoutImportResolved: () => setLayoutImportResolved(null),
    layoutResetPending,
    layoutResetResolved,
    clearLayoutResetResolved: () => setLayoutResetResolved(null),
    peerTyping,
    lastError,
    notifyChat,
    incomingCall,
    callSignal,
    webrtcQueue,
    clearError: () => setLastError(null),
    clearIncomingCall: () => setIncomingCall(null),
    clearCallSignal: () => setCallSignal(null),
    clearWebrtcSignal,
    joinRoom,
    leaveRoom,
    sendChat,
    sendAction,
    sendPresence,
    sendRoomStyle,
    sendRoomLayout,
    proposeLayoutImport,
    voteLayoutImport,
    cancelLayoutImport,
    proposeLayoutReset,
    voteLayoutReset,
    cancelLayoutReset,
    sendPosition,
    sendTyping,
    sendCallInvite,
    sendCallAccept,
    sendCallDecline,
    sendCallEnd,
    sendWebrtcSignal,
  };
}
