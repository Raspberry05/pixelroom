import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  loadClothCatalog,
  loadDishCatalog,
  loadGroceryCatalog,
  loadHousingSkuCatalog,
  saveClothCatalog,
  saveDishCatalog,
  saveGroceryCatalog,
  saveHousingSkuCatalog,
  seedDishesFromRecipes,
  seedHousingSkusFromInventory,
  type DevToolsClothItem,
  type DevToolsDishItem,
  type DevToolsGroceryItem,
  type DevToolsHousingSku,
} from "../../data/catalogExtras";
import {
  GROCERY_CATEGORIES,
  type GroceryCategory,
} from "../../data/groceryItems";
import { colors, radii, space, typography } from "../../theme";
import {
  CatalogAtlasSection,
  CatalogCropThumb,
} from "./CatalogAtlasSection";

type GroceryProps = {
  items: DevToolsGroceryItem[];
  onChange: (items: DevToolsGroceryItem[]) => void;
};

export function GroceryItemsEditor({ items, onChange }: GroceryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?.id ?? null,
  );
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const patch = (updates: Partial<DevToolsGroceryItem>) => {
    if (!selected) return;
    onChange(
      items.map((i) =>
        i.id === selected.id
          ? { ...i, ...updates, updatedAt: Date.now() }
          : i,
      ),
    );
  };

  const addNew = () => {
    const id = `grocery_${Date.now().toString(36)}`;
    const row: DevToolsGroceryItem = {
      id,
      name: "New grocery",
      category: "fruit",
      emoji: "🧺",
      price: 5,
      description: "",
      sellableInStore: true,
      atlasKey: "interior",
      spriteX: 0,
      spriteY: 0,
      spriteWidth: 16,
      spriteHeight: 16,
      updatedAt: Date.now(),
    };
    onChange([...items, row]);
    setSelectedId(id);
  };

  const remove = () => {
    if (!selected) return;
    if (!confirm(`Delete “${selected.name}”?`)) return;
    const next = items.filter((i) => i.id !== selected.id);
    onChange(next);
    setSelectedId(next[0]?.id ?? null);
  };

  return (
    <View style={styles.split}>
      <View style={styles.side}>
        <View style={styles.sideHead}>
          <Text style={styles.sideTitle}>Grocery</Text>
          <Pressable style={styles.newBtn} onPress={addNew}>
            <Text style={styles.newBtnText}>+ New</Text>
          </Pressable>
        </View>
        <ScrollView>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.row, selectedId === item.id && styles.rowOn]}
              onPress={() => setSelectedId(item.id)}
            >
              <CatalogCropThumb
                crop={item}
                size={28}
                fallback={<Text style={styles.emoji}>{item.emoji}</Text>}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.price}c · {item.category}
                  {item.sellableInStore === false ? " · hidden" : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.main}>
        {!selected ? (
          <Text style={styles.empty}>Select a grocery item</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={selected.name}
              onChangeText={(name) => patch({ name })}
            />
            <Text style={styles.label}>Emoji (fallback)</Text>
            <TextInput
              style={styles.input}
              value={selected.emoji}
              onChangeText={(emoji) => patch({ emoji })}
            />
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(selected.price)}
              onChangeText={(t) => patch({ price: parseInt(t, 10) || 0 })}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={selected.description}
              onChangeText={(description) => patch({ description })}
            />
            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {GROCERY_CATEGORIES.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.chip,
                    selected.category === c.id && styles.chipOn,
                  ]}
                  onPress={() => patch({ category: c.id as GroceryCategory })}
                >
                  <Text style={styles.chipText}>
                    {c.emoji} {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>In Store</Text>
            <View style={styles.chips}>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore !== false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: true })}
              >
                <Text style={styles.chipText}>Sellable</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore === false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: false })}
              >
                <Text style={styles.chipText}>Hidden</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.chip, selected.requiresFridge && styles.chipOn]}
              onPress={() =>
                patch({ requiresFridge: !selected.requiresFridge })
              }
            >
              <Text style={styles.chipText}>
                {selected.requiresFridge ? "✓ Needs fridge" : "Needs fridge?"}
              </Text>
            </Pressable>

            <CatalogAtlasSection
              itemId={selected.id}
              itemName={selected.name}
              crop={selected}
              onChangeCrop={patch}
            />

            <Pressable style={styles.dangerBtn} onPress={remove}>
              <Text style={styles.dangerText}>Delete</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

type ClothProps = {
  items: DevToolsClothItem[];
  onChange: (items: DevToolsClothItem[]) => void;
};

