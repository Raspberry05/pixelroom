import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TabKey } from "../navigation/types";
import { colors, radii, space, typography } from "../theme";

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "hallway", label: "Hallway" },
  { key: "you", label: "You" },
  { key: "store", label: "Store" },
];

export function BottomTabs({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: space.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  labelActive: {
    color: colors.accent,
    fontWeight: "700",
  },
});
