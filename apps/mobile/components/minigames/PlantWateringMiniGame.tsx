import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";

type Props = {
  visible: boolean;
  onComplete: () => void;
  onCancel: () => void;
};

type PlantState = "dry" | "watering" | "perfect" | "overwatered";

const PERFECT_WATER_AMOUNT = 100; // Target amount
const OVERWATER_THRESHOLD = 120; // Too much water
const WATER_RATE = 2; // Water added per frame

export function PlantWateringMiniGame({ visible, onComplete, onCancel }: Props) {
  const [waterAmount, setWaterAmount] = useState(0);
  const [plantState, setPlantState] = useState<PlantState>("dry");
  const [isWatering, setIsWatering] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  const [plantAnim] = useState(new Animated.Value(0));
  const [waterAnim] = useState(new Animated.Value(0));
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setWaterAmount(0);
      setPlantState("dry");
      setIsWatering(false);
      setGameOver(false);
      plantAnim.setValue(0);
      waterAnim.setValue(0);
    }
  }, [visible]);

  // Watering loop
  useEffect(() => {
    if (!isWatering || gameOver) return;

    const interval = setInterval(() => {
      setWaterAmount((prev) => {
        const newAmount = prev + WATER_RATE;
        
        // Check plant state based on water amount
        if (newAmount >= OVERWATER_THRESHOLD) {
          setPlantState("overwatered");
          setGameOver(true);
          setIsWatering(false);
          
          // Shake animation for overwatering
          Animated.sequence([
            Animated.timing(shakeAnim, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: -10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnim, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
          ]).start();
          
          return newAmount;
        } else if (newAmount >= PERFECT_WATER_AMOUNT * 0.95 && newAmount <= PERFECT_WATER_AMOUNT * 1.05) {
          setPlantState("perfect");
        } else if (newAmount >= PERFECT_WATER_AMOUNT * 0.7) {
          setPlantState("watering");
        }
        
        return newAmount;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isWatering, gameOver]);

  // Plant growth animation
  useEffect(() => {
    const growthProgress = Math.min(waterAmount / PERFECT_WATER_AMOUNT, 1);
    Animated.spring(plantAnim, {
      toValue: growthProgress,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [waterAmount]);

  // Water flow animation
  useEffect(() => {
    if (isWatering) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waterAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(waterAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      waterAnim.setValue(0);
    }
  }, [isWatering]);

  const handleStartWatering = () => {
    if (!gameOver && plantState !== "perfect") {
      setIsWatering(true);
    }
  };

  const handleStopWatering = () => {
    setIsWatering(false);
    
    // Check if watering is complete
    if (plantState === "perfect" && !gameOver) {
      setGameOver(true);
      
      // Success animation
      Animated.sequence([
        Animated.timing(plantAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(plantAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          onComplete();
        }, 500);
      });
    }
  };

  const handleReset = () => {
    setWaterAmount(0);
    setPlantState("dry");
    setIsWatering(false);
    setGameOver(false);
    plantAnim.setValue(0);
  };

  const getPlantEmoji = () => {
    switch (plantState) {
      case "dry":
        return "🌱";
      case "watering":
        return "🪴";
      case "perfect":
        return "🌿";
      case "overwatered":
        return "🥀";
      default:
        return "🌱";
    }
  };

  const getPlantMessage = () => {
    switch (plantState) {
      case "dry":
        return "Plant needs water";
      case "watering":
        return "Keep going...";
      case "perfect":
        return "Perfect! Release now!";
      case "overwatered":
        return "Oh no! Too much water!";
      default:
        return "";
    }
  };

  const waterPercentage = (waterAmount / OVERWATER_THRESHOLD) * 100;
  const perfectZoneStart = (PERFECT_WATER_AMOUNT * 0.95 / OVERWATER_THRESHOLD) * 100;
  const perfectZoneEnd = (PERFECT_WATER_AMOUNT * 1.05 / OVERWATER_THRESHOLD) * 100;

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
            <Text style={styles.title}>🪴 Water the Plant</Text>
            <Text style={styles.subtitle}>
              Hold to water, release when perfect!
            </Text>
          </View>

          {/* Plant Display */}
          <Animated.View
            style={[
              styles.plantContainer,
              {
                transform: [
                  { translateX: shakeAnim },
                  {
                    scale: plantAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.plantEmoji}>{getPlantEmoji()}</Text>
            <Text style={styles.plantMessage}>{getPlantMessage()}</Text>
          </Animated.View>

          {/* Water Flow Indicator */}
          {isWatering && (
            <Animated.View
              style={[
                styles.waterFlow,
                {
                  opacity: waterAnim,
                },
              ]}
            >
              <Text style={styles.waterFlowText}>💧</Text>
            </Animated.View>
          )}

          {/* Water Gauge */}
          <View style={styles.gaugeContainer}>
            <Text style={styles.gaugeLabel}>Water Level</Text>
            
            <View style={styles.gauge}>
              {/* Perfect Zone Indicator */}
              <View
                style={[
                  styles.perfectZone,
                  {
                    left: `${perfectZoneStart}%`,
                    width: `${perfectZoneEnd - perfectZoneStart}%`,
                  },
                ]}
              />
              
              {/* Water Fill */}
              <Animated.View
                style={[
                  styles.waterFill,
                  {
                    width: `${Math.min(waterPercentage, 100)}%`,
                    backgroundColor:
                      plantState === "overwatered"
                        ? "#DC2626"
                        : plantState === "perfect"
                        ? "#10B981"
                        : "#3B82F6",
                  },
                ]}
              />
            </View>
            
            <View style={styles.gaugeMarkers}>
              <Text style={styles.gaugeMarkerText}>Empty</Text>
              <Text style={[styles.gaugeMarkerText, styles.perfectMarker]}>
                Perfect ⭐
              </Text>
              <Text style={styles.gaugeMarkerText}>Too Much</Text>
            </View>
          </View>

          {/* Watering Button */}
          {!gameOver || plantState === "overwatered" ? (
            <View style={styles.controls}>
              <Pressable
                style={[
                  styles.waterBtn,
                  isWatering && styles.waterBtnActive,
                  plantState === "perfect" && styles.waterBtnPerfect,
                ]}
                onPressIn={handleStartWatering}
                onPressOut={handleStopWatering}
                disabled={gameOver && plantState !== "overwatered"}
              >
                <Text style={styles.waterBtnText}>
                  {isWatering ? "💧 Watering..." : "🚿 Hold to Water"}
                </Text>
              </Pressable>
              
              {plantState === "overwatered" && (
                <Pressable style={styles.retryBtn} onPress={handleReset}>
                  <Text style={styles.retryBtnText}>↺ Try Again</Text>
                </Pressable>
              )}
            </View>
          ) : null}

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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: space.lg,
  },
  container: {
    width: "100%",
    maxWidth: 450,
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
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
  },
  plantContainer: {
    alignItems: "center",
    paddingVertical: space.xl,
    gap: space.sm,
  },
  plantEmoji: {
    fontSize: 80,
  },
  plantMessage: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  waterFlow: {
    position: "absolute",
    top: 180,
    alignSelf: "center",
  },
  waterFlowText: {
    fontSize: 40,
  },
  gaugeContainer: {
    gap: space.sm,
  },
  gaugeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
    textAlign: "center",
  },
  gauge: {
    height: 40,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    position: "relative",
    overflow: "hidden",
  },
  perfectZone: {
    position: "absolute",
    top: 0,
    height: "100%",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#10B981",
  },
  waterFill: {
    height: "100%",
  },
  gaugeMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gaugeMarkerText: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  perfectMarker: {
    color: "#10B981",
    fontWeight: "700",
  },
  controls: {
    gap: space.sm,
  },
  waterBtn: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    paddingVertical: space.xl,
    alignItems: "center",
  },
  waterBtnActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#2563EB",
  },
  waterBtnPerfect: {
    backgroundColor: "#10B981",
    borderColor: "#059669",
  },
  waterBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  retryBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignItems: "center",
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.inkMuted,
  },
});
