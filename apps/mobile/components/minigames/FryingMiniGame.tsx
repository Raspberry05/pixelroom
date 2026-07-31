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
import type { IngredientAmount, CookedDish } from "../../data/recipes";
import { createDish } from "../../data/recipes";

type Props = {
  visible: boolean;
  selectedIngredients?: IngredientAmount[];
  onComplete: (dish?: CookedDish) => void;
  onCancel: () => void;
};

type FryingPhase = "heating" | "frying" | "done";
type TemperatureZone = "cold" | "warm" | "perfect" | "hot" | "burning";

const PERFECT_TEMP_MIN = 65;
const PERFECT_TEMP_MAX = 75;
const BURN_TEMP = 90;
const TARGET_FRY_TIME = 100; // Percentage of fry time needed

export function FryingMiniGame({
  visible,
  selectedIngredients,
  onComplete,
  onCancel,
}: Props) {
  const [phase, setPhase] = useState<FryingPhase>("heating");
  const [temperature, setTemperature] = useState(20); // 0-100
  const [fryProgress, setFryProgress] = useState(0); // 0-100
  const [isBurned, setIsBurned] = useState(false);
  
  const [tempAnim] = useState(new Animated.Value(0));
  const [sizzleAnim] = useState(new Animated.Value(0));
  const [smokeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setPhase("heating");
      setTemperature(20);
      setFryProgress(0);
      setIsBurned(false);
    }
  }, [visible]);

  // Temperature animation
  useEffect(() => {
    Animated.spring(tempAnim, {
      toValue: temperature / 100,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [temperature]);

  // Sizzle animation when in perfect zone
  useEffect(() => {
    if (phase === "frying" && temperature >= PERFECT_TEMP_MIN && temperature <= PERFECT_TEMP_MAX) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sizzleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(sizzleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      sizzleAnim.setValue(0);
    }
  }, [phase, temperature]);

  // Smoke animation when too hot
  useEffect(() => {
    if (temperature > BURN_TEMP) {
      Animated.loop(
        Animated.timing(smokeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      smokeAnim.setValue(0);
    }
  }, [temperature]);

  // Auto heat-up during heating phase
  useEffect(() => {
    if (phase === "heating") {
      const interval = setInterval(() => {
        setTemperature((prev) => {
          const next = Math.min(prev + 2, 100);
          if (next >= PERFECT_TEMP_MIN) {
            setPhase("frying");
          }
          return next;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Temperature fluctuation and frying progress during frying phase
  useEffect(() => {
    if (phase === "frying") {
      const interval = setInterval(() => {
        // Temperature naturally increases
        setTemperature((prev) => {
          let next = prev + 0.5;
          
          // Check for burning
          if (next > BURN_TEMP) {
            setIsBurned(true);
            setPhase("done");
            return next;
          }
          
          return Math.min(next, 100);
        });
        
        // Increase fry progress if in good temperature range
        setFryProgress((prev) => {
          if (temperature >= PERFECT_TEMP_MIN - 5 && temperature <= PERFECT_TEMP_MAX + 10 && !isBurned) {
            const next = prev + (temperature >= PERFECT_TEMP_MIN && temperature <= PERFECT_TEMP_MAX ? 1.5 : 0.5);
            
            if (next >= TARGET_FRY_TIME) {
              setPhase("done");
              // Success!
              setTimeout(() => {
                const dish = selectedIngredients ? createDish(selectedIngredients) : undefined;
                onComplete(dish);
              }, 800);
            }
            
            return Math.min(next, 100);
          }
          return prev;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [phase, temperature, isBurned]);

  const handleReduceHeat = () => {
    if (phase === "frying") {
      setTemperature((prev) => Math.max(prev - 5, 0));
    }
  };

  const handleIncreaseHeat = () => {
    if (phase === "frying") {
      setTemperature((prev) => Math.min(prev + 5, 100));
    }
  };

  const getTemperatureZone = (): TemperatureZone => {
    if (temperature < 40) return "cold";
    if (temperature < PERFECT_TEMP_MIN) return "warm";
    if (temperature <= PERFECT_TEMP_MAX) return "perfect";
    if (temperature < BURN_TEMP) return "hot";
    return "burning";
  };

  const getTemperatureColor = (): string => {
    const zone = getTemperatureZone();
    switch (zone) {
      case "cold":
        return "#3B82F6";
      case "warm":
        return "#F59E0B";
      case "perfect":
        return "#10B981";
      case "hot":
        return "#F97316";
      case "burning":
        return "#DC2626";
    }
  };

  const getPhaseMessage = (): string => {
    if (isBurned) return "Oh no! Food is burned! 🔥";
    
    switch (phase) {
      case "heating":
        return "Heating up the oil...";
      case "frying":
        const zone = getTemperatureZone();
        if (zone === "perfect") return "Perfect! Keep it steady! ✨";
        if (zone === "hot") return "Too hot! Reduce heat!";
        if (zone === "warm") return "Getting there...";
        if (zone === "cold") return "Need more heat!";
        return "Frying...";
      case "done":
        return isBurned ? "Burned!" : "Perfectly fried! 🍗";
    }
  };

  const tempPercentage = temperature;
  const perfectZoneStart = PERFECT_TEMP_MIN;
  const perfectZoneEnd = PERFECT_TEMP_MAX;

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
            <Text style={styles.title}>🍳 Frying</Text>
            <Text style={styles.subtitle}>{getPhaseMessage()}</Text>
          </View>

          {/* Fryer Visual */}
          <View style={styles.fryerContainer}>
            <View style={styles.fryer}>
              {/* Oil */}
              <View style={[styles.oil, { backgroundColor: getTemperatureColor() }]}>
                {/* Sizzle effect */}
                {phase === "frying" && !isBurned && (
                  <Animated.View
                    style={[
                      styles.sizzle,
                      {
                        opacity: sizzleAnim,
                      },
                    ]}
                  >
                    <Text style={styles.sizzleText}>💧💧💧</Text>
                  </Animated.View>
                )}
                
                {/* Food icon */}
                <Text style={styles.foodIcon}>
                  {isBurned ? "🥵" : "🍗"}
                </Text>
              </View>
              
              {/* Smoke when burning */}
              {temperature > BURN_TEMP && (
                <Animated.View
                  style={[
                    styles.smoke,
                    {
                      opacity: smokeAnim,
                      transform: [{
                        translateY: smokeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -30],
                        }),
                      }],
                    },
                  ]}
                >
                  <Text style={styles.smokeText}>💨💨💨</Text>
                </Animated.View>
              )}
            </View>
          </View>

          {/* Temperature Gauge */}
          <View style={styles.gaugeContainer}>
            <Text style={styles.gaugeLabel}>Oil Temperature</Text>
            
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
              
              {/* Temperature Fill */}
              <View
                style={[
                  styles.tempFill,
                  {
                    width: `${Math.min(tempPercentage, 100)}%`,
                    backgroundColor: getTemperatureColor(),
                  },
                ]}
              />
            </View>
            
            <View style={styles.gaugeMarkers}>
              <Text style={styles.gaugeMarkerText}>Cold</Text>
              <Text style={[styles.gaugeMarkerText, styles.perfectMarker]}>
                Perfect 🌟
              </Text>
              <Text style={styles.gaugeMarkerText}>Burning</Text>
            </View>
          </View>

          {/* Fry Progress */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Frying Progress</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(fryProgress, 100)}%`,
                    backgroundColor: isBurned ? "#DC2626" : colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.floor(fryProgress)}%</Text>
          </View>

          {/* Heat Controls */}
          {phase === "frying" && !isBurned && (
            <View style={styles.controls}>
              <Pressable style={styles.heatBtn} onPress={handleReduceHeat}>
                <Text style={styles.heatBtnText}>🔽 Reduce Heat</Text>
              </Pressable>
              <Pressable style={styles.heatBtn} onPress={handleIncreaseHeat}>
                <Text style={styles.heatBtnText}>🔼 Increase Heat</Text>
              </Pressable>
            </View>
          )}

          {isBurned && (
            <Pressable style={styles.retryBtn} onPress={onCancel}>
              <Text style={styles.retryBtnText}>💔 Try Again</Text>
            </Pressable>
          )}

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
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkMuted,
    textAlign: "center",
  },
  fryerContainer: {
    alignItems: "center",
    paddingVertical: space.lg,
  },
  fryer: {
    width: 200,
    height: 150,
    backgroundColor: "#1F2937",
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: "#374151",
    position: "relative",
    overflow: "hidden",
  },
  oil: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sizzle: {
    position: "absolute",
    top: 20,
  },
  sizzleText: {
    fontSize: 20,
  },
  foodIcon: {
    fontSize: 50,
  },
  smoke: {
    position: "absolute",
    top: -20,
    alignSelf: "center",
  },
  smokeText: {
    fontSize: 30,
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
  tempFill: {
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
  progressContainer: {
    gap: space.xs,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkMuted,
    textAlign: "center",
  },
  progressBar: {
    height: 24,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressText: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    gap: space.sm,
  },
  heatBtn: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: space.md,
    alignItems: "center",
  },
  heatBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  retryBtn: {
    backgroundColor: "#DC2626",
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: "#B91C1C",
    paddingVertical: space.md,
    alignItems: "center",
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
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
