import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { TopNav } from "../components/TopNav";
import type { Contact } from "../data/seed";
import { colors, space, typography } from "../theme";

type Props = {
  contacts: Contact[];
  onBack: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
};

/** Parties require 3+ people (you + at least 2 contacts). */
export function NewPartyScreen({ contacts, onBack, onCreate }: Props) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    if (!name.trim() || selected.length < 2) {
      Alert.alert(
        "Party needs 3+",
        "Add a name and at least 2 contacts (you + 2 = party of 3).",
      );
      return;
    }
    onCreate(name.trim(), selected);
  }

  return (
    <View style={styles.flex}>
      <TopNav title="New party" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.blurb}>
          Parties are groups of 3 or more. Shared room styles are controlled by admins.
        </Text>
        <Text style={styles.label}>Party name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Friday crew"
          placeholderTextColor={colors.inkFaint}
        />
        <Text style={styles.label}>Members ({selected.length} selected · need 2+)</Text>
        {contacts.map((c) => {
          const on = selected.includes(c.characterId);
          return (
            <Pressable
              key={c.characterId}
              style={[styles.row, on && styles.rowOn]}
              onPress={() => toggle(c.characterId)}
            >
              <Text style={styles.rowText}>{c.displayName}</Text>
              <Text style={styles.check}>{on ? "✓" : ""}</Text>
            </Pressable>
          );
        })}
        {contacts.length < 2 ? (
          <Text style={styles.warn}>
            Add more contacts first — a party needs at least two other people.
          </Text>
        ) : null}
        <Pressable style={styles.primary} onPress={submit}>
          <Text style={styles.primaryText}>Create party</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.lg, gap: space.sm },
  blurb: { color: colors.inkMuted, fontSize: 13, marginBottom: space.sm },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginTop: space.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: space.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  rowOn: { backgroundColor: colors.accentSoft },
  rowText: { color: colors.ink, fontWeight: "600" },
  check: { color: colors.accent, fontWeight: "700" },
  warn: { color: colors.danger, marginTop: space.sm, fontSize: 13 },
  primary: {
    marginTop: space.lg,
    padding: space.md,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  primaryText: { color: colors.surfaceRaised, fontWeight: "700" },
});
