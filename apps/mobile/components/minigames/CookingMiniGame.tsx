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

type Props = {
  visible: boolean;
  selectedIngredients?: IngredientAmount[];
  onComplete: (dish?: CookedDish) => void;
  onCancel: () => void;
};

type Ingredient = {
  id: number;
  name: string;
  emoji: string;
  added: boolean;
};

const RECIPE_STEPS = [
  { id: 1, name: "Tomato", emoji: "🍅" },
  { id: 2, name: "Onion", emoji: "🧅" },
  { id: 3, name: "Garlic", emoji: "🧄" },
  { id: 4, name: "Pasta", emoji: "🍝" },
];

export function CookingMiniGame({ visible, selectedIngredients, onComplete, onCancel }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [cookingProgress, setCookingProgress] = useState(0);
  const [shakeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      const shuffled = [...RECIPE_STEPS]
        .sort(() => Math.random() - 0.5)
        .map((step) => ({ ...step, added: false }));
      setIngredients(shuffled);
      setCurrentStep(0);
      setCookingProgress(0);
    }
  }, [visible]);

  useEffect(() => {
    if (currentStep >= RECIPE_STEPS.length && visible) {
      // Start cooking animation
      const timer = setInterval(() => {
        setCookingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              // Calculate dish result if ingredients were provided
              if (selectedIngredients && selectedIngredients.length > 0) {
                const { createDish } = require("../../data/recipes");
                const dish = createDish(selectedIngredients);
                onComplete(dish);
              } else {
                onComplete();
              }
            }, 500);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(timer);
    }
  }, [currentStep, visible, onComplete, selectedIngredients]);

  const handleIngredientPress = (ingredient: Ingredient) => {
    const correctIngredient = RECIPE_STEPS[currentStep];
    
    if (!correctIngredient) return;
    
    if (ingredient.id === correctIngredient.id) {
      // Correct ingredient!
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setIngredients((prev) =>
        prev.map((ing) =>
          ing.id === ingredient.id ? { ...ing, added: true } : ing,
        ),
      );
      setCurrentStep((prev) => prev + 1);
    } else {
      // Wrong ingredient - shake
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
    }
  };

  const isCompleting = currentStep >= RECIPE_STEPS.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>🍳 Cook a Meal</Text>
            <Text style={styles.subtitle}>
              {isCompleting
                ? "Cooking..."
                : `Add ingredients in order! (${currentStep}/${RECIPE_STEPS.length})`}
            </Text>
          </View>

          {!isCompleting ? (
            <>
              <View style={styles.recipeHint}>
                <Text style={styles.hintText}>Next ingredient:</Text>
                <View style={styles.nextIngredient}>
                  <Text style={styles.ingredientEmoji}>
                    {RECIPE_STEPS[currentStep]?.emoji}
                  </Text>
                  <Text style={styles.ingredientName}>
                    {RECIPE_STEPS[currentStep]?.name}
                  </Text>
                </View>
              </View>

              <View style={styles.ingredientsGrid}>
                {ingredients.map((ingredient) => (
                  <Pressable
                    key={ingredient.id}
                    style={[
                      styles.ingredientBtn,
                      ingredient.added && styles.ingredientBtnUsed,
                    ]}
                    onPress={() => handleIngredientPress(ingredient)}
                    disabled={ingredient.added}
                  >
                    <Text style={styles.ingredientEmoji}>
                      {ingredient.emoji}
                    </Text>
                    <Text
                      style={[
                        styles.ingredientLabel,
                        ingredient.added && styles.ingredientLabelUsed,
                      ]}
                    >
                      {ingredient.name}
                    </Text>
                    {ingredient.added && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.cookingArea}>
              <Text style={styles.pot}>🍲</Text>
              <Text style={styles.cookingText}>Cooking...</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${cookingProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{Math.floor(cookingProgress)}%</Text>
            </View>
          )}

          {!isCompleting && (
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </Animated.View>
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
  recipeHint: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: space.md,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    gap: space.xs,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  nextIngredient: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  ingredientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    justifyContent: "center",
    marginVertical: space.md,
  },
  ingredientBtn: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: space.sm,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  ingredientBtnUsed: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    opacity: 0.6,
  },
  ingredientEmoji: {
    fontSize: 48,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  ingredientLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  ingredientLabelUsed: {
    color: colors.surfaceRaised,
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 24,
    color: colors.surfaceRaised,
  },
  cookingArea: {
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.xl,
  },
  pot: {
    fontSize: 80,
  },
  cookingText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  progressBar: {
    width: "100%",
    height: 20,
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
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.inkMuted,
    fontVariant: ["tabular-nums"],
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
