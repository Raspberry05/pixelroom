import { Image, Pressable, StyleSheet } from "react-native";
import { colors, radii } from "../theme";

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

const PHONE_GREEN = "#2ecc71";

/** Inline SVG phone (avoids the red 📞 emoji). */
const PHONE_ICON_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${PHONE_GREEN}"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C9.61 21 2 13.39 2 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
)}`;

export function CallButton({ onPress, disabled }: Props) {
  return (
    <Pressable
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel="Start call"
      accessibilityRole="button"
    >
      <Image
        source={{ uri: PHONE_ICON_URI }}
        style={styles.icon}
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.circle,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  icon: {
    width: 20,
    height: 20,
  },
});
