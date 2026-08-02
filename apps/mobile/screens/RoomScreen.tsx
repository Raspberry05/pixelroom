import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  DEFAULT_HOTSPOTS,
  hotspotsWithFurnitureSeats,
  parseCommand,
  type ActionKind,
  type Appearance,
  type Room,
  type RoomId,
  type RoomStyleId,
} from "@pixelroom/core";
import { seatOffsetsBySprite } from "../data/spriteOverrides";
import { RoomPalette } from "../components/room/RoomPalette";
import { LayoutImportModal } from "../components/room/LayoutImportModal";
import { RoomStage } from "../components/room/RoomStage";
import { TopNav } from "../components/TopNav";
import { CallButton } from "../components/CallButton";
import { CallControls } from "../components/CallControls";
import { CallStatusBanner } from "../components/CallStatusBanner";
import type { CallState } from "../components/CallScreen";
import { DirtOverlay } from "../components/room/DirtOverlay";
import { CookingMiniGame } from "../components/minigames/CookingMiniGame";
import { FryingMiniGame } from "../components/minigames/FryingMiniGame";
import { CleaningMiniGame } from "../components/minigames/CleaningMiniGame";
import { TVWatchingMiniGame } from "../components/minigames/TVWatchingMiniGame";
import { BedMakingMiniGame } from "../components/minigames/BedMakingMiniGame";
import { PlantWateringMiniGame } from "../components/minigames/PlantWateringMiniGame";
import { IngredientSelector } from "../components/cooking/IngredientSelector";
import { DishResultModal } from "../components/cooking/DishResultModal";
import { hasAppliance, getApplianceName } from "../data/applianceRequirements";
import {
  calculateDirtLevel,
  type RoomCleanlinessState,
  type MiniGameType,
} from "../data/minigames";
import {
  bedIsMessy,
  plantNeedsWater,
  tvHasStatic,
  type FurnitureCareState,
} from "../data/furnitureCare";
import { GROCERY_ITEMS } from "../data/groceryItems";
import type { IngredientAmount, CookedDish } from "../data/recipes";
import { getRequiredAppliance } from "../data/recipes";
import {
  applyLayoutImport,
  applyLayoutReset,
  type ExpansionImportHold,
} from "../data/layoutImport";
import type {
  LayoutImportPending,
  LayoutImportResolved,
  LayoutResetPending,
  LayoutResetResolved,
} from "../sync/client";
import {
  actionUnlockHint,
  furnitureSpritesInRoom,
  isActionUnlocked,
} from "../data/actionUnlocks";
import {
  inventoryIdForSprite,
  inventoryIdForTile,
  getQty,
  refund,
  spend,
  type InventoryState,
} from "../data/inventory";
import {
  createDefaultRoomDocument,
  expandCostForSide,
  expandRoomLeft,
  expandRoomRight,
  FLOOR_DEPTH_CELLS,
  normalizeRoomDocument,
  shrinkRoomLeft,
  shrinkRoomRight,
  type EditTool,
  type ExpansionPurchase,
  type RoomDocument,
} from "../data/roomLayout";
import {
  createTestLabRoomDocument,
  isTestLabRoom,
} from "../data/testLab";
import { DEMO_USERS, isDemoUserKey, type DemoUserKey } from "../data/seed";
import { appearanceForUser } from "../data/appearanceStore";
import type { ChatLine } from "../sync/protocol";
import { colors, radii, space } from "../theme";
import {
  stackBubbleOpacity,
  trimBubbleStack,
} from "../lib/ephemeralBubble";

const HUD_BUBBLE_MAX = 3;
const HUD_BUBBLE_TICK_MS = 400;

const ACTION_CHIPS: { label: string; action: ActionKind; needsTarget?: boolean }[] = [
  { label: "*wave", action: "wave", needsTarget: true },
  { label: "*sit", action: "sit" },
  { label: "*cook", action: "cook" },
  { label: "*fry", action: "fry" },
  { label: "*clean", action: "clean" },
  { label: "*watch tv", action: "watch" },
  { label: "*make bed", action: "makebed" },
  { label: "*water plant", action: "water" },
  { label: "*hug", action: "hug", needsTarget: true },
  { label: "*dance", action: "dance" },
  { label: "*sing", action: "sing" },
];

function layoutStorageKey(roomId: RoomId): string {
  return `pixelroom.roomDoc.v4.${String(roomId)}`;
}

function loadDocument(roomId: RoomId): RoomDocument {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(layoutStorageKey(roomId));
      if (raw) {
        const saved = normalizeRoomDocument(JSON.parse(raw));
        if (isTestLabRoom(roomId) && saved.furniture.length === 0) {
          return createTestLabRoomDocument();
        }
        return saved;
      }
    } catch {
      // ignore
    }
  }
  if (isTestLabRoom(roomId)) return createTestLabRoomDocument();
  return createDefaultRoomDocument();
}

function saveDocument(roomId: RoomId, doc: RoomDocument) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(layoutStorageKey(roomId), JSON.stringify(doc));
    } catch {
      // ignore
    }
  }
}

