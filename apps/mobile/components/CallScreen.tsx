import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { colors, radii, space } from "../theme";

export type CallState = "calling" | "ringing" | "connected" | "ended";

type Props = {
  visible: boolean;
  callerName: string;
  /** e.g. "From Alice" on group calls */
  subtitle?: string | null;
  callState: CallState;
  duration: number;
  onEndCall: () => void;
  onAcceptCall?: () => void;
  isIncoming?: boolean;
  isGroup?: boolean;
  isMuted?: boolean;
  isSpeakerOn?: boolean;
  onToggleMute?: () => void;
  onToggleSpeaker?: () => void;
};

export function CallScreen({
  visible,
  callerName,
  subtitle,
  callState,
  duration,
  onEndCall,
  onAcceptCall,
  isIncoming = false,
  isGroup = false,
  isMuted = false,
  isSpeakerOn = false,
  onToggleMute,
  onToggleSpeaker,
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
        return isGroup ? "Calling group..." : "Calling...";
      case "ringing":
        if (isIncoming) {
          return isGroup ? "Incoming group call" : "Incoming Call";
        }
        return "Ringing...";
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
              {isGroup ? "👥" : callerName.charAt(0).toUpperCase()}
            </Text>
          </Animated.View>
          <Text style={styles.callerName}>{callerName}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {callState === "connected" ? (
            <Text style={styles.audioHint}>
              {isMuted
                ? "Mic muted"
                : "Mic is sending — you won’t hear yourself"}
              {"\n"}
              Speak into the mic; open a second tab as another user to hear them.
            </Text>
          ) : null}
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
            <Pressable
              style={[styles.featureBtn, isMuted && styles.featureBtnActive]}
              onPress={onToggleMute}
              accessibilityLabel={isMuted ? "Unmute" : "Mute"}
              accessibilityRole="button"
            >
              <Text style={styles.featureIcon}>{isMuted ? "🔇" : "🎤"}</Text>
              <Text style={styles.featureLabel}>
                {isMuted ? "Muted" : "Mute"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.featureBtn, isSpeakerOn && styles.featureBtnActive]}
              onPress={onToggleSpeaker}
              accessibilityLabel={isSpeakerOn ? "Speaker off" : "Speaker on"}
              accessibilityRole="button"
            >
              <Text style={styles.featureIcon}>
                {isSpeakerOn ? "🔊" : "🔈"}
              </Text>
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
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.surfaceRaised,
    opacity: 0.85,
    textAlign: "center",
  },
  audioHint: {
    marginTop: space.md,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: colors.surfaceRaised,
    opacity: 0.75,
    textAlign: "center",
    maxWidth: 280,
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
    borderRadius: radii.lg,
  },
  featureBtnActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
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
