import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii } from "../theme";

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

export function CallButton({ onPress, disabled }: Props) {
  return (
    <Pressable
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel="Start call"
      accessibilityRole="button"
    >
      <Text style={styles.icon}>📞</Text>
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
    fontSize: 18,
  },
});