type Props = {
  roomId: RoomId;
  selfKey: DemoUserKey;
  selfAppearance: Appearance;
  title: string;
  room: Room;
  /** Conversation members (for party avatars / actors when sync is still catching up). */
  memberKeys?: DemoUserKey[];
  messages: ChatLine[];
  inventory: InventoryState;
  onChangeInventory: (next: InventoryState) => void;
  coins: number;
  onChangeCoins: (next: number) => void;
  onBack: () => void;
  onOpenProfile: () => void;
  onJoin: (roomId: RoomId) => void;
  onLeave: (roomId: RoomId) => void;
  onSendChat: (text: string) => void;
  onSendAction: (action: ActionKind, targetName?: string | null) => void;
  onStartCall?: () => void;
  activeCall?: { callerName: string; callerKey: string } | null;
  callState?: CallState;
  callDuration?: number;
  isMuted?: boolean;
  isSpeakerOn?: boolean;
  micLevel?: number;
  hasRemoteAudio?: boolean;
  onEndCall?: () => void;
  onToggleMute?: () => void;
  onToggleSpeaker?: () => void;
  styleId?: RoomStyleId;
  /** Shared layout from sync server (both members edit this). */
  syncedLayout?: {
    document: RoomDocument;
    rev: number;
    fromUserKey?: DemoUserKey;
  } | null;
  onPublishLayout?: (document: RoomDocument) => void;
  onProposeLayoutImport?: (
    document: RoomDocument,
    expansionHold?: ExpansionImportHold,
  ) => void;
  onVoteLayoutImport?: (approve: boolean) => void;
  onCancelLayoutImport?: () => void;
  layoutImportPending?: LayoutImportPending | null;
  layoutImportResolved?: LayoutImportResolved | null;
  onClearLayoutImportResolved?: () => void;
  onProposeLayoutReset?: () => void;
  onVoteLayoutReset?: (approve: boolean) => void;
  onCancelLayoutReset?: () => void;
  layoutResetPending?: LayoutResetPending | null;
  layoutResetResolved?: LayoutResetResolved | null;
  onClearLayoutResetResolved?: () => void;
  onMoveSelf?: (x: number) => void;
  onTyping?: (isTyping: boolean) => void;
  peerTyping?: { userKey: DemoUserKey; name: string } | null;
  roomCleanliness: RoomCleanlinessState;
  onCleanRoom: () => void;
  furnitureCare: FurnitureCareState;
  onTendFurniture: (kind: "plant" | "bed" | "tv") => void;
};

