import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { colors, radii, space, typography } from "../theme";

export type CallState = "calling" | "ringing" | "connected" | "ended";

type Props = {
  visible: boolean;
  callerName: string;
  callState: CallState;
  duration: number;
  onEndCall: () => void;
  onAcceptCall?: () => void;
  isIncoming?: boolean;
};

export function CallScreen({
  visible,
  callerName,
  callState,
  duration,
  onEndCall,
  onAcceptCall,
  isIncoming = false,
}: Props) {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (callState === "ringing" || callState === "calling") {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
  }, [callState, pulseAnim]);

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
        return isIncoming ? "Incoming Call" : "Ringing...";
      case "connected":
        return formatDuration(duration);
      case "ended":
        return "Call Ended";
      default:
        return "";
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onEndCall}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.status}>{getStatusText()}</Text>
        </View>

        <View style={styles.callerInfo}>
          <Animated.View
            style={[
              styles.avatar,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text style={styles.avatarText}>
              {callerName.charAt(0).toUpperCase()}
            </Text>
          </Animated.View>
          <Text style={styles.callerName}>{callerName}</Text>
        </View>

        <View style={styles.controls}>
          {isIncoming && callState === "ringing" && onAcceptCall ? (
            <>
              <Pressable
                style={[styles.controlBtn, styles.acceptBtn]}
                onPress={onAcceptCall}
                accessibilityLabel="Accept call"
                accessibilityRole="button"
              >
                <Text style={styles.controlIcon}>✓</Text>
              </Pressable>
              <Pressable
                style={[styles.controlBtn, styles.declineBtn]}
                onPress={onEndCall}
                accessibilityLabel="Decline call"
                accessibilityRole="button"
              >
                <Text style={styles.controlIcon}>✕</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.controlBtn, styles.endCallBtn]}
              onPress={onEndCall}
              accessibilityLabel="End call"
              accessibilityRole="button"
            >
              <Text style={styles.endCallIcon}>📞</Text>
            </Pressable>
          )}
        </View>

        {callState === "connected" && (
          <View style={styles.features}>
            <Pressable style={styles.featureBtn}>
              <Text style={styles.featureIcon}>🔇</Text>
              <Text style={styles.featureLabel}>Mute</Text>
            </Pressable>
            <Pressable style={styles.featureBtn}>
              <Text style={styles.featureIcon}>🔊</Text>
              <Text style={styles.featureLabel}>Speaker</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingTop: space.xxl * 2,
    paddingHorizontal: space.lg,
  },
  header: {
    alignItems: "center",
    paddingVertical: space.lg,
  },
  status: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.surfaceRaised,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  callerInfo: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: space.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentSoft,
    borderWidth: 4,
    borderColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.accent,
  },
  callerName: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.surfaceRaised,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xl,
    paddingBottom: space.xxl * 2,
  },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.surfaceRaised,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  acceptBtn: {
    backgroundColor: "#2ecc71",
  },
  declineBtn: {
    backgroundColor: "#e74c3c",
  },
  endCallBtn: {
    backgroundColor: "#e74c3c",
  },
  controlIcon: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  endCallIcon: {
    fontSize: 28,
    transform: [{ rotate: "135deg" }],
  },
  features: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xl,
    paddingBottom: space.xl,
  },
  featureBtn: {
    alignItems: "center",
    gap: space.xs,
    padding: space.md,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.surfaceRaised,
    textTransform: "uppercase",
  },
});
