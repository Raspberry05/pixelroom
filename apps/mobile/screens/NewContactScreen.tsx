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
  onBack: () => void;
  onSave: (contact: Contact) => void;
};

export function NewContactScreen({ onBack, onSave }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("US");

  function submit() {
    if (!displayName.trim() || !phone.trim()) {
      Alert.alert("Missing info", "Name and phone number are required.");
      return;
    }
    onSave({
      userKey: `custom_${Date.now()}`,
      characterId: `char_custom_${Date.now()}`,
      displayName: displayName.trim(),
      username: (username.trim() || displayName.trim().toLowerCase()).replace(/\s+/g, ""),
      phone: phone.trim(),
      country: country.trim() || "US",
    });
  }

  return (
    <View style={styles.flex}>
      <TopNav title="Add contact" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={displayName} onChangeText={setDisplayName} />
        <Field label="Username" value={username} onChangeText={setUsername} placeholder="optional" />
        <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Country" value={country} onChangeText={setCountry} />

        <Pressable
          style={styles.secondary}
          onPress={() => Alert.alert("QR", "QR scanning comes later.")}
        >
          <Text style={styles.secondaryText}>Scan their QR</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => Alert.alert("Contacts", "Phone contact sync comes later.")}
        >
          <Text style={styles.secondaryText}>Sync phone contacts</Text>
        </Pressable>

        <Pressable style={styles.primary} onPress={submit}>
          <Text style={styles.primaryText}>Save contact</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.lg, gap: space.md },
  field: { gap: space.xs },
  label: { ...typography.caption, color: colors.inkMuted, textTransform: "uppercase" },
  input: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.ink,
  },
  secondary: {
    padding: space.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  secondaryText: { fontWeight: "700", color: colors.ink },
  primary: {
    marginTop: space.md,
    padding: space.md,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
  },
  primaryText: { color: colors.surfaceRaised, fontWeight: "700" },
});
