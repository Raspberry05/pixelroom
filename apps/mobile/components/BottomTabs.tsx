import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Appearance } from "@pixelroom/core";
import type { TabKey } from "../navigation/types";
import { CharacterFace } from "./ConversationAvatar";
import { colors, radii, space, typography } from "../theme";

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  /** Live look for the You tab profile chip. */
  youAppearance: Appearance;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "store", label: "Store" },
  { key: "hallway", label: "Hallway" },
  { key: "you", label: "You" },
];

function StoreIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.accent : colors.inkMuted;
  return (
    <View style={styles.iconBox} accessibilityElementsHidden>
      <View style={[styles.bagBody, { borderColor: stroke }]}>
        <View style={[styles.bagHandle, { borderColor: stroke }]} />
        <View style={[styles.bagShine, { backgroundColor: stroke }]} />
      </View>
    </View>
  );
}

function HallwayIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.accent : colors.inkMuted;
  return (
    <View style={styles.iconBox} accessibilityElementsHidden>
      <View style={[styles.doorFrame, { borderColor: stroke }]}>
        <View style={[styles.doorPanel, { borderColor: stroke }]} />
        <View style={[styles.doorKnob, { backgroundColor: stroke }]} />
      </View>
    </View>
  );
}

export function BottomTabs({ active, onChange, youAppearance }: Props) {
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
            accessibilityLabel={tab.label}
          >
            {tab.key === "store" ? <StoreIcon active={isActive} /> : null}
            {tab.key === "hallway" ? <HallwayIcon active={isActive} /> : null}
            {tab.key === "you" ? (
              <View style={[styles.youFace, isActive && styles.youFaceActive]}>
                <CharacterFace appearance={youAppearance} size={26} />
              </View>
            ) : null}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
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
    paddingVertical: space.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radii.pill,
    minHeight: 56,
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  labelActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  youFace: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  youFaceActive: {
    borderColor: colors.accent,
  },
  iconBox: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bagBody: {
    width: 18,
    height: 14,
    marginTop: 6,
    borderWidth: 2,
    borderRadius: 3,
    alignItems: "center",
  },
  bagHandle: {
    position: "absolute",
    top: -7,
    width: 10,
    height: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bagShine: {
    marginTop: 4,
    width: 6,
    height: 2,
    borderRadius: 1,
    opacity: 0.55,
  },
  doorFrame: {
    width: 16,
    height: 22,
    borderWidth: 2,
    borderRadius: 2,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  doorPanel: {
    flex: 1,
    marginVertical: 2,
    borderWidth: 1.5,
    borderRadius: 1,
  },
  doorKnob: {
    position: "absolute",
    right: 3,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
