import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  asRoomId,
  type Appearance,
  type RoomId,
  type RoomStyleId,
} from "@pixelroom/core";
import { BottomTabs } from "./components/BottomTabs";
import { NewChatSheet } from "./components/NewChatSheet";
import { CallScreen, type CallState } from "./components/CallScreen";
import { NotificationBar, type Notification } from "./components/NotificationBar";
import {
  requestNotificationPermissions,
  sendLocalNotification,
} from "./services/notifications";
import { importAndMatchContacts } from "./services/contacts";
import {
  calculateDirtLevel,
  createCleanlinessState,
  type RoomCleanlinessState,
} from "./data/minigames";
import {
  createDirtyCleanlinessState,
  isTestLabRoom,
} from "./data/testLab";
import {
  createFurnitureCareState,
  createNeedyFurnitureCareState,
  type FurnitureCareState,
} from "./data/furnitureCare";
import { migrateAppearanceHats } from "./data/wardrobe";
import {
  isWebRtcVoiceSupported,
  WebRtcVoiceSession,
} from "./calls/webrtcVoice";
import {
  DEMO_USERS,
  contactsFor,
  dmRoomIdFor,
  getPeerKey,
  initialConversations,
  isDemoUserKey,
  partyRoomIdFor,
  resolveDemoUser,
  userIsRoomMember,
  type Contact,
  type ConversationPreview,
  type DemoUser,
  type DemoUserKey,
} from "./data/seed";
import {
  consumePlacedFromInventory,
  createStarterInventory,
  type InventoryState,
} from "./data/inventory";
import { initialNav, type StackScreen } from "./navigation/types";
import { HallwayScreen } from "./screens/HallwayScreen";
import { NewContactScreen } from "./screens/NewContactScreen";
import { NewPartyScreen } from "./screens/NewPartyScreen";
import { ProfileDetailScreen } from "./screens/ProfileDetailScreen";
import { RoomScreen } from "./screens/RoomScreen";
import { StoreScreen, loadCoins, saveCoins } from "./screens/StoreScreen";
import { YouScreen } from "./screens/YouScreen";
import { DevToolsScreen } from "./screens/DevToolsScreen";
import { IntroWizardScreen } from "./screens/IntroWizardScreen";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
  setUserQueryParam,
  type OnboardingProfile,
} from "./data/onboarding";
import {
  loadAppearance,
  saveAppearance,
} from "./data/appearanceStore";
import { usePixelSync } from "./sync/client";
import { colors } from "./theme";
import { preloadCharacterAssets } from "./data/sprites";

const INV_KEY = "pixelroom.inventory.v4";

function loadInventory(): InventoryState {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(INV_KEY);
      if (raw) return JSON.parse(raw) as InventoryState;
    } catch {
      // ignore
    }
  }
  // Fresh starter stock; default room only uses one window.
  return consumePlacedFromInventory(createStarterInventory(), [], 1);
}

function saveInventory(inv: InventoryState) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(INV_KEY, JSON.stringify(inv));
    } catch {
      // ignore
    }
  }
}

