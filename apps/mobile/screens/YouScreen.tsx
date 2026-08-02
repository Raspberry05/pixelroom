import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Appearance } from "@pixelroom/core";
import { AvatarPreview } from "../components/AvatarSprite";
import { ClothLayerThumb } from "../components/ClothLayerThumb";
import { TopNav } from "../components/TopNav";
import type { DemoUser } from "../data/seed";
import { SHEET_PRESETS } from "../data/sprites";
import {
  isWardrobeItemEquipped,
  isWardrobeItemOwned,
  wardrobeEquipPatch,
  WARDROBE_ITEMS,
  WARDROBE_SLOTS,
  type WardrobeItem,
  type WardrobeSlot,
} from "../data/wardrobe";
import { colors, radii, space, typography } from "../theme";

type Props = {
  user: DemoUser;
  ownedClothes: string[];
  onChangeName: (name: string) => void;
  onChangeAppearance: (patch: Partial<Appearance>) => void;
  onOpenDevTools?: () => void;
  onSignOut?: () => void;
};

export function YouScreen({
  user,
  ownedClothes,
  onChangeName,
  onChangeAppearance,
  onOpenDevTools,
  onSignOut,
}: Props) {
  const a = user.character.appearance;
  const kit = a.kit === "sheet" ? "sheet" : "cozy";

  function itemsForSlot(slot: WardrobeSlot): WardrobeItem[] {
    return WARDROBE_ITEMS.filter(
      (item) => item.slot === slot && isWardrobeItemOwned(item, ownedClothes),
    );
  }

  function onSelectItem(item: WardrobeItem) {
    onChangeAppearance(wardrobeEquipPatch(item, a));
  }

  return (
    <View style={styles.flex}>
      <TopNav title="You" subtitle="Character studio" />

      {onOpenDevTools ? (
        <Pressable style={styles.devToolsBtn} onPress={onOpenDevTools}>
          <Text style={styles.devToolsBtnText}>🛠️ Developer Tools</Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.preview}>
          <AvatarPreview appearance={a} size={112} />
          <Text style={styles.spriteLabel}>{user.character.displayName}</Text>
          <Text style={styles.hint}>
            {kit === "cozy" ? "Tap a card to equip · tap again to remove" : "Sheet preset"}
          </Text>
        </View>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          value={user.character.displayName}
          onChangeText={onChangeName}
        />

        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>@{user.username}</Text>

        <Text style={styles.label}>Kit</Text>
        <View style={styles.row}>
          {(
            [
              { id: "cozy" as const, label: "Cozy layers" },
              { id: "sheet" as const, label: "Sheet presets" },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.chip, kit === opt.id && styles.chipOn]}
              onPress={() => onChangeAppearance({ kit: opt.id })}
            >
              <Text style={styles.chipText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {kit === "cozy" ? (
          WARDROBE_SLOTS.map((slot) => (
            <View key={slot.id} style={styles.section}>
              <Text style={styles.label}>{slot.label}</Text>
              <Text style={styles.slotHint}>{slot.hint}</Text>
              <View style={styles.cardGrid}>
                {itemsForSlot(slot.id).map((item) => {
                  const selected = isWardrobeItemEquipped(item, a);
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.card, selected && styles.cardOn]}
                      onPress={() => onSelectItem(item)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${item.label}${selected ? ", equipped" : ""}`}
                    >
                      <View style={styles.cardThumb}>
                        <ClothLayerThumb layerRow={item.layerRow ?? null} size={56} />
                      </View>
                      <Text style={styles.cardLabel} numberOfLines={2}>
                        {item.label}
                      </Text>
                      {selected ? (
                        <Text style={styles.equippedTag}>On</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <>
            <Text style={styles.label}>Body preset</Text>
            <View style={styles.cardGrid}>
              {SHEET_PRESETS.map((opt) => {
                const selected = a.sheetId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.card, selected && styles.cardOn]}
                    onPress={() =>
                      onChangeAppearance({ sheetId: opt.id, kit: "sheet" })
                    }
                  >
                    <View style={styles.cardThumb}>
                      <AvatarPreview
                        appearance={{
                          ...a,
                          kit: "sheet",
                          sheetId: opt.id,
                        }}
                        size={56}
                      />
                    </View>
                    <Text style={styles.cardLabel}>{opt.label}</Text>
                    {selected ? <Text style={styles.equippedTag}>On</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {onSignOut ? (
          <View style={styles.signOutBlock}>
            <Pressable
              style={styles.signOutBtn}
              onPress={onSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </Pressable>
            <Text style={styles.signOutHint}>
              Clears this device session and returns to phone sign-in.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.lg, gap: space.sm, paddingBottom: space.xl * 2 },
  preview: { alignItems: "center", marginBottom: space.md },
  spriteLabel: { marginTop: space.sm, ...typography.title, color: colors.ink },
  hint: { ...typography.caption, color: colors.inkMuted, marginTop: 4, textAlign: "center" },
  label: { ...typography.caption, color: colors.inkMuted, textTransform: "uppercase" },
  slotHint: {
    ...typography.caption,
    color: colors.inkFaint,
    marginTop: -2,
    marginBottom: space.xs,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.ink,
    marginBottom: space.sm,
  },
  value: { ...typography.body, color: colors.ink, marginBottom: space.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  chipOn: { backgroundColor: colors.accentSoft },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.ink },
  section: { marginTop: space.sm, gap: 2 },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.sm,
  },
  card: {
    width: 88,
    alignItems: "center",
    gap: 4,
    padding: space.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  cardOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  cardThumb: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgDeep,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  equippedTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.accent,
    textTransform: "uppercase",
  },
  devToolsBtn: {
    margin: space.md,
    marginBottom: 0,
    backgroundColor: "#FFD700",
    borderWidth: 3,
    borderColor: "#000000",
    borderRadius: radii.lg,
    paddingVertical: space.md,
    alignItems: "center",
  },
  devToolsBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },
  signOutBlock: {
    marginTop: space.xl,
    gap: space.sm,
    paddingTop: space.lg,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  signOutBtn: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: space.md,
    alignItems: "center",
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.danger,
  },
  signOutHint: {
    ...typography.caption,
    color: colors.inkMuted,
    textAlign: "center",
  },
});