export function ClothesItemsEditor({ items, onChange }: ClothProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?.id ?? null,
  );
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const patch = (updates: Partial<DevToolsClothItem>) => {
    if (!selected) return;
    onChange(
      items.map((i) =>
        i.id === selected.id
          ? { ...i, ...updates, updatedAt: Date.now() }
          : i,
      ),
    );
  };

  return (
    <View style={styles.split}>
      <View style={styles.side}>
        <View style={styles.sideHead}>
          <Text style={styles.sideTitle}>Clothes</Text>
        </View>
        <ScrollView>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.row, selectedId === item.id && styles.rowOn]}
              onPress={() => setSelectedId(item.id)}
            >
              <CatalogCropThumb crop={item} size={28} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.price}c
                  {item.sellableInStore === false ? " · hidden" : " · store"}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.main}>
        {!selected ? (
          <Text style={styles.empty}>Select a clothing item</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={selected.name}
              onChangeText={(name) => patch({ name })}
            />
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(selected.price)}
              onChangeText={(t) => patch({ price: parseInt(t, 10) || 0 })}
            />
            <Text style={styles.label}>In Store</Text>
            <View style={styles.chips}>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore !== false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: true })}
              >
                <Text style={styles.chipText}>Sellable</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore === false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: false })}
              >
                <Text style={styles.chipText}>Hidden</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Appearance patch stays linked to this outfit. Crop the sheet below
              for Store thumbs.
            </Text>

            <CatalogAtlasSection
              itemId={selected.id}
              itemName={selected.name}
              crop={selected}
              onChangeCrop={patch}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

type DishProps = {
  items: DevToolsDishItem[];
  onChange: (items: DevToolsDishItem[]) => void;
};

export function DishesItemsEditor({ items, onChange }: DishProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?.id ?? null,
  );
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const patch = (updates: Partial<DevToolsDishItem>) => {
    if (!selected) return;
    onChange(
      items.map((i) =>
        i.id === selected.id
          ? { ...i, ...updates, updatedAt: Date.now() }
          : i,
      ),
    );
  };

  const seed = () => {
    const next = seedDishesFromRecipes(items);
    onChange(next);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  };

  const addNew = () => {
    const id = `dish_${Date.now().toString(36)}`;
    const row: DevToolsDishItem = {
      id,
      recipeId: null,
      name: "New dish",
      emoji: "🍽️",
      description: "",
      sellableInStore: false,
      price: 25,
      atlasKey: "interior",
      spriteX: 0,
      spriteY: 0,
      spriteWidth: 16,
      spriteHeight: 16,
      updatedAt: Date.now(),
    };
    onChange([...items, row]);
    setSelectedId(id);
  };

  const remove = () => {
    if (!selected) return;
    if (!confirm(`Delete “${selected.name}”?`)) return;
    const next = items.filter((i) => i.id !== selected.id);
    onChange(next);
    setSelectedId(next[0]?.id ?? null);
  };

  return (
    <View style={styles.split}>
      <View style={styles.side}>
        <View style={styles.sideHead}>
          <Text style={styles.sideTitle}>Dishes</Text>
          <View style={styles.sideActions}>
            <Pressable style={styles.seedBtn} onPress={seed}>
              <Text style={styles.seedBtnText}>Seed recipes</Text>
            </Pressable>
            <Pressable style={styles.newBtn} onPress={addNew}>
              <Text style={styles.newBtnText}>+ New</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.row, selectedId === item.id && styles.rowOn]}
              onPress={() => setSelectedId(item.id)}
            >
              <CatalogCropThumb
                crop={item}
                size={28}
                fallback={<Text style={styles.emoji}>{item.emoji}</Text>}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.recipeId ? `recipe · ${item.recipeId}` : "custom"}
                  {item.sellableInStore === false ? " · hidden" : " · store"}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.main}>
        {!selected ? (
          <Text style={styles.empty}>
            Seed recipes or select a dish — crop end-result art here.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={selected.name}
              onChangeText={(name) => patch({ name })}
            />
            <Text style={styles.label}>Emoji (fallback)</Text>
            <TextInput
              style={styles.input}
              value={selected.emoji}
              onChangeText={(emoji) => patch({ emoji })}
            />
            <Text style={styles.label}>Price (if sellable)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(selected.price ?? 25)}
              onChangeText={(t) => patch({ price: parseInt(t, 10) || 0 })}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={selected.description}
              onChangeText={(description) => patch({ description })}
            />
            <Text style={styles.hint}>
              {selected.recipeId
                ? `Linked recipe: ${selected.recipeId}`
                : "Custom dish (no recipe link)"}
            </Text>
            <Text style={styles.label}>In Store</Text>
            <View style={styles.chips}>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore !== false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: true })}
              >
                <Text style={styles.chipText}>Sellable</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore === false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: false })}
              >
                <Text style={styles.chipText}>Hidden</Text>
              </Pressable>
            </View>

            <CatalogAtlasSection
              itemId={selected.id}
              itemName={selected.name}
              crop={selected}
              onChangeCrop={patch}
            />

            <Pressable style={styles.dangerBtn} onPress={remove}>
              <Text style={styles.dangerText}>Delete</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

