import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, space } from "../theme";

type Props = {
  duration: number;
  callerName: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  /** 0–1 local mic level (visual only — you never hear yourself). */
  micLevel?: number;
  hasRemoteAudio?: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
};

export function CallControls({
  duration,
  callerName,
  isMuted,
  isSpeakerOn,
  micLevel = 0,
  hasRemoteAudio = false,
  onToggleMute,
  onToggleSpeaker,
  onEndCall,
}: Props) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const levelPct = Math.round(Math.min(1, Math.max(0, micLevel)) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={styles.callInfo}>
          <View style={styles.pulseIndicator} />
          <Text style={styles.callerName} numberOfLines={1}>
            {callerName}
          </Text>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        </View>
        <View style={styles.meterRow}>
          <Text style={styles.meterLabel}>
            {isMuted ? "Mic muted" : "Mic live"}
          </Text>
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: `${isMuted ? 0 : levelPct}%` },
                levelPct > 8 && styles.meterFillHot,
              ]}
            />
          </View>
          <Text style={styles.meterHint}>
            {hasRemoteAudio ? "Hearing peer" : "No peer audio yet"}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={onToggleMute}
          accessibilityLabel={isMuted ? "Unmute" : "Mute"}
          accessibilityRole="button"
        >
          <Text style={styles.controlIcon}>{isMuted ? "🔇" : "🎤"}</Text>
          <Text style={styles.controlLabel}>
            {isMuted ? "Muted" : "Mute"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.endCallBtn]}
          onPress={onEndCall}
          accessibilityLabel="End call"
          accessibilityRole="button"
        >
          <Text style={styles.endCallIcon}>📞</Text>
        </Pressable>

        <Pressable
          style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
          onPress={onToggleSpeaker}
          accessibilityLabel={isSpeakerOn ? "Speaker off" : "Speaker on"}
          accessibilityRole="button"
        >
          <Text style={styles.controlIcon}>
            {isSpeakerOn ? "🔊" : "🔈"}
          </Text>
          <Text style={styles.controlLabel}>
            {isSpeakerOn ? "Speaker" : "Speaker"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: space.md,
    paddingBottom: space.sm,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  statusBar: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: space.sm,
    gap: space.sm,
  },
  callInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2ecc71",
  },
  callerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  duration: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  meterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
    width: 64,
  },
  meterTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgDeep,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  meterFillHot: {
    backgroundColor: colors.accentHot,
  },
  meterHint: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkFaint,
    maxWidth: 110,
    textAlign: "right",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  controlBtn: {
    alignItems: "center",
    gap: 4,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 80,
  },
  controlBtnActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink,
    textTransform: "uppercase",
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e74c3c",
    borderWidth: 3,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  endCallIcon: {
    fontSize: 28,
    transform: [{ rotate: "135deg" }],
  },
});
