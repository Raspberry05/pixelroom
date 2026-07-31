import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Contact } from "../data/seed";
import { colors, radii, space, typography } from "../theme";

type Props = {
  visible: boolean;
  contacts: Contact[];
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
  onAddContact: () => void;
  onNewGroup: () => void;
};

export function NewChatSheet({
  visible,
  contacts,
  onClose,
  onSelectContact,
  onAddContact,
  onNewGroup,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }, [contacts, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>New conversation</Text>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close">
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search contacts or users"
            placeholderTextColor={colors.inkFaint}
            style={styles.search}
          />

          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={onNewGroup}>
              <Text style={styles.actionText}>New party</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={onAddContact}>
              <Text style={styles.actionText}>Add contact</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map((contact) => (
              <Pressable
                key={contact.characterId}
                style={styles.row}
                onPress={() => onSelectContact(contact)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{contact.displayName.slice(0, 1)}</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.name}>{contact.displayName}</Text>
                  <Text style={styles.sub}>
                    @{contact.username} · {contact.phone}
                  </Text>
                </View>
              </Pressable>
            ))}
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No matches in your contacts</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  dismiss: { flex: 1 },
  sheet: {
    maxHeight: "78%",
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.borderStrong,
    paddingBottom: space.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  title: { ...typography.title, color: colors.ink },
  close: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgDeep,
  },
  closeText: { fontSize: 22, color: colors.ink, lineHeight: 24 },
  search: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.ink,
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: space.sm,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  actionText: {
    color: colors.surfaceRaised,
    fontWeight: "700",
    fontSize: 13,
  },
  list: { paddingHorizontal: space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
  },
  avatarText: { fontWeight: "700", color: colors.ink },
  meta: { flex: 1 },
  name: { ...typography.body, fontWeight: "600", color: colors.ink },
  sub: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  empty: {
    textAlign: "center",
    color: colors.inkMuted,
    paddingVertical: space.xl,
  },
});
