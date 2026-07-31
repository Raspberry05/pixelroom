import { useEffect, useMemo, useState, Component, type ErrorInfo, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Appearance } from "@pixelroom/core";
import type { ConversationPreview, DemoUserKey } from "../data/seed";
import {
  APPEARANCE_STORAGE_KEY,
  appearancesForConversation,
} from "../data/appearanceStore";
import { ConversationAvatar } from "../components/ConversationAvatar";
import { TopNav } from "../components/TopNav";
import { colors, radii, space, typography } from "../theme";

class AvatarBoundary extends Component<
  { appearances: Appearance[]; size: number; children?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("ConversationAvatar failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <View
          style={{
            width: this.props.size,
            height: this.props.size,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: radii.sm,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.inkMuted, fontWeight: "700" }}>?</Text>
        </View>
      );
    }
    return (
      <ConversationAvatar
        appearances={this.props.appearances}
        size={this.props.size}
      />
    );
  }
}

type Props = {
  conversations: ConversationPreview[];
  selfKey: DemoUserKey;
  syncLabel: string;
  onOpenRoom: (roomId: ConversationPreview["roomId"]) => void;
  onOpenNew: () => void;
};

export function HallwayScreen({
  conversations,
  selfKey,
  syncLabel,
  onOpenRoom,
  onOpenNew,
}: Props) {
  const [query, setQuery] = useState("");
  const [appearanceTick, setAppearanceTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY) {
        setAppearanceTick((n) => n + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
    );
  }, [conversations, query]);

  return (
    <View style={styles.flex}>
      <TopNav
        title="Hallway"
        subtitle={syncLabel}
        right={
          <Pressable onPress={onOpenNew} style={styles.plus} accessibilityLabel="New chat">
            <Text style={styles.plusText}>+</Text>
          </Pressable>
        }
      />

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find a room or person"
          placeholderTextColor={colors.inkFaint}
          style={styles.search}
        />
      </View>

      <ScrollView style={styles.list}>
        {filtered.map((convo) => (
          <Pressable
            key={`${String(convo.roomId)}:${appearanceTick}`}
            style={styles.row}
            onPress={() => onOpenRoom(convo.roomId)}
          >
            <AvatarBoundary
              appearances={appearancesForConversation(
                convo.memberKeys,
                convo.kind,
                selfKey,
              )}
              size={56}
            />
            <View style={styles.meta}>
              <View style={styles.rowTop}>
                <Text style={styles.title}>{convo.title}</Text>
                <Text style={styles.kind}>{convo.kind === "dm" ? "DM" : "Party"}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {convo.preview}
              </Text>
            </View>
          </Pressable>
        ))}
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No rooms match that search</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  plus: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.circle,
  },
  plusText: { color: colors.surfaceRaised, fontSize: 24, fontWeight: "700", marginTop: -2 },
  searchWrap: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  search: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.ink,
    fontSize: 15,
  },
  list: { flex: 1 },
  row: {
    flexDirection: "row",
    gap: space.md,
    marginHorizontal: space.md,
    marginVertical: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  meta: { flex: 1, justifyContent: "center" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: space.sm },
  title: { ...typography.body, fontWeight: "700", color: colors.ink },
  kind: { ...typography.caption, color: colors.inkFaint, textTransform: "uppercase" },
  preview: { marginTop: 4, color: colors.inkMuted, fontSize: 13 },
  empty: { textAlign: "center", color: colors.inkMuted, marginTop: space.xl },
});