function ensureSharpPixelsOnWeb() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const id = "pixelroom-sharp-pixels";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    img, canvas {
      image-rendering: pixelated !important;
      image-rendering: crisp-edges !important;
    }
  `;
  document.head.appendChild(style);
}

/** `?user=` when present (multi-tab); otherwise null. */
function readUrlUserKey(): DemoUserKey | null {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("user");
    if (param == null || param === "") return null;
    return resolveDemoUser(param);
  }
  return null;
}

function demoUserFromBoot(
  userKey: DemoUserKey,
  profile: OnboardingProfile | null,
): DemoUser {
  const base = DEMO_USERS[userKey];
  const displayName =
    profile && profile.userKey === userKey
      ? profile.displayName
      : base.character.displayName;
  const phone =
    profile && profile.userKey === userKey ? profile.phone : base.phone;
  const country =
    profile && profile.userKey === userKey ? profile.country : base.country;
  const savedAppearance = loadAppearance(userKey);
  return {
    ...base,
    phone,
    country,
    character: {
      ...base.character,
      displayName,
      appearance: migrateAppearanceHats(
        savedAppearance ?? base.character.appearance,
      ),
    },
  };
}

function resolveInitialBoot(): {
  needsWizard: boolean;
  userKey: DemoUserKey;
  profile: OnboardingProfile | null;
} {
  const urlKey = readUrlUserKey();
  const profile = loadOnboardingProfile();
  if (urlKey) {
    return { needsWizard: false, userKey: urlKey, profile };
  }
  if (profile) {
    return { needsWizard: false, userKey: profile.userKey, profile };
  }
  return { needsWizard: true, userKey: "alice", profile: null };
}

export default function App() {
  useEffect(() => {
    ensureSharpPixelsOnWeb();
    preloadCharacterAssets();
    requestNotificationPermissions();
  }, []);

  const initialBoot = useMemo(() => resolveInitialBoot(), []);
  const [needsWizard, setNeedsWizard] = useState(initialBoot.needsWizard);
  const [userKey, setUserKey] = useState<DemoUserKey>(initialBoot.userKey);
  const [self, setSelf] = useState<DemoUser>(() =>
    demoUserFromBoot(initialBoot.userKey, initialBoot.profile),
  );
  const [contacts, setContacts] = useState<Contact[]>(() =>
    contactsFor(initialBoot.userKey),
  );
  const [conversations, setConversations] = useState<ConversationPreview[]>(() =>
    initialConversations(initialBoot.userKey),
  );
  const [nav, setNav] = useState(initialNav);
  const [inventory, setInventory] = useState<InventoryState>(() => loadInventory());
  const [coins, setCoins] = useState(() => loadCoins(500));
  const [ownedClothes, setOwnedClothes] = useState<string[]>(() => {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem("pixelroom.clothes.v1");
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          return parsed.map((id) =>
            id === "cloth_purple_pants" ? "cloth_purple_hat" : id,
          );
        }
      } catch {
        // ignore
      }
    }
    return ["cloth_red_tee", "cloth_blue_pants", "cloth_purple_hat"];
  });
  const sync = usePixelSync(userKey, !needsWizard);

  function completeOnboarding(profile: OnboardingProfile) {
    saveOnboardingProfile(profile);
    setUserQueryParam(profile.userKey);
    setUserKey(profile.userKey);
    setSelf(demoUserFromBoot(profile.userKey, profile));
    setContacts(contactsFor(profile.userKey));
    setConversations(initialConversations(profile.userKey));
    setNav(initialNav);
    setNeedsWizard(false);
  }
  
  // Call state
  const [callState, setCallState] = useState<CallState>("ended");
  const [callDuration, setCallDuration] = useState(0);
  const [activeCall, setActiveCall] = useState<{
    callerName: string;
    callerKey: DemoUserKey | string;
    roomId: string;
    isGroup?: boolean;
    subtitle?: string | null;
  } | null>(null);
  const [callIncoming, setCallIncoming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastNotifyMsgId = useRef<string | null>(null);
  const lastIncomingCallAt = useRef<number>(0);
  const lastCallSignalAt = useRef<number>(0);
  const voiceRef = useRef<WebRtcVoiceSession | null>(null);
  const mutedRef = useRef(false);
  const sendWebrtcRef = useRef(sync.sendWebrtcSignal);
  sendWebrtcRef.current = sync.sendWebrtcSignal;
  
  // Notification state
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Room cleanliness state (per room)
  const [roomCleanliness, setRoomCleanliness] = useState<Record<string, RoomCleanlinessState>>({});
  const [furnitureCare, setFurnitureCare] = useState<Record<string, FurnitureCareState>>({});

  useEffect(() => {
    if (callState !== "connected") {
      setMicLevel(0);
      setHasRemoteAudio(false);
      return;
    }
    const id = setInterval(() => {
      const session = voiceRef.current;
      if (!session) {
        setMicLevel(0);
        setHasRemoteAudio(false);
        return;
      }
      setMicLevel(session.getMicLevel());
      setHasRemoteAudio(session.hasRemoteAudio());
    }, 100);
    return () => clearInterval(id);
  }, [callState]);

  useEffect(() => {
    saveInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    saveCoins(coins);
  }, [coins]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("pixelroom.clothes.v1", JSON.stringify(ownedClothes));
      } catch {
        // ignore
      }
    }
  }, [ownedClothes]);

  useEffect(() => {
    saveAppearance(userKey, self.character.appearance);
  }, [userKey, self.character.appearance]);

  const top = nav.stack[nav.stack.length - 1] ?? { name: "tabs" as const };
  const selfCharacterId = DEMO_USERS[userKey].character.id;
  const activeRoomId = top.name === "room" ? String(top.roomId) : null;

  useEffect(() => {
    const last = sync.notifyChat;
    if (!last || last.kind === "system") return;
    if (last.senderKey === userKey) return;
    if (lastNotifyMsgId.current === last.id) return;
    lastNotifyMsgId.current = last.id;

    const decryptFailed =
      last.text === "[unable to decrypt]" || last.text === "[encrypted]";
    const body = decryptFailed ? "New encrypted message" : last.text;

    setNotification({
      id: last.id,
      title: last.senderName,
      body,
      timestamp: Date.now(),
      type: "message",
      onPress: () => {
        openRoom(asRoomId(last.roomId));
      },
    });

    // OS toast only when backgrounded; never for failed decrypt placeholders.
    if (!decryptFailed) {
      void sendLocalNotification({
        title: last.senderName,
        body,
        data: { roomId: String(last.roomId), messageId: last.id, id: last.id },
      });
    }
  }, [sync.notifyChat, userKey]);

  function push(screen: StackScreen) {
    setNav((prev) => ({ ...prev, stack: [...prev.stack, screen], sheetOpen: false }));
  }

  function pop() {
    setNav((prev) => ({
      ...prev,
      stack: prev.stack.length > 1 ? prev.stack.slice(0, -1) : prev.stack,
    }));
  }

  function openRoom(roomId: RoomId, memberKeys?: DemoUserKey[]) {
    const convo = conversations.find((c) => String(c.roomId) === String(roomId));
    const members = memberKeys ?? convo?.memberKeys;
    if (
      members &&
      !userIsRoomMember(String(roomId), userKey, members)
    ) {
      setNotification({
        id: `room-denied-${Date.now()}`,
        title: "Private room",
        body: "You can’t join a room you’re not a member of.",
        timestamp: Date.now(),
        type: "system",
      });
      return;
    }
    // Create/join on the server immediately so layout/chat don't race "room not found".
    sync.joinRoom(String(roomId), members);
    setNav((prev) => {
      const current = prev.stack[prev.stack.length - 1];
      if (
        current?.name === "room" &&
        String(current.roomId) === String(roomId)
      ) {
        return prev;
      }
      return {
        ...prev,
        stack: [...prev.stack, { name: "room", roomId }],
        sheetOpen: false,
      };
    });
  }

  function onSelectContact(contact: Contact) {
    const memberKey = isDemoUserKey(String(contact.userKey))
      ? (contact.userKey as DemoUserKey)
      : undefined;
    if (memberKey) {
      const roomId = dmRoomIdFor(userKey, memberKey);
      const existing = conversations.find(
        (c) => String(c.roomId) === String(roomId),
      );
      if (existing) {
        openRoom(existing.roomId, existing.memberKeys);
        return;
      }
      setConversations((prev) => [
        {
          roomId,
          kind: "dm",
          title: contact.displayName,
          peerUserKey: memberKey,
          memberKeys: [userKey, memberKey].sort() as DemoUserKey[],
          preview: "Private room · just the two of you",
          updatedAt: Date.now(),
          personalStyleId: "garden",
        },
        ...prev,
      ]);
      openRoom(roomId, [userKey, memberKey].sort() as DemoUserKey[]);
      return;
    }
    const existing = conversations.find(
      (c) => c.kind === "dm" && c.title === contact.displayName,
    );
    if (existing) {
      openRoom(existing.roomId, existing.memberKeys);
      return;
    }
    const roomId = asRoomId(`dm:local:${contact.characterId}`);
    const memberKeys: DemoUserKey[] = [userKey];
    setConversations((prev) => [
      {
        roomId,
        kind: "dm",
        title: contact.displayName,
        memberKeys,
        preview: "Say hi",
        updatedAt: Date.now(),
        personalStyleId: "garden",
      },
      ...prev,
    ]);
    openRoom(roomId, memberKeys);
  }

  function setPersonalStyle(roomId: RoomId, styleId: RoomStyleId) {
    setConversations((prev) =>
      prev.map((c) =>
        String(c.roomId) === String(roomId) ? { ...c, personalStyleId: styleId } : c,
      ),
    );
  }

  function getOrCreateRoomCleanliness(roomId: RoomId): RoomCleanlinessState {
    const key = String(roomId);
    if (!roomCleanliness[key]) {
      const newState = isTestLabRoom(roomId)
        ? createDirtyCleanlinessState(8)
        : createCleanlinessState();
      setRoomCleanliness((prev) => ({ ...prev, [key]: newState }));
      return newState;
    }
    return roomCleanliness[key];
  }

  function getOrCreateFurnitureCare(roomId: RoomId): FurnitureCareState {
    const key = String(roomId);
    if (!furnitureCare[key]) {
      const newState = isTestLabRoom(roomId)
        ? createNeedyFurnitureCareState()
        : createFurnitureCareState();
      setFurnitureCare((prev) => ({ ...prev, [key]: newState }));
      return newState;
    }
    return furnitureCare[key];
  }

  function tendFurniture(roomId: RoomId, kind: "plant" | "bed" | "tv") {
    const key = String(roomId);
    const now = Date.now();
    setFurnitureCare((prev) => {
      const base = prev[key] ?? createFurnitureCareState(now);
      const next: FurnitureCareState = { ...base };
      if (kind === "plant") next.plantLastWateredAt = now;
      if (kind === "bed") next.bedLastMadeAt = now;
      if (kind === "tv") next.tvLastWatchedAt = now;
      return { ...prev, [key]: next };
    });
  }

  function updateRoomActivity(roomId: RoomId) {
    const key = String(roomId);
    setRoomCleanliness((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? createCleanlinessState()),
        lastActivityAt: Date.now(),
        dirtLevel: 0,
      },
    }));
  }

  function cleanRoom(roomId: RoomId) {
    const key = String(roomId);
    setRoomCleanliness((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? createCleanlinessState()),
        lastCleanedAt: Date.now(),
        lastActivityAt: Date.now(),
        dirtLevel: 0,
      },
    }));
  }

  async function syncPhoneContacts() {
    try {
      const newContacts = await importAndMatchContacts(contacts);
      if (newContacts.length > 0) {
        setContacts((prev) => [...newContacts, ...prev]);
        setNotification({
          id: `sync-${Date.now()}`,
          title: "Contacts Synced",
          body: `Added ${newContacts.length} new contact${newContacts.length > 1 ? "s" : ""}`,
          timestamp: Date.now(),
          type: "system",
        });
      } else {
        setNotification({
          id: `sync-${Date.now()}`,
          title: "Contacts Synced",
          body: "No new contacts to add",
          timestamp: Date.now(),
          type: "system",
        });
      }
    } catch (error) {
      setNotification({
        id: `sync-error-${Date.now()}`,
        title: "Sync Failed",
        body: error instanceof Error ? error.message : "Could not sync contacts",
        timestamp: Date.now(),
        type: "system",
      });
    }
  }

  function hangUpVoice() {
    voiceRef.current?.hangUp();
    voiceRef.current = null;
  }

  async function ensureVoiceSession(
    roomId: string,
  ): Promise<WebRtcVoiceSession | null> {
    if (!isWebRtcVoiceSupported()) {
      setNotification({
        id: `voice-unsupported-${Date.now()}`,
        title: "Voice unavailable",
        body: "Real audio needs a browser with WebRTC (try the web demo).",
        timestamp: Date.now(),
        type: "system",
      });
      return null;
    }
    if (voiceRef.current && voiceRef.current.getRoomId() === roomId) {
      voiceRef.current.setMuted(mutedRef.current);
      return voiceRef.current;
    }
    hangUpVoice();
    const session = new WebRtcVoiceSession({
      roomId,
      selfKey: userKey,
      sendSignal: (targetKey, payload) => {
        sendWebrtcRef.current(roomId, targetKey, payload);
      },
    });
    try {
      await session.start();
      session.setMuted(mutedRef.current);
      voiceRef.current = session;
      return session;
    } catch (err) {
      setNotification({
        id: `voice-mic-${Date.now()}`,
        title: "Microphone blocked",
        body:
          err instanceof Error
            ? err.message
            : "Allow mic access to use voice calls",
        timestamp: Date.now(),
        type: "system",
      });
      return null;
    }
  }

  async function connectVoicePeers(roomId: string, peers: DemoUserKey[]) {
    const session = await ensureVoiceSession(roomId);
    if (!session) return;
    for (const peer of peers) {
      if (peer === userKey) continue;
      try {
        await session.ensurePeer(peer);
      } catch {
        // Peer negotiation can fail transiently; ICE may still recover.
      }
    }
  }

  function beginConnectedCall() {
    setCallState("connected");
    setCallDuration(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }

  function resetCallLocal() {
    hangUpVoice();
    setCallState("ended");
    setCallDuration(0);
    setActiveCall(null);
    setCallIncoming(false);
    setIsMuted(false);
    mutedRef.current = false;
    setIsSpeakerOn(false);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }

  // Incoming call from peer (works even while in hallway).
  useEffect(() => {
    const invite = sync.incomingCall;
    if (!invite) return;
    if (invite.at === lastIncomingCallAt.current) return;
    lastIncomingCallAt.current = invite.at;
    if (invite.fromKey === userKey) {
      sync.clearIncomingCall();
      return;
    }

    // Already on this call — ignore re-rings (late joiners shouldn't re-invite us).
    if (
      callState !== "ended" &&
      activeCall &&
      String(activeCall.roomId) === String(invite.roomId)
    ) {
      sync.clearIncomingCall();
      return;
    }

    const isGroup = Boolean(invite.isGroup);
    const groupLabel = invite.groupName?.trim() || "Group";
    setActiveCall({
      callerName: isGroup ? groupLabel : invite.fromName,
      callerKey: invite.fromKey,
      roomId: invite.roomId,
      isGroup,
      subtitle: isGroup ? `${invite.fromName} started the call` : null,
    });
    setCallIncoming(true);
    setCallState("ringing");
    setCallDuration(0);
    setIsSpeakerOn(false);

    setNotification({
      id: `call-${invite.at}`,
      title: isGroup
        ? `${groupLabel} group call`
        : `${invite.fromName} is calling`,
      body: isGroup ? `${invite.fromName} · Tap to answer` : "Tap to answer",
      timestamp: Date.now(),
      type: "call",
      onPress: () => {
        openRoom(asRoomId(invite.roomId));
      },
    });

    void sendLocalNotification({
      title: isGroup
        ? `${groupLabel} group call`
        : `${invite.fromName} is calling`,
      body: isGroup
        ? `${invite.fromName} started a Pixelroom group call`
        : "Incoming Pixelroom call",
      data: { roomId: invite.roomId, type: "call" },
    });

    sync.clearIncomingCall();
  }, [sync.incomingCall, userKey, callState, activeCall?.roomId]);

  // Peer accepted / declined / ended / joined.
  useEffect(() => {
    const signal = sync.callSignal;
    if (!signal) return;
    if (signal.at === lastCallSignalAt.current) return;
    lastCallSignalAt.current = signal.at;

    if (signal.type === "joined") {
      const label = signal.groupName?.trim() || "Group";
      setActiveCall({
        callerName: label,
        callerKey: "group",
        roomId: signal.roomId,
        isGroup: signal.isGroup,
        subtitle: "Joined the call",
      });
      setCallIncoming(false);
      beginConnectedCall();
      void connectVoicePeers(
        signal.roomId,
        signal.participants.filter(isDemoUserKey),
      );
      setNotification({
        id: `call-joined-${signal.at}`,
        title: `Joined ${label}`,
        body: "You're in the call",
        timestamp: Date.now(),
        type: "call",
      });
    } else if (signal.type === "accept") {
      if (callState === "calling") {
        beginConnectedCall();
        if (activeCall?.isGroup) {
          setActiveCall((prev) =>
            prev ? { ...prev, subtitle: "In group call" } : prev,
          );
        }
        if (activeCall) {
          void connectVoicePeers(activeCall.roomId, [signal.fromKey]);
        }
      } else if (callState === "connected" && activeCall?.isGroup) {
        void connectVoicePeers(activeCall.roomId, [signal.fromKey]);
        const name = isDemoUserKey(String(signal.fromKey))
          ? DEMO_USERS[signal.fromKey].character.displayName
          : "Someone";
        setNotification({
          id: `call-peer-join-${signal.at}`,
          title: `${name} joined`,
          body: "They're on the call now",
          timestamp: Date.now(),
          type: "call",
        });
      }
    } else if (signal.type === "peer_left") {
      voiceRef.current?.removePeer(signal.fromKey);
      if (callState === "connected" || callState === "calling") {
        const name = isDemoUserKey(String(signal.fromKey))
          ? DEMO_USERS[signal.fromKey].character.displayName
          : "Someone";
        setNotification({
          id: `call-peer-left-${signal.at}`,
          title: `${name} left`,
          body: "Call continues",
          timestamp: Date.now(),
          type: "call",
        });
      }
    } else if (signal.type === "end") {
      resetCallLocal();
    } else if (signal.type === "decline") {
      // Group: one person declining shouldn't hang up everyone else.
      if (activeCall?.isGroup) {
        if (callState === "calling") {
          setNotification({
            id: `call-declined-${signal.at}`,
            title: "Someone declined",
            body: "Still ringing the rest of the group",
            timestamp: Date.now(),
            type: "call",
          });
        }
      } else {
        resetCallLocal();
        setNotification({
          id: `call-declined-${signal.at}`,
          title: "Call declined",
          body: "They didn't pick up",
          timestamp: Date.now(),
          type: "call",
        });
      }
    }
    sync.clearCallSignal();
  }, [sync.callSignal, callState, activeCall?.isGroup, activeCall?.roomId]);

  // WebRTC signaling relay — drain the full queue (ICE must not be dropped).
  useEffect(() => {
    const queue = sync.webrtcQueue;
    if (!queue.length) return;
    // Remove only this batch so concurrent arrivals are not wiped.
    sync.clearWebrtcSignal(queue.map((s) => s.at));
    void (async () => {
      for (const signal of queue) {
        try {
          const session = await ensureVoiceSession(signal.roomId);
          if (!session) continue;
          await session.handleSignal(signal.fromKey, signal.payload);
        } catch {
          // Keep draining; a single bad packet shouldn't stall the call.
        }
      }
    })();
  }, [sync.webrtcQueue]);

  function startCall(
    callerName: string,
    callerKey: DemoUserKey | string,
    roomId: string,
  ) {
    if (!isDemoUserKey(String(callerKey))) return;
    if (
      callState !== "ended" &&
      activeCall &&
      String(activeCall.roomId) === String(roomId)
    ) {
      return;
    }
    setActiveCall({
      callerName,
      callerKey,
      roomId,
      isGroup: false,
      subtitle: null,
    });
    setCallIncoming(false);
    setCallState("calling");
    setCallDuration(0);
    setIsMuted(false);
    mutedRef.current = false;
    setIsSpeakerOn(false);
    sync.sendCallInvite(roomId, callerKey as DemoUserKey);
  }

  function startGroupCall(groupName: string, roomId: string) {
    if (
      callState !== "ended" &&
      activeCall &&
      String(activeCall.roomId) === String(roomId)
    ) {
      return;
    }
    setActiveCall({
      callerName: groupName,
      callerKey: "group",
      roomId,
      isGroup: true,
      subtitle: "Calling everyone in the group",
    });
    setCallIncoming(false);
    setCallState("calling");
    setCallDuration(0);
    setIsMuted(false);
    mutedRef.current = false;
    setIsSpeakerOn(false);
    sync.sendCallInvite(roomId);
  }

  function acceptCall() {
    if (!activeCall) return;
    sync.sendCallAccept(activeCall.roomId);
    setCallIncoming(false);
    beginConnectedCall();
    setNotification(null);
    const peers: DemoUserKey[] = [];
    if (isDemoUserKey(String(activeCall.callerKey))) {
      peers.push(activeCall.callerKey as DemoUserKey);
    }
    void connectVoicePeers(activeCall.roomId, peers);
  }

  function endCall() {
    if (activeCall) {
      if (callIncoming && callState === "ringing") {
        sync.sendCallDecline(activeCall.roomId);
      } else {
        sync.sendCallEnd(activeCall.roomId);
      }
    }
    resetCallLocal();
    setNotification(null);
  }

  function toggleMute() {
    setIsMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      voiceRef.current?.setMuted(next);
      return next;
    });
  }

  function toggleSpeaker() {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (next && activeCall) {
        openRoom(asRoomId(activeCall.roomId));
      }
      return next;
    });
  }

  const syncLabel =
    sync.status === "open"
      ? `online as ${self.character.displayName}`
      : sync.status === "connecting"
        ? "connecting…"
        : "offline · retrying";

  if (needsWizard) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <IntroWizardScreen onComplete={completeOnboarding} />
      </SafeAreaView>
    );
  }

  let body: ReactNode = null;

  if (top.name === "room") {
    const convo = conversations.find((c) => String(c.roomId) === String(top.roomId));
    const styleId =
      convo?.kind === "dm"
        ? (convo.personalStyleId ?? sync.room.styleId)
        : sync.room.styleId;
    body = (
      <RoomScreen
        roomId={top.roomId}
        selfKey={userKey}
        selfAppearance={self.character.appearance}
        title={convo?.title ?? "Room"}
        room={sync.room}
        memberKeys={convo?.memberKeys}
        messages={sync.messages}
        inventory={inventory}
        onChangeInventory={setInventory}
        coins={coins}
        onChangeCoins={setCoins}
        styleId={styleId}
        onBack={pop}
        onOpenProfile={() =>
          push({
            name: "profile",
            userKey: convo?.peerUserKey ?? getPeerKey(userKey),
            roomId: top.roomId,
          })
        }
        onJoin={() =>
          sync.joinRoom(String(top.roomId), convo?.memberKeys)
        }
        onLeave={() => sync.leaveRoom(String(top.roomId))}
        onSendChat={(text) => {
          sync.sendChat(String(top.roomId), text);
          updateRoomActivity(top.roomId);
          setConversations((prev) =>
            prev.map((c) =>
              String(c.roomId) === String(top.roomId)
                ? { ...c, preview: text, updatedAt: Date.now() }
                : c,
            ),
          );
        }}
        onSendAction={(action, targetName) => {
          sync.sendAction(String(top.roomId), action, targetName);
          // Cleaning / furniture-care minigames shouldn't wipe room dirt until done.
          if (action !== "clean" && action !== "water" && action !== "makebed" && action !== "watch") {
            updateRoomActivity(top.roomId);
          }
        }}
        roomCleanliness={getOrCreateRoomCleanliness(top.roomId)}
        onCleanRoom={() => cleanRoom(top.roomId)}
        furnitureCare={getOrCreateFurnitureCare(top.roomId)}
        onTendFurniture={(kind) => tendFurniture(top.roomId, kind)}
        onStartCall={() => {
          if (convo?.kind === "party") {
            startGroupCall(convo.title ?? "Group", String(top.roomId));
            return;
          }
          const peerKey =
            convo?.peerUserKey ??
            convo?.memberKeys?.find((k) => k !== userKey) ??
            getPeerKey(userKey);
          const peerName = isDemoUserKey(String(peerKey))
            ? DEMO_USERS[peerKey as DemoUserKey].character.displayName
            : (convo?.title ?? "User");
          startCall(peerName, peerKey, String(top.roomId));
        }}
        activeCall={activeCall}
        callState={callState}
        callDuration={callDuration}
        isMuted={isMuted}
        isSpeakerOn={isSpeakerOn}
        micLevel={micLevel}
        hasRemoteAudio={hasRemoteAudio}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        syncedLayout={sync.layout}
        onPublishLayout={(document) =>
          sync.sendRoomLayout(String(top.roomId), document)
        }
        onMoveSelf={(x) => sync.sendPosition(String(top.roomId), x)}
        onTyping={(isTyping) => sync.sendTyping(String(top.roomId), isTyping)}
        peerTyping={(() => {
          const peerKey = (
            Object.entries(sync.peerTyping) as [DemoUserKey, boolean][]
          ).find(([key, on]) => on && key !== userKey)?.[0];
          return peerKey
            ? {
                userKey: peerKey,
                name: DEMO_USERS[peerKey].character.displayName,
              }
            : null;
        })()}
      />
    );
  } else if (top.name === "profile") {
    const convo = conversations.find(
      (c) => top.roomId && String(c.roomId) === String(top.roomId),
    );
    const roomKind = convo?.kind ?? (sync.room.kind === "party" ? "party" : "dm");
    const canEditShared =
      roomKind === "dm" ||
      sync.room.adminIds.some((id) => id === selfCharacterId);
    const activeStyleId =
      roomKind === "dm"
        ? (convo?.personalStyleId ?? sync.room.styleId)
        : sync.room.styleId;

    body = (
      <ProfileDetailScreen
        userKey={top.userKey}
        roomKind={roomKind}
        activeStyleId={activeStyleId}
        canEditSharedStyle={canEditShared}
        onBack={pop}
        onSelectStyle={(styleId) => {
          if (roomKind === "dm" && top.roomId) {
            setPersonalStyle(top.roomId, styleId);
          } else if (top.roomId) {
            sync.sendRoomStyle(String(top.roomId), styleId);
          }
        }}
      />
    );
  } else if (top.name === "devtools") {
    body = <DevToolsScreen onBack={pop} />;
  } else if (top.name === "newContact") {
    body = (
      <NewContactScreen
        onBack={pop}
        onSave={(contact) => {
          setContacts((prev) => [contact, ...prev]);
          pop();
        }}
      />
    );
  } else if (top.name === "newParty") {
    body = (
      <NewPartyScreen
        contacts={contacts}
        onBack={pop}
        onCreate={(name, memberIds) => {
          const selectedKeys = (Object.keys(DEMO_USERS) as DemoUserKey[]).filter(
            (k) => memberIds.includes(String(DEMO_USERS[k].character.id)),
          );
          const memberKeys = Array.from(
            new Set<DemoUserKey>([userKey, ...selectedKeys]),
          ).sort() as DemoUserKey[];
          const roomId = partyRoomIdFor(memberKeys);
          setConversations((prev) => {
            if (prev.some((c) => String(c.roomId) === String(roomId))) {
              return prev.map((c) =>
                String(c.roomId) === String(roomId)
                  ? { ...c, title: name, updatedAt: Date.now() }
                  : c,
              );
            }
            return [
              {
                roomId,
                kind: "party",
                title: name,
                memberKeys,
                preview: `Party · ${memberKeys.length} people`,
                updatedAt: Date.now(),
              },
              ...prev,
            ];
          });
          pop();
          openRoom(roomId, memberKeys);
        }}
      />
    );
  } else {
    body = (
      <View style={styles.flex}>
        <View style={styles.flex}>
          {nav.tab === "hallway" ? (
            <HallwayScreen
              conversations={conversations}
              selfKey={userKey}
              syncLabel={syncLabel}
              onOpenRoom={openRoom}
              onOpenNew={() => setNav((prev) => ({ ...prev, sheetOpen: true }))}
            />
          ) : null}
          {nav.tab === "you" ? (
            <YouScreen
              user={self}
              ownedClothes={ownedClothes}
              onChangeName={(displayName) => {
                setSelf((prev) => ({
                  ...prev,
                  character: { ...prev.character, displayName },
                }));
                const existing = loadOnboardingProfile();
                if (existing && existing.userKey === userKey) {
                  saveOnboardingProfile({ ...existing, displayName });
                }
              }}
              onChangeAppearance={(patch: Partial<Appearance>) =>
                setSelf((prev) => ({
                  ...prev,
                  character: {
                    ...prev.character,
                    appearance: migrateAppearanceHats({
                      ...prev.character.appearance,
                      ...patch,
                    }),
                  },
                }))
              }
              onOpenDevTools={() => push({ name: "devtools" })}
            />
          ) : null}
          {nav.tab === "store" ? (
            <StoreScreen
              inventory={inventory}
              onChangeInventory={setInventory}
              coins={coins}
              onChangeCoins={setCoins}
              ownedClothes={ownedClothes}
              onUnlockCloth={(id, patch) => {
                setOwnedClothes((prev) =>
                  prev.includes(id) ? prev : [...prev, id],
                );
                setSelf((prev) => ({
                  ...prev,
                  character: {
                    ...prev.character,
                    appearance: migrateAppearanceHats({
                      ...prev.character.appearance,
                      ...patch,
                    }),
                  },
                }));
              }}
            />
          ) : null}
        </View>
        <BottomTabs
          active={nav.tab}
          youAppearance={self.character.appearance}
          onChange={(tab) => setNav((prev) => ({ ...prev, tab }))}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {sync.lastError ? (
        <PressableBanner message={sync.lastError} onClear={sync.clearError} />
      ) : null}
      <View style={styles.flex}>
        {body}
        <NotificationBar
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
        <CallScreen
          visible={
            callState !== "ended" &&
            activeCall != null &&
            !(
              isSpeakerOn &&
              top.name === "room" &&
              String(top.roomId) === String(activeCall.roomId)
            )
          }
          callerName={activeCall?.callerName ?? ""}
          subtitle={activeCall?.subtitle}
          callState={callState}
          duration={callDuration}
          isIncoming={callIncoming}
          isGroup={Boolean(activeCall?.isGroup)}
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onAcceptCall={acceptCall}
          onEndCall={endCall}
        />
      </View>
      <NewChatSheet
        visible={nav.sheetOpen}
        contacts={contacts}
        onClose={() => setNav((prev) => ({ ...prev, sheetOpen: false }))}
        onSelectContact={onSelectContact}
        onAddContact={() => push({ name: "newContact" })}
        onNewGroup={() => push({ name: "newParty" })}
        onSyncContacts={syncPhoneContacts}
      />
    </SafeAreaView>
  );
}

function PressableBanner({ message, onClear }: { message: string; onClear: () => void }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText} onPress={onClear}>
        {message} (tap to dismiss)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  banner: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerText: { color: colors.surfaceRaised, fontSize: 12 },
});
