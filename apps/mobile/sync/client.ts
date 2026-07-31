import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionKind, PresenceState, Room } from "@pixelroom/core";
import type { RoomDocument } from "../data/roomLayout";
import { createSeedDmRoom, type DemoUserKey } from "../data/seed";
import type { ChatLine, ClientToServer, RoomLayoutPayload, ServerToClient } from "./protocol";

export type SyncedLayout = RoomLayoutPayload & {
  fromUserKey?: DemoUserKey;
};

const DEFAULT_SYNC_URL = "ws://localhost:8787";

function syncUrl(): string {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SYNC_URL) {
    return process.env.EXPO_PUBLIC_SYNC_URL;
  }
  return DEFAULT_SYNC_URL;
}

export type SyncStatus = "connecting" | "open" | "closed";

export function usePixelSync(userKey: DemoUserKey) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [room, setRoom] = useState<Room>(() => createSeedDmRoom());
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [layout, setLayout] = useState<SyncedLayout | null>(null);
  const [peerTyping, setPeerTyping] = useState<Partial<Record<DemoUserKey, boolean>>>({});
  const [lastError, setLastError] = useState<string | null>(null);
  const joinedRoomRef = useRef<string | null>(null);

  const send = useCallback((msg: ClientToServer) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
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
        if (joinedRoomRef.current) {
          ws.send(
            JSON.stringify({
              type: "join_room",
              roomId: joinedRoomRef.current,
            } satisfies ClientToServer),
          );
        }
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(String(event.data)) as ServerToClient;
        if (data.type === "room_state") {
          setRoom(data.room);
          setMessages(data.messages);
          if (data.layout) {
            setLayout(data.layout);
          }
        } else if (data.type === "room_layout") {
          setLayout({
            document: data.document,
            rev: data.rev,
            fromUserKey: data.fromUserKey,
          });
        } else if (data.type === "peer_typing") {
          setPeerTyping((prev) => ({ ...prev, [data.userKey]: data.isTyping }));
        } else if (data.type === "chat") {
          setMessages((prev) => [...prev, data.message].slice(-200));
          setPeerTyping((prev) => ({ ...prev, [data.message.senderKey]: false }));
        } else if (data.type === "error") {
          setLastError(data.message);
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        retryTimer = setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userKey]);

  const joinRoom = useCallback(
    (roomId: string) => {
      joinedRoomRef.current = roomId;
      send({ type: "join_room", roomId });
    },
    [send],
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      if (joinedRoomRef.current === roomId) {
        joinedRoomRef.current = null;
      }
      send({ type: "leave_room", roomId });
    },
    [send],
  );

  const sendChat = useCallback(
    (roomId: string, text: string) => {
      send({ type: "chat", roomId, text });
    },
    [send],
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

  return {
    status,
    room,
    messages,
    layout,
    peerTyping,
    lastError,
    clearError: () => setLastError(null),
    joinRoom,
    leaveRoom,
    sendChat,
    sendAction,
    sendPresence,
    sendRoomStyle,
    sendRoomLayout,
    sendPosition,
    sendTyping,
  };
}
