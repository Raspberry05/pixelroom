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
import { MessageToast, type AppToast } from "./components/MessageToast";
import { NewChatSheet } from "./components/NewChatSheet";
import {
  DEMO_USERS,
  contactsFor,
  getPeerKey,
  initialConversations,
  isDemoUserKey,
  resolveDemoUser,
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
import { usePixelSync } from "./sync/client";
import { colors } from "./theme";

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

function readUserKey(): DemoUserKey {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("user");
    return resolveDemoUser(param);
  }
  return "alice";
}

export default function App() {
  useEffect(() => {
    ensureSharpPixelsOnWeb();
  }, []);

  const userKey = useMemo(() => readUserKey(), []);
  const [self, setSelf] = useState<DemoUser>(() => DEMO_USERS[userKey]);
  const [contacts, setContacts] = useState<Contact[]>(() => contactsFor(userKey));
  const [conversations, setConversations] = useState<ConversationPreview[]>(() =>
    initialConversations(userKey),
  );
  const [nav, setNav] = useState(initialNav);
  const [inventory, setInventory] = useState<InventoryState>(() => loadInventory());
  const [coins, setCoins] = useState(() => loadCoins(500));
  const [ownedClothes, setOwnedClothes] = useState<string[]>(() => {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem("pixelroom.clothes.v1");
        if (raw) return JSON.parse(raw) as string[];
      } catch {
        // ignore
      }
    }
    return ["cloth_red_tee", "cloth_blue_pants"];
  });
  const [toast, setToast] = useState<AppToast | null>(null);
  const lastToastMsgId = useRef<string | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const sync = usePixelSync(userKey);

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

  const top = nav.stack[nav.stack.length - 1] ?? { name: "tabs" as const };
  const selfCharacterId = DEMO_USERS[userKey].character.id;
  const activeRoomId = top.name === "room" ? String(top.roomId) : null;

  useEffect(() => {
    const last = sync.messages[sync.messages.length - 1];
    if (!last || last.kind === "system") return;
    if (last.senderKey === userKey) return;
    if (lastToastMsgId.current === last.id) return;
    lastToastMsgId.current = last.id;
    // In the active room, the in-room HUD / head bubbles cover it.
    if (activeRoomId && String(last.roomId) === activeRoomId) return;
    setToast({
      id: last.id,
      title: last.senderName,
      body: last.text,
      roomId: last.roomId,
    });
  }, [sync.messages, activeRoomId, userKey]);

  function push(screen: StackScreen) {
    setNav((prev) => ({ ...prev, stack: [...prev.stack, screen], sheetOpen: false }));
  }

  function pop() {
    setNav((prev) => ({
      ...prev,
      stack: prev.stack.length > 1 ? prev.stack.slice(0, -1) : prev.stack,
    }));
  }

  function openRoom(roomId: RoomId) {
    push({ name: "room", roomId });
  }

  function onSelectContact(contact: Contact) {
    const existing = conversations.find(
      (c) => c.kind === "dm" && c.title === contact.displayName,
    );
    if (existing) {
      openRoom(existing.roomId);
      return;
    }
    if (contact.userKey === "alice" || contact.userKey === "bob") {
      openRoom(asRoomId("dm:alice:bob"));
      return;
    }
    const roomId = asRoomId(`dm:local:${contact.characterId}`);
    const memberKey = isDemoUserKey(String(contact.userKey))
      ? (contact.userKey as DemoUserKey)
      : undefined;
    setConversations((prev) => [
      {
        roomId,
        kind: "dm",
        title: contact.displayName,
        peerUserKey: memberKey,
        memberKeys: memberKey ? [memberKey] : [],
        preview: "Say hi",
        updatedAt: Date.now(),
        personalStyleId: "garden",
      },
      ...prev,
    ]);
    openRoom(roomId);
  }

  function setPersonalStyle(roomId: RoomId, styleId: RoomStyleId) {
    setConversations((prev) =>
      prev.map((c) =>
        String(c.roomId) === String(roomId) ? { ...c, personalStyleId: styleId } : c,
      ),
    );
  }

  const syncLabel =
    sync.status === "open"
      ? `online as ${self.character.displayName}`
      : sync.status === "connecting"
        ? "connecting…"
        : "offline · retrying";

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
        onJoin={() => sync.joinRoom(String(top.roomId))}
        onLeave={() => sync.leaveRoom(String(top.roomId))}
        onSendChat={(text) => {
          sync.sendChat(String(top.roomId), text);
          setConversations((prev) =>
            prev.map((c) =>
              String(c.roomId) === String(top.roomId)
                ? { ...c, preview: text, updatedAt: Date.now() }
                : c,
            ),
          );
        }}
        onSendAction={(action, targetName) =>
          sync.sendAction(String(top.roomId), action, targetName)
        }
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
          const roomId = asRoomId(`party:${Date.now()}`);
          const selectedKeys = (Object.keys(DEMO_USERS) as DemoUserKey[]).filter(
            (k) => memberIds.includes(String(DEMO_USERS[k].character.id)),
          );
          const memberKeys = Array.from(new Set<DemoUserKey>([userKey, ...selectedKeys]));
          setConversations((prev) => [
            {
              roomId,
              kind: "party",
              title: name,
              memberKeys,
              preview: `Party · ${memberKeys.length} people`,
              updatedAt: Date.now(),
            },
            ...prev,
          ]);
          pop();
          openRoom(roomId);
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
              syncLabel={syncLabel}
              onOpenRoom={openRoom}
              onOpenNew={() => setNav((prev) => ({ ...prev, sheetOpen: true }))}
            />
          ) : null}
          {nav.tab === "you" ? (
            <YouScreen
              user={self}
              onChangeName={(displayName) =>
                setSelf((prev) => ({
                  ...prev,
                  character: { ...prev.character, displayName },
                }))
              }
              onChangeAppearance={(patch: Partial<Appearance>) =>
                setSelf((prev) => ({
                  ...prev,
                  character: {
                    ...prev.character,
                    appearance: { ...prev.character.appearance, ...patch },
                  },
                }))
              }
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
                    appearance: { ...prev.character.appearance, ...patch },
                  },
                }));
              }}
            />
          ) : null}
        </View>
        <BottomTabs
          active={nav.tab}
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
        <MessageToast
          toast={toast}
          onDismiss={dismissToast}
          onPress={(item) => {
            if (item.roomId) openRoom(asRoomId(item.roomId));
          }}
        />
      </View>
      <NewChatSheet
        visible={nav.sheetOpen}
        contacts={contacts}
        onClose={() => setNav((prev) => ({ ...prev, sheetOpen: false }))}
        onSelectContact={onSelectContact}
        onAddContact={() => push({ name: "newContact" })}
        onNewGroup={() => push({ name: "newParty" })}
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