export function RoomScreen({
  roomId,
  selfKey,
  selfAppearance,
  title,
  room,
  memberKeys,
  messages,
  inventory,
  onChangeInventory,
  coins,
  onChangeCoins,
  onBack,
  onOpenProfile,
  onJoin,
  onLeave,
  onSendChat,
  onSendAction,
  onStartCall,
  activeCall,
  callState = "ended",
  callDuration = 0,
  isMuted = false,
  isSpeakerOn = false,
  micLevel = 0,
  hasRemoteAudio = false,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  styleId,
  syncedLayout = null,
  onPublishLayout,
  onProposeLayoutImport,
  onVoteLayoutImport,
  onCancelLayoutImport,
  layoutImportPending = null,
  layoutImportResolved = null,
  onClearLayoutImportResolved,
  onProposeLayoutReset,
  onVoteLayoutReset,
  onCancelLayoutReset,
  layoutResetPending = null,
  layoutResetResolved = null,
  onClearLayoutResetResolved,
  onMoveSelf,
  onTyping,
  peerTyping = null,
  roomCleanliness,
  onCleanRoom,
  furnitureCare,
  onTendFurniture,
}: Props) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [showLayoutImport, setShowLayoutImport] = useState(false);
  const [tool, setTool] = useState<EditTool>({ kind: "move" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [document, setDocument] = useState<RoomDocument>(() => loadDocument(roomId));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameType | null>(null);
  const [selectedFurnitureForAction, setSelectedFurnitureForAction] = useState<string | null>(null);
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);
  const [cookingMode, setCookingMode] = useState<"cook" | "fry">("cook");
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientAmount[]>([]);
  const [cookedDish, setCookedDish] = useState<CookedDish | null>(null);
  const peerKey =
    memberKeys?.find((k) => k !== selfKey) ??
    (selfKey === "alice" ? "bob" : "alice");
  const appliedRevRef = useRef(0);
  const ignorePublishRef = useRef(false);
  /** Layout at propose/pending time — refunds still work if sync clears the room first. */
  const resetSnapshotRef = useRef<RoomDocument | null>(null);
  /** Expansion coins held while a dual-consent import awaits approval. */
  const importExpansionHoldRef = useRef<ExpansionImportHold | null>(null);
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const publishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededServerRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const [visibleUserKeys, setVisibleUserKeys] = useState<string[]>([]);
  const [bodyVisibleUserKeys, setBodyVisibleUserKeys] = useState<string[]>([]);
  const [hudNow, setHudNow] = useState(() => Date.now());
  const lastSpeakAtRef = useRef(0);

  // Users whose in-world head-chat is fully readable (HUD should hide for them).
  // Edge / half-visible speakers still get bottom HUD bubbles.
  const chatVisibleSet = useMemo(() => {
    if (editing) return new Set<string>();
    return new Set(visibleUserKeys);
  }, [editing, visibleUserKeys]);

  const hudFeed = useMemo(() => {
    const newestFirst: ChatLine[] = [];
    for (
      let i = messages.length - 1;
      i >= 0 && newestFirst.length < HUD_BUBBLE_MAX;
      i -= 1
    ) {
      const line = messages[i];
      if (!line || line.kind === "system") continue;
      const sender = isDemoUserKey(line.senderKey)
        ? DEMO_USERS[line.senderKey]
        : undefined;
      const member = sender
        ? room.memberState[String(sender.character.id)]
        : undefined;
      // Offline users: no HUD bubbles (not the same as "off-screen online").
      if (!member || member.presence === "sleeping") continue;
      // Hide HUD only when that speaker's character + overhead bubble are fully readable.
      if (chatVisibleSet.has(line.senderKey)) continue;
      newestFirst.push(line);
    }
    // Nearest stay solid; only oldest fades out / gets trimmed.
    return trimBubbleStack(newestFirst, hudNow, HUD_BUBBLE_MAX).reverse();
  }, [messages, chatVisibleSet, room.memberState, hudNow]);

  useEffect(() => {
    if (hudFeed.length === 0) return;
    setHudNow(Date.now());
    const id = setInterval(() => setHudNow(Date.now()), HUD_BUBBLE_TICK_MS);
    return () => clearInterval(id);
  }, [hudFeed.length, messages[messages.length - 1]?.id]);

  const showPeerTyping = (() => {
    if (!peerTyping) return false;
    if (chatVisibleSet.has(peerTyping.userKey)) return false;
    const sender = DEMO_USERS[peerTyping.userKey];
    const member = sender
      ? room.memberState[String(sender.character.id)]
      : undefined;
    return member?.presence === "active";
  })();

  // Earn coins while actively chatting in a room.
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last || last.kind === "system") return;
    lastSpeakAtRef.current = Date.now();
  }, [messages]);

  useEffect(() => {
    const SPEAK_INTERVAL_MS = 30_000;
    const SPEAK_REWARD = 6;
    const SPEAK_WINDOW_MS = 90_000;
    const timer = setInterval(() => {
      if (Date.now() - lastSpeakAtRef.current > SPEAK_WINDOW_MS) return;
      const next = coinsRef.current + SPEAK_REWARD;
      coinsRef.current = next;
      onChangeCoins(next);
      setStatus(`+${SPEAK_REWARD}c for chatting`);
    }, SPEAK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [onChangeCoins]);

  function setDraftAndTyping(text: string) {
    setDraft(text);
    if (!onTyping) return;
    if (text.trim().length > 0) {
      if (!typingSentRef.current) {
        typingSentRef.current = true;
        onTyping(true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        typingSentRef.current = false;
        onTyping(false);
      }, 1600);
    } else if (typingSentRef.current) {
      typingSentRef.current = false;
      onTyping(false);
    }
  }

  useEffect(() => {
    setDocument(loadDocument(roomId));
    setSavedAt(null);
    setStatus(null);
    appliedRevRef.current = 0;
    seededServerRef.current = false;
  }, [roomId]);

  // Apply remote shared layout whenever the peer (or join snapshot) updates it.
  useEffect(() => {
    if (!syncedLayout) return;
    if (syncedLayout.rev <= appliedRevRef.current) return;
    appliedRevRef.current = syncedLayout.rev;
    // Echo of our own publish — only advance rev, don't clobber local edits.
    if (syncedLayout.fromUserKey === selfKey) return;
    ignorePublishRef.current = true;
    setDocument(normalizeRoomDocument(syncedLayout.document));
    setSavedAt(Date.now());
    queueMicrotask(() => {
      ignorePublishRef.current = false;
    });
  }, [syncedLayout, selfKey]);

  function refundImportExpansionHold() {
    const hold = importExpansionHoldRef.current;
    importExpansionHoldRef.current = null;
    if (!hold || hold.cost <= 0) return;
    onChangeCoins(coinsRef.current + hold.cost);
  }

  // Dual-consent layout import finished.
  useEffect(() => {
    if (!layoutImportResolved) return;
    if (layoutImportResolved.roomId !== String(roomId)) {
      onClearLayoutImportResolved?.();
      return;
    }
    if (layoutImportResolved.status === "applied" && layoutImportResolved.document) {
      const incoming = normalizeRoomDocument(layoutImportResolved.document);
      if (layoutImportResolved.fromUserKey === selfKey) {
        const hold = importExpansionHoldRef.current;
        importExpansionHoldRef.current = null;
        // Proposer spends inventory now that everyone approved; held expansion
        // coins were already deducted and commit into expansionPurchases.
        const result = applyLayoutImport(inventory, document, incoming, {
          expansionHold: hold ?? undefined,
        });
        ignorePublishRef.current = true;
        if ("error" in result) {
          if (hold && hold.cost > 0) {
            onChangeCoins(coinsRef.current + hold.cost);
          }
          setStatus(result.error);
          setDocument(incoming);
        } else {
          onChangeInventory(result.inventory);
          setDocument(result.document);
          setStatus(
            hold && hold.cost > 0
              ? `Layout imported (−${hold.cost}c expansions, room approved)`
              : "Layout imported (room approved)",
          );
        }
        queueMicrotask(() => {
          ignorePublishRef.current = false;
        });
      } else {
        ignorePublishRef.current = true;
        setDocument(incoming);
        setStatus(
          `${DEMO_USERS[layoutImportResolved.fromUserKey]?.character.displayName ?? "Peer"}'s layout import was approved`,
        );
        queueMicrotask(() => {
          ignorePublishRef.current = false;
        });
      }
      setShowLayoutImport(false);
    } else if (layoutImportResolved.status === "declined") {
      if (layoutImportResolved.fromUserKey === selfKey) {
        refundImportExpansionHold();
      }
      const by = layoutImportResolved.byUserKey
        ? DEMO_USERS[layoutImportResolved.byUserKey]?.character.displayName
        : "Someone";
      setStatus(`${by ?? "Someone"} declined the layout import`);
    } else if (layoutImportResolved.status === "cancelled") {
      if (layoutImportResolved.fromUserKey === selfKey) {
        refundImportExpansionHold();
      }
      setStatus("Layout import cancelled");
    }
    onClearLayoutImportResolved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on resolved event
  }, [layoutImportResolved]);

  // Capture room state while a reset vote is open (before sync clears layout).
  useEffect(() => {
    if (layoutResetPending) {
      if (!resetSnapshotRef.current) {
        resetSnapshotRef.current = document;
      }
      return;
    }
    if (!layoutResetResolved) {
      resetSnapshotRef.current = null;
    }
  }, [layoutResetPending, layoutResetResolved, document]);

  // Dual-consent layout reset finished.
  useEffect(() => {
    if (!layoutResetResolved) return;
    if (layoutResetResolved.roomId !== String(roomId)) {
      onClearLayoutResetResolved?.();
      return;
    }
    if (layoutResetResolved.status === "applied") {
      const fresh = isTestLabRoom(roomId)
        ? createTestLabRoomDocument()
        : createDefaultRoomDocument();
      const prior = resetSnapshotRef.current ?? document;
      resetSnapshotRef.current = null;
      const result = applyLayoutReset(
        inventory,
        coins,
        prior,
        fresh,
        selfKey,
        { isProposer: layoutResetResolved.fromUserKey === selfKey },
      );
      ignorePublishRef.current = true;
      onChangeInventory(result.inventory);
      onChangeCoins(result.coins);
      setDocument(result.document);
      setSelectedId(null);
      setTool({ kind: "move" });
      setStatus(
        result.expansionRefund > 0
          ? `Room reset (+${result.expansionRefund}c expansions refunded)`
          : "Room reset (room approved)",
      );
      queueMicrotask(() => {
        ignorePublishRef.current = false;
      });
    } else if (layoutResetResolved.status === "declined") {
      resetSnapshotRef.current = null;
      const by = layoutResetResolved.byUserKey
        ? DEMO_USERS[layoutResetResolved.byUserKey]?.character.displayName
        : "Someone";
      setStatus(`${by ?? "Someone"} declined the room reset`);
    } else if (layoutResetResolved.status === "cancelled") {
      resetSnapshotRef.current = null;
      setStatus("Room reset cancelled");
    }
    onClearLayoutResetResolved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on resolved event
  }, [layoutResetResolved]);

  // Persist locally + broadcast to the other member (debounced for paint storms).
  useEffect(() => {
    saveDocument(roomId, document);
    setSavedAt(Date.now());
    if (!onPublishLayout || ignorePublishRef.current) return;
    // Don't fight a dual-consent import/reset with live edit publishes.
    if (layoutImportPending || layoutResetPending) return;
    if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
    publishTimerRef.current = setTimeout(() => {
      onPublishLayout(document);
    }, 60);
    return () => {
      if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
    };
  }, [roomId, document, onPublishLayout, layoutImportPending, layoutResetPending]);

  // If the server has no layout yet, seed it from this client's cache once.
  useEffect(() => {
    if (!onPublishLayout || seededServerRef.current) return;
    if (syncedLayout != null && syncedLayout.rev > 0) {
      seededServerRef.current = true;
      return;
    }
    // Give join a moment to deliver room_state; then push local if still empty.
    const t = setTimeout(() => {
      if (seededServerRef.current) return;
      if (appliedRevRef.current > 0) {
        seededServerRef.current = true;
        return;
      }
      seededServerRef.current = true;
      onPublishLayout(document);
    }, 400);
    return () => clearTimeout(t);
  }, [onPublishLayout, syncedLayout, document]);

  useEffect(() => {
    const id = roomId;
    onJoin(id);
    return () => onLeave(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join/leave tied to room identity only
  }, [roomId]);

  useEffect(() => {
    if (!editing) {
      setTool({ kind: "move" });
      setSelectedId(null);
      setStatus(null);
    }
  }, [editing]);

  const actors = useMemo(() => {
    // Prefer live room membership (both people in a DM). memberKeys is for
    // hallway avatars and can be peer-only — never let that hide roommates.
    const fromRoom = (Object.keys(DEMO_USERS) as DemoUserKey[]).filter((k) =>
      room.memberIds.some((id) => id === DEMO_USERS[k].character.id),
    );
    const fromConvo = (memberKeys ?? []).filter((k) => k === selfKey || isDemoUserKey(k));
    const merged = Array.from(new Set<DemoUserKey>([...fromRoom, ...fromConvo]));
    const resolved =
      merged.length > 0
        ? merged
        : ([selfKey] as DemoUserKey[]);
    return resolved.map((key) => ({
      characterId: DEMO_USERS[key].character.id,
      name: selfKey === key ? "You" : DEMO_USERS[key].character.displayName,
      appearance:
        selfKey === key ? selfAppearance : appearanceForUser(key),
      isSelf: selfKey === key,
      userKey: key,
    }));
  }, [memberKeys, room.memberIds, selfKey, selfAppearance]);

  const bubblesByUserKey = useMemo(() => {
    const map: Record<
      string,
      { id: string; text: string; kind: "text" | "action" | "system"; at: number }[]
    > = {};
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const line = messages[i];
      if (!line || line.kind === "system") continue;
      const list = map[line.senderKey] ?? [];
      if (list.length >= 4) continue;
      list.push({
        id: line.id,
        text: line.text,
        kind: line.kind,
        at: line.at,
      });
      map[line.senderKey] = list;
    }
    return map;
  }, [messages]);

  const activeCount = Object.values(room.memberState).filter((m) => m.presence === "active")
    .length;

  /** Prefer DevTools sit offsets locally when rebuilding chair hotspots. */
  const roomForPlay = useMemo((): Room => {
    const offsets = seatOffsetsBySprite();
    if (Object.keys(offsets).length === 0) return room;
    return {
      ...room,
      hotspots: hotspotsWithFurnitureSeats(
        DEFAULT_HOTSPOTS,
        document.furniture.map((f) => ({
          id: f.id,
          sprite: f.sprite,
          gx: f.gx,
          gy: f.gy,
          packed: f.packed,
        })),
        FLOOR_DEPTH_CELLS,
        offsets,
      ),
    };
  }, [room, document.furniture]);

  const isOnCall = callState === "calling" || callState === "ringing" || callState === "connected";
  
  // Calculate dirt level based on last activity time
  const currentDirtLevel = useMemo(() => {
    return calculateDirtLevel(roomCleanliness.lastActivityAt);
  }, [roomCleanliness.lastActivityAt]);
  
  const needsCleaning = currentDirtLevel >= 2;

  const placedSprites = useMemo(() => furnitureSpritesInRoom(document), [document]);

  const savedLabel =
    savedAt == null ? "…" : `Saved ${new Date(savedAt).toLocaleTimeString()}`;

  const bodyVisibleSet = useMemo(
    () => new Set(bodyVisibleUserKeys),
    [bodyVisibleUserKeys],
  );

  function trySendAction(action: ActionKind, targetName?: string | null) {
    // Handle cleaning action specially - trigger mini-game instead of animation
    if (action === "clean") {
      if (currentDirtLevel >= 2) {
        setActiveMiniGame("cleaning");
        onSendAction(action, targetName);
      } else {
        setStatus("Room is already clean! ✨");
        setTimeout(() => setStatus(null), 2000);
      }
      return;
    }

    // Handle cooking action specially - show ingredient selector first
    if (action === "cook") {
      if (!isActionUnlocked(action, placedSprites)) {
        setStatus(actionUnlockHint(action) ?? `Need furniture for *${action}`);
        return;
      }
      setCookingMode("cook");
      setShowIngredientSelector(true);
      onSendAction(action, targetName);
      return;
    }

    // Handle frying action specially - show ingredient selector first
    if (action === "fry") {
      if (!hasAppliance(document, "fryer")) {
        setStatus("Need a Deep Fryer to fry food! 🍟");
        setTimeout(() => setStatus(null), 3000);
        return;
      }
      setCookingMode("fry");
      setShowIngredientSelector(true);
      onSendAction(action, targetName);
      return;
    }

    if (action === "watch") {
      if (!isActionUnlocked(action, placedSprites)) {
        setStatus(actionUnlockHint(action) ?? "Place a TV to watch");
        return;
      }
      setActiveMiniGame("tv");
      onSendAction(action, targetName);
      return;
    }

    if (action === "makebed") {
      if (!isActionUnlocked(action, placedSprites)) {
        setStatus(actionUnlockHint(action) ?? "Place a bed to make");
        return;
      }
      setActiveMiniGame("bedmaking");
      onSendAction(action, targetName);
      return;
    }

    if (action === "water") {
      if (!isActionUnlocked(action, placedSprites)) {
        setStatus(actionUnlockHint(action) ?? "Place a plant to water");
        return;
      }
      setActiveMiniGame("watering");
      onSendAction(action, targetName);
      return;
    }

    if (!isActionUnlocked(action, placedSprites)) {
      setStatus(actionUnlockHint(action) ?? `Need furniture for *${action}`);
      return;
    }

    // Social: never teleport across the room to talk. Closing the gap happens
    // only while the peer stays body-visible and self stays in the camera
    // comfort band (RoomStage). Off-screen targets get a face/action only.
    const chip = ACTION_CHIPS.find((c) => c.action === action);
    if (chip?.needsTarget && targetName) {
      const targetActor = actors.find(
        (a) =>
          !a.isSelf &&
          a.name.toLowerCase() === targetName.trim().toLowerCase(),
      );
      if (targetActor && !bodyVisibleSet.has(targetActor.userKey)) {
        setStatus(`${targetActor.name} isn’t on your screen`);
        setTimeout(() => setStatus(null), 2200);
        onSendAction(action, targetName);
        return;
      }
    }

    setStatus(null);
    onSendAction(action, targetName);
  }

  function submit() {
    const text = draft.trim();
    if (!text) return;
    if (typingSentRef.current) {
      typingSentRef.current = false;
      onTyping?.(false);
    }
    const command = parseCommand(text);
    if (command) {
      trySendAction(command.action, command.targetName);
    } else {
      onSendChat(text);
    }
    setDraft("");
  }

  function deleteSelected() {
    if (!selectedId) return;
    const furn = document.furniture.find((p) => p.id === selectedId);
    if (furn) {
      const invId = inventoryIdForSprite(furn.sprite);
      setDocument((prev) => ({
        ...prev,
        furniture: prev.furniture.filter((p) => p.id !== selectedId),
      }));
      if (invId) onChangeInventory(refund(inventory, invId));
      setSelectedId(null);
      setStatus(null);
      return;
    }
    const win = document.windows.find((w) => w.id === selectedId);
    if (win) {
      setDocument((prev) => ({
        ...prev,
        windows: prev.windows.filter((w) => w.id !== selectedId),
      }));
      onChangeInventory(refund(inventory, "window_basic"));
      setSelectedId(null);
      setStatus(null);
    }
  }

  function applyLocalReset() {
    const fresh = isTestLabRoom(roomId)
      ? createTestLabRoomDocument()
      : createDefaultRoomDocument();
    const result = applyLayoutReset(
      inventory,
      coins,
      document,
      fresh,
      selfKey,
      { isProposer: true },
    );
    ignorePublishRef.current = true;
    onChangeInventory(result.inventory);
    onChangeCoins(result.coins);
    setDocument(result.document);
    setSelectedId(null);
    setTool({ kind: "move" });
    setStatus(
      result.expansionRefund > 0
        ? `Room reset (+${result.expansionRefund}c expansions refunded)`
        : "Room reset",
    );
    queueMicrotask(() => {
      ignorePublishRef.current = false;
    });
  }

  function resetLayout() {
    const members = memberKeys?.length ?? 0;
    if (onProposeLayoutReset && members >= 2) {
      if (layoutImportPending || layoutResetPending) {
        setStatus("Finish or cancel the pending layout change first");
        return;
      }
      resetSnapshotRef.current = document;
      onProposeLayoutReset();
      setStatus("Reset proposed — waiting for everyone to approve");
      return;
    }
    applyLocalReset();
  }

  function requestExpand(side: "left" | "right") {
    const already =
      side === "left" ? document.expansionsLeft : document.expansionsRight;
    const cost = expandCostForSide(already);
    if (coins < cost) {
      setStatus(`Need ${cost}c to expand (have ${coins}c)`);
      return;
    }
    const next =
      side === "left" ? expandRoomLeft(document) : expandRoomRight(document);
    if (
      next.expansionsLeft === document.expansionsLeft &&
      next.expansionsRight === document.expansionsRight
    ) {
      setStatus("Max expansions on that side");
      return;
    }
    const purchase: ExpansionPurchase = {
      side,
      index: already,
      cost,
      byUserKey: selfKey,
    };
    onChangeCoins(coins - cost);
    setDocument({
      ...next,
      expansionPurchases: [...(document.expansionPurchases ?? []), purchase],
    });
    setStatus(`Expanded ${side} (−${cost}c)`);
  }

  function requestShrink(side: "left" | "right") {
    const result =
      side === "left" ? shrinkRoomLeft(document) : shrinkRoomRight(document);
    if (!result) {
      setStatus(`No ${side} expansion to refund`);
      return;
    }
    let nextInv = inventory;
    for (const piece of result.removedFurniture) {
      const invId = inventoryIdForSprite(piece.sprite);
      if (invId) nextInv = refund(nextInv, invId);
    }
    for (const _win of result.removedWindows) {
      nextInv = refund(nextInv, "window_basic");
    }
    if (result.removedFloorTiles > 0) {
      nextInv = refund(
        nextInv,
        inventoryIdForTile("floor"),
        result.removedFloorTiles,
      );
    }
    if (result.removedWallTiles > 0) {
      nextInv = refund(
        nextInv,
        inventoryIdForTile("wall"),
        result.removedWallTiles,
      );
    }
    onChangeInventory(nextInv);
    onChangeCoins(coins + result.refundCoins);
    setDocument(result.document);
    setSelectedId(null);
    const n =
      result.removedFurniture.length +
      result.removedWindows.length +
      result.removedFloorTiles +
      result.removedWallTiles;
    setStatus(
      n > 0
        ? `Refunded ${side} expansion (+${result.refundCoins}c) · ${n} items back to inventory`
        : `Refunded ${side} expansion (+${result.refundCoins}c)`,
    );
  }

  function handleIngredientsSelected(ingredients: IngredientAmount[]) {
    // Check if user has required appliance for this recipe (only for cook mode)
    if (cookingMode === "cook") {
      const requiredAppliance = getRequiredAppliance(ingredients);

      if (requiredAppliance && !hasAppliance(document, requiredAppliance)) {
        setShowIngredientSelector(false);
        setStatus(`Need a ${getApplianceName(requiredAppliance)} to cook this! 🍳`);
        setTimeout(() => setStatus(null), 3000);
        return;
      }
    }

    // Deduct ingredients from inventory
    let newInventory = inventory;
    for (const ing of ingredients) {
      const spent = spend(newInventory, ing.ingredientId, ing.amount);
      if (spent) {
        newInventory = spent;
      }
    }
    onChangeInventory(newInventory);

    // Save selected ingredients and start appropriate mini-game
    setSelectedIngredients(ingredients);
    setShowIngredientSelector(false);
    setActiveMiniGame(cookingMode === "fry" ? "frying" : "cooking");
  }

  function handleIngredientSelectorCancel() {
    setShowIngredientSelector(false);
    setSelectedFurnitureForAction(null);
  }

  function handleMiniGameComplete(dish?: CookedDish) {
    const finished = activeMiniGame;
    setActiveMiniGame(null);
    setSelectedFurnitureForAction(null);

    if (finished === "cleaning") {
      onCleanRoom();
      setStatus("Room cleaned! ✨");
      setTimeout(() => setStatus(null), 2000);
    } else if ((finished === "cooking" || finished === "frying") && dish) {
      setCookedDish(dish);
    } else if (finished === "watering") {
      onTendFurniture("plant");
      setStatus("Plant watered! 🌱");
      setTimeout(() => setStatus(null), 2000);
    } else if (finished === "bedmaking") {
      onTendFurniture("bed");
      setStatus("Bed made! 🛏️");
      setTimeout(() => setStatus(null), 2000);
    } else if (finished === "tv") {
      onTendFurniture("tv");
      setStatus("TV tuned in! 📺");
      setTimeout(() => setStatus(null), 2000);
    }

    setSelectedIngredients([]);
  }

  function handleMiniGameCancel() {
    setActiveMiniGame(null);
    setSelectedFurnitureForAction(null);
    setSelectedIngredients([]);
  }

  function handleDishResultClose() {
    setCookedDish(null);
  }
  
  // Get available ingredients for selector
  const availableIngredients: Record<string, number> = {};
  for (const item of GROCERY_ITEMS) {
    const qty = getQty(inventory, item.id);
    if (qty > 0) {
      availableIngredients[item.id] = qty;
    }
  }

  return (
    <View style={styles.flex}>
      {isOnCall && isSpeakerOn && activeCall && (
        <CallStatusBanner
          callerName={activeCall.callerName}
          duration={callDuration}
          callState={callState as "calling" | "ringing" | "connected"}
        />
      )}
      <TopNav
        title={title}
        subtitle={
          editing
            ? `Arrange · shared · ${coins}c · L${document.expansionsLeft}/R${document.expansionsRight}`
            : `${activeCount} active · live sim`
        }
        onBack={
          editing
            ? () => {
                setEditing(false);
                setSelectedId(null);
                setStatus(null);
              }
            : onBack
        }
        onTitlePress={editing ? undefined : onOpenProfile}
        right={
          <View style={styles.topNavRight}>
            {!editing && onStartCall ? (
              <CallButton onPress={onStartCall} />
            ) : null}
            <Pressable
              onPress={() => setEditing((v) => !v)}
              style={[styles.editBtn, editing && styles.editBtnOn]}
              accessibilityLabel={editing ? "Done arranging" : "Arrange room"}
              accessibilityRole="button"
            >
              <Text style={[styles.editBtnText, editing && styles.editBtnTextOn]}>
                {editing ? "✓" : "✎"}
              </Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.stageWrap}>
        <RoomStage
          room={roomForPlay}
          actors={actors}
          bubblesByUserKey={bubblesByUserKey}
          styleId={styleId}
          document={document}
          onChangeDocument={setDocument}
          inventory={inventory}
          onChangeInventory={onChangeInventory}
          onStatus={setStatus}
          editing={editing}
          tool={tool}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          onRequestExpand={requestExpand}
          onRequestShrink={requestShrink}
          onViewportCenterX={onMoveSelf}
          onVisibleUserKeys={setVisibleUserKeys}
          onBodyVisibleUserKeys={setBodyVisibleUserKeys}
          dirtLevel={currentDirtLevel}
          furnitureCare={furnitureCare}
        />
        {(hudFeed.length > 0 || showPeerTyping) && (
          <View style={styles.hudChatOverlay} pointerEvents="none">
            {hudFeed.map((line, index) => {
              const ageMs = Math.max(0, hudNow - line.at);
              const opacity = stackBubbleOpacity(ageMs, line.text, {
                isOldest: index === 0,
                stackCount: hudFeed.length,
              });
              if (opacity < 0.03) return null;
              const mine = line.senderKey === selfKey;
              const isAction = line.kind === "action";
              return (
                <View
                  key={line.id}
                  style={[
                    styles.hudBubbleRow,
                    mine ? styles.hudBubbleRowSelf : styles.hudBubbleRowPeer,
                  ]}
                >
                  <View
                    style={[
                      styles.hudBubble,
                      mine && styles.hudBubbleSelf,
                      isAction && styles.hudBubbleAction,
                      { opacity },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hudName,
                        isAction && styles.hudNameAction,
                      ]}
                    >
                      {mine ? "You" : line.senderName}
                    </Text>
                    <Text
                      style={[
                        styles.hudText,
                        isAction && styles.hudTextAction,
                      ]}
                    >
                      {line.text}
                    </Text>
                  </View>
                </View>
              );
            })}
            {showPeerTyping && peerTyping ? (
              <View style={styles.hudBubbleRowPeer}>
                <Text style={styles.typingHint}>
                  {peerTyping.name} is typing…
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.hudDock}>
        {editing ? (
          <RoomPalette
            tool={tool}
            onChangeTool={setTool}
            hasSelection={selectedId != null}
            document={document}
            inventory={inventory}
            savedLabel={savedLabel}
            status={status}
            onDeleteSelected={deleteSelected}
            onResetLayout={resetLayout}
            onImportLayout={() => setShowLayoutImport(true)}
            onToggleFloorFill={() => {
              setDocument((prev) => ({
                ...prev,
                floorFill: !prev.floorFill,
                floorTiles: {},
              }));
            }}
          />
        ) : (
          <View>
            {isOnCall &&
            isSpeakerOn &&
            activeCall &&
            onEndCall &&
            onToggleMute &&
            onToggleSpeaker ? (
              <CallControls
                duration={callDuration}
                callerName={activeCall.callerName}
                isMuted={isMuted}
                isSpeakerOn={isSpeakerOn}
                micLevel={micLevel}
                hasRemoteAudio={hasRemoteAudio}
                onToggleMute={onToggleMute}
                onToggleSpeaker={onToggleSpeaker}
                onEndCall={onEndCall}
              />
            ) : null}
            <View style={styles.hud}>
              {needsCleaning ? (
                <View style={styles.cleaningAlert}>
                  <Text style={styles.cleaningAlertText}>
                    🧹 Room is dirty! Use *clean to tidy up
                  </Text>
                </View>
              ) : null}
              {plantNeedsWater(furnitureCare) ? (
                <View style={styles.cleaningAlert}>
                  <Text style={styles.cleaningAlertText}>
                    💧 Plant is thirsty! Use *water plant
                  </Text>
                </View>
              ) : null}
              {tvHasStatic(furnitureCare) ? (
                <View style={styles.cleaningAlert}>
                  <Text style={styles.cleaningAlertText}>
                    📡 TV has static! Use *watch tv
                  </Text>
                </View>
              ) : null}
              {bedIsMessy(furnitureCare) ? (
                <View style={styles.cleaningAlert}>
                  <Text style={styles.cleaningAlertText}>
                    🛏️ Bed is messy! Use *make bed
                  </Text>
                </View>
              ) : null}
              {status ? <Text style={styles.statusHint}>{status}</Text> : null}
              <ScrollView
                horizontal
                style={styles.chips}
                contentContainerStyle={styles.chipsContent}
                showsHorizontalScrollIndicator={false}
              >
                {ACTION_CHIPS.map((chip) => {
                  const unlocked = isActionUnlocked(chip.action, placedSprites);
                  return (
                    <Pressable
                      key={chip.label}
                      style={[styles.chip, !unlocked && styles.chipLocked]}
                      onPress={() =>
                        trySendAction(
                          chip.action,
                          chip.needsTarget
                            ? DEMO_USERS[peerKey].character.displayName
                            : null,
                        )
                      }
                      accessibilityState={{ disabled: !unlocked }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          !unlocked && styles.chipTextLocked,
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraftAndTyping}
                  placeholder="Message or *hug Bob"
                  placeholderTextColor={colors.inkFaint}
                  onSubmitEditing={submit}
                  returnKeyType="send"
                />
                <Pressable style={styles.send} onPress={submit}>
                  <Text style={styles.sendText}>Send</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      <LayoutImportModal
        visible={showLayoutImport}
        roomDocument={document}
        inventory={inventory}
        coins={coins}
        buyerKey={selfKey}
        onChangeDocument={setDocument}
        onChangeInventory={onChangeInventory}
        onChangeCoins={onChangeCoins}
        onClose={() => setShowLayoutImport(false)}
        onStatus={setStatus}
        onProposeImport={
          onProposeLayoutImport
            ? (doc, hold) => {
                importExpansionHoldRef.current = hold ?? null;
                onProposeLayoutImport(doc, hold);
              }
            : undefined
        }
        awaitingApprovals={
          layoutImportPending != null &&
          layoutImportPending.fromUserKey === selfKey
        }
        onCancelProposal={() => {
          refundImportExpansionHold();
          onCancelLayoutImport?.();
        }}
      />

      {layoutImportPending &&
      layoutImportPending.fromUserKey !== selfKey &&
      onVoteLayoutImport ? (
        <View style={styles.importConsent}>
          <Text style={styles.importConsentTitle}>
            {DEMO_USERS[layoutImportPending.fromUserKey]?.character.displayName ??
              "Peer"}{" "}
            wants to import a layout
          </Text>
          <Text style={styles.importConsentMeta}>
            {layoutImportPending.document.furniture?.length ?? 0} furniture · L
            {layoutImportPending.document.expansionsLeft ?? 0}/R
            {layoutImportPending.document.expansionsRight ?? 0} · Approvals{" "}
            {layoutImportPending.approvals.length}/
            {layoutImportPending.required.length}
          </Text>
          <View style={styles.importConsentActions}>
            <Pressable
              style={styles.importDeclineBtn}
              onPress={() => onVoteLayoutImport(false)}
            >
              <Text style={styles.importDeclineText}>Decline</Text>
            </Pressable>
            <Pressable
              style={styles.importApproveBtn}
              onPress={() => onVoteLayoutImport(true)}
            >
              <Text style={styles.importApproveText}>Approve</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {layoutResetPending &&
      layoutResetPending.fromUserKey === selfKey &&
      onCancelLayoutReset ? (
        <View style={styles.importConsent}>
          <Text style={styles.importConsentTitle}>
            Waiting for room to approve reset
          </Text>
          <Text style={styles.importConsentMeta}>
            Placed furniture returns to inventory · Bought wall spaces refund
            coins · Approvals {layoutResetPending.approvals.length}/
            {layoutResetPending.required.length}
          </Text>
          <View style={styles.importConsentActions}>
            <Pressable
              style={styles.importDeclineBtn}
              onPress={() => onCancelLayoutReset()}
            >
              <Text style={styles.importDeclineText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {layoutResetPending &&
      layoutResetPending.fromUserKey !== selfKey &&
      onVoteLayoutReset ? (
        <View style={styles.importConsent}>
          <Text style={styles.importConsentTitle}>
            {DEMO_USERS[layoutResetPending.fromUserKey]?.character.displayName ??
              "Peer"}{" "}
            wants to reset the room
          </Text>
          <Text style={styles.importConsentMeta}>
            Clears layout · Refunds expansions · Approvals{" "}
            {layoutResetPending.approvals.length}/
            {layoutResetPending.required.length}
          </Text>
          <View style={styles.importConsentActions}>
            <Pressable
              style={styles.importDeclineBtn}
              onPress={() => onVoteLayoutReset(false)}
            >
              <Text style={styles.importDeclineText}>Decline</Text>
            </Pressable>
            <Pressable
              style={styles.importApproveBtn}
              onPress={() => onVoteLayoutReset(true)}
            >
              <Text style={styles.importApproveText}>Approve</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Ingredient selector */}
      <IngredientSelector
        visible={showIngredientSelector}
        availableIngredients={availableIngredients}
        onConfirm={handleIngredientsSelected}
        onCancel={handleIngredientSelectorCancel}
      />

      {/* Mini-game modals */}
      <CleaningMiniGame
        visible={activeMiniGame === "cleaning"}
        dirtLevel={currentDirtLevel}
        onComplete={handleMiniGameComplete}
        onCancel={handleMiniGameCancel}
      />
      <CookingMiniGame
        visible={activeMiniGame === "cooking"}
        selectedIngredients={selectedIngredients}
        onComplete={handleMiniGameComplete}
        onCancel={handleMiniGameCancel}
      />
      <FryingMiniGame
        visible={activeMiniGame === "frying"}
        selectedIngredients={selectedIngredients}
        onComplete={handleMiniGameComplete}
        onCancel={handleMiniGameCancel}
      />
      <TVWatchingMiniGame
        visible={activeMiniGame === "tv"}
        onComplete={handleMiniGameComplete}
        onCancel={handleMiniGameCancel}
      />
      <BedMakingMiniGame
        visible={activeMiniGame === "bedmaking"}
        onComplete={handleMiniGameComplete}
        onCancel={handleMiniGameCancel}
      />
      <PlantWateringMiniGame
        visible={activeMiniGame === "watering"}
        onComplete={handleMiniGameComplete}
        onCancel={handleMiniGameCancel}
      />
      
      {/* Dish result modal */}
      <DishResultModal
        visible={cookedDish !== null}
        dish={cookedDish}
        onClose={handleDishResultClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  stageWrap: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  topNavRight: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
  },
  editBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.circle,
  },
  editBtnOn: {
    backgroundColor: colors.accent,
  },
  editBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  editBtnTextOn: {
    color: colors.surfaceRaised,
  },
  hudDock: {
    marginTop: -28,
    zIndex: 6,
    elevation: 6,
  },
  hud: {
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  /** Floats on the room scene — does not shrink/push the canvas. */
  hudChatOverlay: {
    position: "absolute",
    left: space.sm,
    right: space.sm,
    bottom: 36,
    zIndex: 5,
    elevation: 5,
    gap: 6,
    maxHeight: 280,
  },
  hudBubbleRow: {
    width: "100%",
    flexDirection: "row",
  },
  hudBubbleRowPeer: {
    justifyContent: "flex-start",
  },
  hudBubbleRowSelf: {
    justifyContent: "flex-end",
  },
  hudBubble: {
    maxWidth: "82%",
    backgroundColor: colors.bubble,
    borderRadius: radii.lg,
    borderBottomLeftRadius: radii.sm,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hudBubbleSelf: {
    backgroundColor: colors.bubbleSelf,
    borderColor: colors.accent,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
  },
  hudBubbleAction: {
    backgroundColor: colors.bubbleAction,
    borderColor: colors.action,
  },
  hudName: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  hudNameAction: {
    color: colors.action,
  },
  hudText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  hudTextAction: {
    fontStyle: "italic",
    color: colors.action,
  },
  typingHint: {
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "600",
    color: colors.inkMuted,
    backgroundColor: colors.bubble,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: {
    maxHeight: 48,
  },  chipsContent: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    marginRight: space.sm,
  },
  chipLocked: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    opacity: 0.55,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  chipTextLocked: { color: colors.inkFaint },
  cleaningAlert: {
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginHorizontal: space.md,
    marginBottom: space.sm,
    alignItems: "center",
  },
  cleaningAlertText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  statusHint: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted,
  },
  composer: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.ink,
    fontSize: 15,
  },
  send: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: space.lg,
    justifyContent: "center",
  },
  sendText: { color: colors.surfaceRaised, fontWeight: "700" },
  importConsent: {
    position: "absolute",
    left: space.md,
    right: space.md,
    top: 72,
    zIndex: 40,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    padding: space.md,
    gap: space.sm,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  importConsentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  importConsentMeta: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  importConsentActions: {
    flexDirection: "row",
    gap: space.sm,
  },
  importDeclineBtn: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  importDeclineText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  importApproveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  importApproveText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
});
