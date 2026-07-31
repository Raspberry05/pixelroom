import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, space, typography } from "../theme";

type Props = {
  title: string;
  subtitle?: string;
  onTitlePress?: () => void;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function TopNav({ title, subtitle, onTitlePress, onBack, right }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backText}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
      </View>

      <Pressable
        style={styles.center}
        onPress={onTitlePress}
        disabled={!onTitlePress}
        accessibilityRole={onTitlePress ? "button" : undefined}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>

      <View style={styles.right}>{right ?? <View style={styles.backSpacer} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderStrong,
    minHeight: 56,
  },
  left: { width: 56, alignItems: "flex-start" },
  right: { minWidth: 56, alignItems: "flex-end" },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.circle,
  },
  backText: {
    fontSize: 20,
    color: colors.ink,
    fontWeight: "700",
  },
  backSpacer: { width: 40, height: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: space.sm,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginTop: 2,
  },
});
