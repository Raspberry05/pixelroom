import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Appearance } from "@pixelroom/core";
import { PixelImage } from "../components/PixelImage";
import { TopNav } from "../components/TopNav";
import {
  getQty,
  refund,
  type InventoryState,
} from "../data/inventory";
import {
  CLOTH_CATALOG,
  STORE_TABS,
  inventoryForTab,
  spriteSourceForItem,
  type ClothStoreItem,
  type StoreTabId,
} from "../data/storeCatalog";
import { GROCERY_ITEMS, type GroceryItem } from "../data/groceryItems";
import { WORLD_SCALE } from "../data/roomLayout";
import { colors, radii, space, typography } from "../theme";

type Props = {
  inventory: InventoryState;
  onChangeInventory: (next: InventoryState) => void;
  coins: number;
  onChangeCoins: (next: number) => void;
  ownedClothes: string[];
  onUnlockCloth: (id: string, patch: Partial<Appearance>) => void;
};

const COINS_KEY = "pixelroom.coins";
const THUMB = 48 * WORLD_SCALE;

export function loadCoins(fallback = 500): number {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(COINS_KEY);
      if (raw != null) return Number(raw) || fallback;
    } catch {
      // ignore
    }
  }
  return fallback;
}

export function saveCoins(value: number) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(COINS_KEY, String(value));
    } catch {
      // ignore
    }
  }
}

export function StoreScreen({
  inventory,
  onChangeInventory,
  coins,
  onChangeCoins,
  ownedClothes,
  onUnlockCloth,
}: Props) {
  const [tab, setTab] = useState<StoreTabId>("furniture");
  const ownedSet = useMemo(() => new Set(ownedClothes), [ownedClothes]);

  function buyInventory(id: string, price: number) {
    if (coins < price) return;
    onChangeCoins(coins - price);
    onChangeInventory(refund(inventory, id, 1));
  }

  function buyGrocery(item: GroceryItem) {
    if (coins < item.price) return;
    onChangeCoins(coins - item.price);
    onChangeInventory(refund(inventory, item.id, 1));
  }

  function buyCloth(item: ClothStoreItem) {
    if (ownedSet.has(item.id)) {
      onUnlockCloth(item.id, item.patch);
      return;
    }
    if (coins < item.price) return;
    onChangeCoins(coins - item.price);
    onUnlockCloth(item.id, item.patch);
  }

  const inventoryItems = inventoryForTab(tab);

  return (
    <View style={styles.flex}>
      <TopNav title="The Store" subtitle={`${coins} coins`} />

      <View style={styles.tabs}>
        {STORE_TABS.map((t) => {
          const on = t.id === tab;
          return (
            <Pressable
              key={t.id}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {tab === "grocery"
          ? GROCERY_ITEMS.map((item) => {
              const owned = getQty(inventory, item.id);
              const canBuy = coins >= item.price;
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.thumbWrap}>
                    <Text style={styles.groceryEmoji}>{item.emoji}</Text>
                  </View>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>owned ×{owned}</Text>
                  <Pressable
                    style={[styles.btn, !canBuy && styles.btnDisabled]}
                    onPress={() => buyGrocery(item)}
                    disabled={!canBuy}
                  >
                    <Text style={styles.btnText}>Buy · {item.price}c</Text>
                  </Pressable>
                </View>
              );
            })
          : tab === "clothes"
            ? CLOTH_CATALOG.map((item) => {
              const owned = ownedSet.has(item.id);
              const canBuy = owned || coins >= item.price;
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.thumbWrap}>
                    <PixelImage source={item.source} width={THUMB} height={THUMB} />
                  </View>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{owned ? "owned · equip" : "outfit"}</Text>
                  <Pressable
                    style={[styles.btn, !canBuy && styles.btnDisabled]}
                    onPress={() => buyCloth(item)}
                    disabled={!canBuy}
                  >
                    <Text style={styles.btnText}>
                      {owned ? "Equip" : `Buy · ${item.price}c`}
                    </Text>
                  </Pressable>
                </View>
              );
            })
            : inventoryItems.map((item) => {
              const owned = getQty(inventory, item.id);
              const canBuy = coins >= item.price;
              const source = spriteSourceForItem(item);
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.thumbWrap}>
                    {source ? (
                      <PixelImage source={source} width={THUMB} height={THUMB} />
                    ) : (
                      <View style={styles.swatchFallback} />
                    )}
                  </View>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>owned ×{owned}</Text>
                  <Pressable
                    style={[styles.btn, !canBuy && styles.btnDisabled]}
                    onPress={() => buyInventory(item.id, item.price)}
                    disabled={!canBuy}
                  >
                    <Text style={styles.btnText}>Buy +1 · {item.price}c</Text>
                  </Pressable>
                </View>
              );
            })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  tabs: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.pill,
  },
  tabOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tabText: {
    ...typography.caption,
    color: colors.inkMuted,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  tabTextOn: { color: colors.accent },
  grid: {
    padding: space.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  card: {
    width: "47%",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    padding: space.md,
    gap: space.sm,
  },
  thumbWrap: {
    height: THUMB + 8,
    borderRadius: radii.md,
    backgroundColor: colors.bgDeep,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  swatchFallback: {
    width: THUMB,
    height: THUMB,
    backgroundColor: colors.furniture,
    borderRadius: radii.sm,
  },
  name: { ...typography.body, fontWeight: "700", color: colors.ink },
  meta: {
    ...typography.caption,
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  btn: {
    marginTop: space.xs,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.surfaceRaised, fontWeight: "700", fontSize: 12 },
  groceryEmoji: {
    fontSize: 48,
  },
});
