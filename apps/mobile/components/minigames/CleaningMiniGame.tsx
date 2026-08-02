import { useState, useRef } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  PanResponder,
  Animated,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";

type Props = {
  visible: boolean;
  dirtLevel: number;
  onComplete: () => void;
  onCancel: () => void;
};

type DirtSpot = {
  id: number;
  x: number;
  y: number;
  cleaned: boolean;
  type: "dust" | "spiderweb" | "stain";
};

export function CleaningMiniGame({
  visible,
  dirtLevel,
  onComplete,
  onCancel,
}: Props) {
  const spotsNeeded = Math.min(5 + dirtLevel * 2, 15);
  const [dirtSpots] = useState<DirtSpot[]>(() =>
    Array.from({ length: spotsNeeded }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10, // 10-90% range
      y: Math.random() * 70 + 15, // 15-85% range
      cleaned: false,
      type: i < 5 ? "dust" : i < 10 ? "stain" : "spiderweb",
    })),
  );
  const [cleanedSpots, setCleanedSpots] = useState<Set<number>>(new Set());
  const [scrubPosition, setScrubPosition] = useState({ x: 50, y: 50 });
  const scrubRadius = 15; // percentage

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        handleScrub(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => {
        handleScrub(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
    }),
  ).current;

  const handleScrub = (x: number, y: number) => {
    // Convert to percentage
    const percentX = (x / 300) * 100;
    const percentY = (y / 300) * 100;
    setScrubPosition({ x: percentX, y: percentY });

    // Check if any dirt spots are within scrub radius
    dirtSpots.forEach((spot) => {
      if (!cleanedSpots.has(spot.id)) {
        const dist = Math.sqrt(
          Math.pow(percentX - spot.x, 2) + Math.pow(percentY - spot.y, 2),
        );
        if (dist < scrubRadius) {
          setCleanedSpots((prev) => {
            const newSet = new Set(prev);
            newSet.add(spot.id);
            if (newSet.size >= spotsNeeded) {
              setTimeout(() => {
                onComplete();
              }, 300);
            }
            return newSet;
          });
        }
      }
    });
  };

  const progress = (cleanedSpots.size / spotsNeeded) * 100;

  const getSpotEmoji = (type: DirtSpot["type"]): string => {
    switch (type) {
      case "dust":
        return "💨";
      case "stain":
        return "🟤";
      case "spiderweb":
        return "🕸️";
      default:
        return "💨";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🧹 Clean the Room</Text>
            <Text style={styles.subtitle}>
              Scrub away the dirt! ({cleanedSpots.size}/{spotsNeeded})
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.cleaningArea} {...panResponder.panHandlers}>
            {dirtSpots.map((spot) => (
              <View
                key={spot.id}
                style={[
                  styles.dirtSpot,
                  {
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                    opacity: cleanedSpots.has(spot.id) ? 0 : 1,
                  },
                ]}
              >
                <Text style={styles.dirtEmoji}>{getSpotEmoji(spot.type)}</Text>
              </View>
            ))}

            <View
              style={[
                styles.scrubber,
                {
                  left: `${scrubPosition.x}%`,
                  top: `${scrubPosition.y}%`,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.scrubberIcon}>🧽</Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Drag your finger to scrub away the dirt!
          </Text>

          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: space.lg,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    padding: space.lg,
    gap: space.md,
  },
  header: {
    alignItems: "center",
    gap: space.xs,
  },
  title: {
    ...typography.brand,
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    color: colors.inkMuted,
    fontSize: 14,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.pill,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  cleaningArea: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    position: "relative",
    overflow: "hidden",
  },
  dirtSpot: {
    position: "absolute",
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  dirtEmoji: {
    fontSize: 28,
  },
  scrubber: {
    position: "absolute",
    width: 50,
    height: 50,
    marginLeft: -25,
    marginTop: -25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  scrubberIcon: {
    fontSize: 32,
  },
  hint: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    textAlign: "center",
    textTransform: "uppercase",
  },
  cancelBtn: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignItems: "center",
    marginTop: space.sm,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
  },
});
