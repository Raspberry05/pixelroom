import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Appearance } from "@pixelroom/core";
import { AvatarPreview } from "../components/AvatarSprite";
import { TopNav } from "../components/TopNav";
import type { DemoUser } from "../data/seed";
import { SHEET_PRESETS } from "../data/sprites";
import { colors, radii, space, typography } from "../theme";

type Props = {
  user: DemoUser;
  onChangeName: (name: string) => void;
  onChangeAppearance: (patch: Partial<Appearance>) => void;
  onOpenDevTools?: () => void;
};

const HAIR = [
  { id: "brown", label: "Brown" },
  { id: "bald", label: "Bald" },
] as const;

const OUTFITS = [
  { id: "red", label: "Red tee" },
  { id: "none", label: "No top" },
] as const;

const PANTS = [
  { id: "blue", label: "Blue" },
  { id: "purple", label: "Purple" },
  { id: "none", label: "None" },
] as const;

export function YouScreen({ user, onChangeName, onChangeAppearance, onOpenDevTools }: Props) {
  const a = user.character.appearance;
  const kit = a.kit === "sheet" ? "sheet" : "cozy";

  return (
    <View style={styles.flex}>
      <TopNav title="You" subtitle="Character studio" />
      
      {onOpenDevTools && (
        <Pressable style={styles.devToolsBtn} onPress={onOpenDevTools}>
          <Text style={styles.devToolsBtnText}>🛠️ Developer Tools</Text>
        </Pressable>
      )}
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.preview}>
          <AvatarPreview appearance={a} size={112} />
          <Text style={styles.spriteLabel}>{user.character.displayName}</Text>
          <Text style={styles.hint}>
            {kit === "cozy" ? "Cozy layers (char free)" : "Sheet preset"}
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
              { id: "cozy" as const, label: "Cozy (char free)" },
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
          <>
            <Text style={styles.label}>Hair</Text>
            <View style={styles.row}>
              {HAIR.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, a.hair === opt.id && styles.chipOn]}
                  onPress={() => onChangeAppearance({ hair: opt.id })}
                >
                  <Text style={styles.chipText}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Top</Text>
            <View style={styles.row}>
              {OUTFITS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, a.outfit === opt.id && styles.chipOn]}
                  onPress={() => onChangeAppearance({ outfit: opt.id })}
                >
                  <Text style={styles.chipText}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Pants</Text>
            <View style={styles.row}>
              {PANTS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, a.pants === opt.id && styles.chipOn]}
                  onPress={() => onChangeAppearance({ pants: opt.id })}
                >
                  <Text style={styles.chipText}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Body preset</Text>
            <View style={styles.row}>
              {SHEET_PRESETS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, a.sheetId === opt.id && styles.chipOn]}
                  onPress={() => onChangeAppearance({ sheetId: opt.id, kit: "sheet" })}
                >
                  <Text style={styles.chipText}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.lg, gap: space.sm, paddingBottom: space.xl * 2 },
  preview: { alignItems: "center", marginBottom: space.md },
  spriteLabel: { marginTop: space.sm, ...typography.title, color: colors.ink },
  hint: { ...typography.caption, color: colors.inkMuted, marginTop: 4 },
  label: { ...typography.caption, color: colors.inkMuted, textTransform: "uppercase" },
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
  },
  chipOn: { backgroundColor: colors.accentSoft },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.ink },
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
});
