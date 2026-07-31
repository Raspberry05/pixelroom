import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";
import { getGroceryItem, type GroceryItem } from "../../data/groceryItems";
import type { IngredientAmount } from "../../data/recipes";

type Props = {
  visible: boolean;
  availableIngredients: Record<string, number>; // ingredientId -> quantity available
  onConfirm: (selected: IngredientAmount[]) => void;
  onCancel: () => void;
};

export function IngredientSelector({
  visible,
  availableIngredients,
  onConfirm,
  onCancel,
}: Props) {
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({});

  const availableItems = Object.keys(availableIngredients)
    .map((id) => getGroceryItem(id))
    .filter((item): item is GroceryItem => item !== undefined);

  const handleIncrement = (ingredientId: string) => {
    const current = selectedAmounts[ingredientId] ?? 0;
    const available = availableIngredients[ingredientId] ?? 0;
    if (current < available) {
      setSelectedAmounts((prev) => ({
        ...prev,
        [ingredientId]: current + 1,
      }));
    }
  };

  const handleDecrement = (ingredientId: string) => {
    const current = selectedAmounts[ingredientId] ?? 0;
    if (current > 0) {
      setSelectedAmounts((prev) => ({
        ...prev,
        [ingredientId]: current - 1,
      }));
    }
  };

  const handleConfirm = () => {
    const selected: IngredientAmount[] = Object.entries(selectedAmounts)
      .filter(([_, amount]) => amount > 0)
      .map(([ingredientId, amount]) => ({ ingredientId, amount }));
    
    if (selected.length === 0) {
      return; // Need at least one ingredient
    }
    
    onConfirm(selected);
    setSelectedAmounts({}); // Reset for next time
  };

  const handleCancel = () => {
    setSelectedAmounts({});
    onCancel();
  };

  const totalSelected = Object.values(selectedAmounts).reduce((sum, n) => sum + n, 0);
  const canStartCooking = totalSelected > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🍳 Select Ingredients</Text>
            <Text style={styles.subtitle}>
              Choose what to cook ({totalSelected} selected)
            </Text>
          </View>

          {availableItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyText}>No ingredients available!</Text>
              <Text style={styles.emptyHint}>
                Visit the store's Grocery tab to buy ingredients
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {availableItems.map((item) => {
                const available = availableIngredients[item.id] ?? 0;
                const selected = selectedAmounts[item.id] ?? 0;
                
                return (
                  <View key={item.id} style={styles.ingredientRow}>
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientEmoji}>{item.emoji}</Text>
                      <View style={styles.ingredientText}>
                        <Text style={styles.ingredientName}>{item.name}</Text>
                        <Text style={styles.ingredientAvailable}>
                          {available} available
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.controls}>
                      <Pressable
                        style={[
                          styles.controlBtn,
                          selected === 0 && styles.controlBtnDisabled,
                        ]}
                        onPress={() => handleDecrement(item.id)}
                        disabled={selected === 0}
                      >
                        <Text style={styles.controlBtnText}>−</Text>
                      </Pressable>
                      
                      <Text style={styles.amount}>{selected}</Text>
                      
                      <Pressable
                        style={[
                          styles.controlBtn,
                          selected >= available && styles.controlBtnDisabled,
                        ]}
                        onPress={() => handleIncrement(item.id)}
                        disabled={selected >= available}
                      >
                        <Text style={styles.controlBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={[styles.confirmBtn, !canStartCooking && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!canStartCooking}
            >
              <Text style={[styles.confirmText, !canStartCooking && styles.confirmTextDisabled]}>
                Start Cooking
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    maxHeight: "80%",
  },
  header: {
    padding: space.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    alignItems: "center",
    gap: space.xs,
  },
  title: {
    ...typography.brand,
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  emptyState: {
    padding: space.xl,
    alignItems: "center",
    gap: space.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: space.md,
    gap: space.sm,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.md,
  },
  ingredientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    flex: 1,
  },
  ingredientEmoji: {
    fontSize: 36,
  },
  ingredientText: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  ingredientAvailable: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  controlBtn: {
    width: 36,
    height: 36,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnDisabled: {
    backgroundColor: colors.bgDeep,
    borderColor: colors.border,
    opacity: 0.5,
  },
  controlBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    minWidth: 24,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  footer: {
    flexDirection: "row",
    padding: space.md,
    gap: space.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.md,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    paddingVertical: space.md,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: colors.bgDeep,
    borderColor: colors.border,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  confirmTextDisabled: {
    color: colors.inkFaint,
  },
});
