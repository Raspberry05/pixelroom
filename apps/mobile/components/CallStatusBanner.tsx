import { StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";

type Props = {
  callerName: string;
  duration: number;
  callState: "calling" | "ringing" | "connected";
};

export function CallStatusBanner({ callerName, duration, callState }: Props) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = (): string => {
    switch (callState) {
      case "calling":
        return "Calling...";
      case "ringing":
        return "Ringing...";
      case "connected":
        return formatDuration(duration);
      default:
        return "";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pulseIndicator} />
      <Text style={styles.text}>
        📞 {callerName} · {getStatusText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    gap: space.xs,
  },
  pulseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.surfaceRaised,
    flex: 1,
  },
});
