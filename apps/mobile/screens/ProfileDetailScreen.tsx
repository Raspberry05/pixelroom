import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ROOM_STYLES,
  type RoomStyleId,
} from "@pixelroom/core";
import { CharacterFace } from "../components/ConversationAvatar";
import { TopNav } from "../components/TopNav";
import { DEMO_USERS, isDemoUserKey, type DemoUserKey } from "../data/seed";
import { appearanceForUser } from "../data/appearanceStore";
import { colors, space, typography } from "../theme";

type Props = {
  userKey: DemoUserKey | string;
  roomKind: "dm" | "party";
  /** Style currently applied for this viewer (personal override or shared). */
  activeStyleId: RoomStyleId;
  canEditSharedStyle: boolean;
  onBack: () => void;
  onSelectStyle: (styleId: RoomStyleId) => void;
};

export function ProfileDetailScreen({
  userKey,
  roomKind,
  activeStyleId,
  canEditSharedStyle,
  onBack,
  onSelectStyle,
}: Props) {
  const key = String(userKey);
  const demo = isDemoUserKey(key) ? DEMO_USERS[key] : null;
  const appearance = isDemoUserKey(key) ? appearanceForUser(key) : null;
  const styleNote =
    roomKind === "dm"
      ? "Room style is only for your view — they keep their own."
      : canEditSharedStyle
        ? "You're an admin — changing style updates the party for everyone."
        : "Only party admins can change the shared room style.";

  return (
    <View style={styles.flex}>
      <TopNav
        title={demo?.character.displayName ?? (roomKind === "party" ? "Party" : "Profile")}
        subtitle={roomKind === "party" ? "Party settings" : "Chat settings"}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {demo && appearance ? (
          <>
            <View style={styles.sprite}>
              <CharacterFace appearance={appearance} size={96} />
            </View>
            <Text style={styles.name}>{demo.character.displayName}</Text>
            <Row label="Username" value={`@${demo.username}`} />
            <Row label="Phone" value={demo.phone} />
            <Row label="Country" value={demo.country} />
            <Row label="Kit" value={appearance.kit} />
            <Row label="Hair" value={appearance.hair} />
            <Row label="Outfit" value={appearance.outfit} />
            <Row label="Hat" value={appearance.accessory ?? "none"} />
            <Row label="Pants" value={appearance.pants} />
          </>
        ) : (
          <Text style={styles.muted}>Party / contact profile</Text>
        )}

        <Text style={styles.section}>Room style</Text>
        <Text style={styles.hint}>{styleNote}</Text>
        <View style={styles.styleGrid}>
          {(Object.keys(ROOM_STYLES) as RoomStyleId[]).map((id) => {
            const style = ROOM_STYLES[id];
            const selected = activeStyleId === id;
            const disabled = roomKind === "party" && !canEditSharedStyle;
            return (
              <Pressable
                key={id}
                disabled={disabled}
                onPress={() => onSelectStyle(id)}
                style={[
                  styles.styleCard,
                  { borderColor: style.accent, backgroundColor: style.wallTop },
                  selected && styles.styleCardOn,
                  disabled && styles.styleCardDisabled,
                ]}
              >
                <View style={[styles.styleFloor, { backgroundColor: style.floor }]} />
                <Text style={styles.styleName}>{style.name}</Text>
                {selected ? <Text style={styles.styleActive}>Active</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.lg, gap: space.md, alignItems: "center" },
  sprite: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
    padding: space.sm,
  },
  name: { ...typography.brand, color: colors.ink },
  row: {
    width: "100%",
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { ...typography.caption, color: colors.inkMuted, textTransform: "uppercase" },
  value: { ...typography.body, color: colors.ink, marginTop: 4 },
  muted: { color: colors.inkMuted },
  section: {
    alignSelf: "flex-start",
    marginTop: space.lg,
    ...typography.title,
    color: colors.ink,
  },
  hint: {
    alignSelf: "flex-start",
    color: colors.inkMuted,
    fontSize: 13,
    marginBottom: space.sm,
  },
  styleGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  styleCard: {
    width: "47%",
    borderWidth: 2,
    padding: space.md,
    minHeight: 88,
    justifyContent: "flex-end",
  },
  styleCardOn: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
  styleCardDisabled: {
    opacity: 0.45,
  },
  styleFloor: {
    height: 18,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  styleName: { fontWeight: "700", color: colors.ink, fontSize: 13 },
  styleActive: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    textTransform: "uppercase",
  },
});