type HousingSkuProps = {
  items: DevToolsHousingSku[];
  onChange: (items: DevToolsHousingSku[]) => void;
};

/** Windows + tile SKUs (name/price/sellable). Floor/wall art also appears as Items after Load catalog. */
export function HousingSkuEditor({ items, onChange }: HousingSkuProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    items[0]?.id ?? null,
  );
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const patch = (updates: Partial<DevToolsHousingSku>) => {
    if (!selected) return;
    onChange(
      items.map((i) =>
        i.id === selected.id
          ? { ...i, ...updates, updatedAt: Date.now() }
          : i,
      ),
    );
  };

  const seed = () => {
    const next = seedHousingSkusFromInventory(items);
    onChange(next);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  };

  return (
    <View style={styles.split}>
      <View style={styles.side}>
        <View style={styles.sideHead}>
          <Text style={styles.sideTitle}>Tiles & windows</Text>
          <Pressable style={styles.newBtn} onPress={seed}>
            <Text style={styles.newBtnText}>Seed</Text>
          </Pressable>
        </View>
        <ScrollView>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.row, selectedId === item.id && styles.rowOn]}
              onPress={() => setSelectedId(item.id)}
            >
              <CatalogCropThumb
                crop={item}
                size={28}
                fallback={<Text style={styles.emoji}>🪟</Text>}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.kind} · {item.price}c
                  {item.sellableInStore === false ? " · hidden" : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.main}>
        {!selected ? (
          <Text style={styles.empty}>
            Seed tiles & windows, then crop art with the same atlas editor as
            furniture. Wall decor / floors also live under Housing → Wall decor.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={selected.name}
              onChangeText={(name) => patch({ name })}
            />
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(selected.price)}
              onChangeText={(t) => patch({ price: parseInt(t, 10) || 0 })}
            />
            <Text style={styles.label}>In Store</Text>
            <View style={styles.chips}>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore !== false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: true })}
              >
                <Text style={styles.chipText}>Sellable</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.chip,
                  selected.sellableInStore === false && styles.chipOn,
                ]}
                onPress={() => patch({ sellableInStore: false })}
              >
                <Text style={styles.chipText}>Hidden</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              id {selected.id} · {selected.kind} — crop below drives Store and
              room tiles.
            </Text>

            <CatalogAtlasSection
              itemId={selected.id}
              itemName={selected.name}
              crop={selected}
              onChangeCrop={patch}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

/** Persist helpers used by the Items shell. */
export function useCatalogExtrasState() {
  const [grocery, setGrocery] = useState(() => loadGroceryCatalog());
  const [clothes, setClothes] = useState(() => loadClothCatalog());
  const [housingSkus, setHousingSkus] = useState(() =>
    loadHousingSkuCatalog(),
  );
  const [dishes, setDishes] = useState(() => loadDishCatalog());

  return {
    grocery,
    setGrocery: (items: DevToolsGroceryItem[]) => {
      setGrocery(items);
      saveGroceryCatalog(items);
    },
    clothes,
    setClothes: (items: DevToolsClothItem[]) => {
      setClothes(items);
      saveClothCatalog(items);
    },
    housingSkus,
    setHousingSkus: (items: DevToolsHousingSku[]) => {
      setHousingSkus(items);
      saveHousingSkuCatalog(items);
    },
    dishes,
    setDishes: (items: DevToolsDishItem[]) => {
      setDishes(items);
      saveDishCatalog(items);
    },
  };
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: "row", minHeight: 0 },
  side: {
    width: 240,
    borderRightWidth: 2,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  sideHead: {
    padding: space.sm,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  sideActions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sideTitle: {
    ...typography.brand,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  newBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  newBtnText: { fontSize: 11, fontWeight: "700", color: colors.surfaceRaised },
  seedBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  seedBtnText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowOn: { backgroundColor: colors.accentSoft },
  rowName: { fontSize: 13, fontWeight: "700", color: colors.ink },
  rowMeta: { fontSize: 10, color: colors.inkMuted },
  emoji: { fontSize: 22 },
  main: { flex: 1, backgroundColor: colors.surfaceRaised },
  empty: {
    padding: 24,
    color: colors.inkMuted,
    textAlign: "center",
  },
  form: { padding: space.md, gap: 8, paddingBottom: 40 },
  label: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  input: {
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 64, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: { fontSize: 10, fontWeight: "700", color: colors.ink },
  hint: { fontSize: 11, color: colors.inkMuted, lineHeight: 16 },
  dangerBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  dangerText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
