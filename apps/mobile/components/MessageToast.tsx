import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, space, typography } from "../theme";

export type AppToast = {
  id: string;
  title: string;
  body: string;
  roomId?: string;
};

type Props = {
  toast: AppToast | null;
  onDismiss: () => void;
  onPress?: (toast: AppToast) => void;
};

/** Top-of-screen notification for messages from other rooms / chats. */
export function MessageToast({ toast, onDismiss, onPress }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4200);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        style={styles.card}
        onPress={() => {
          onPress?.(toast);
          onDismiss();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Message from ${toast.title}`}
      >
        <Text style={styles.title} numberOfLines={1}>
          {toast.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {toast.body}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: space.md,
    left: space.md,
    right: space.md,
    zIndex: 100,
    elevation: 100,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  body: {
    ...typography.body,
    color: colors.ink,
    fontWeight: "600",
    marginTop: 2,
  },
});
