import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radii, space, typography } from "../../theme";
import {
  createFurnitureTemplate,
  type FurnitureItemDefinition,
  type SpriteAtlasEntry,
  type SittingPosition,
  type InteractionHotspot,
} from "../../data/devTools";
import type { CollisionKind } from "../../data/inventory";
import type { MiniGameType } from "../../data/minigames";

type Props = {
  items: FurnitureItemDefinition[];
  sprites: SpriteAtlasEntry[];
  onChange: (items: FurnitureItemDefinition[]) => void;
};

const COLLISION_TYPES: (CollisionKind | null)[] = [
  "solid",
  "seat",
  "rug",
  "surfaceItem",
  "wallDecor",
  null,
];

const MINI_GAME_TYPES: (MiniGameType | undefined)[] = [
  undefined,
  "cooking",
  "cleaning",
  "unpack",
];

const CATEGORIES = ["furniture", "appliance", "decoration", "seating"] as const;

export function FurnitureItemEditor({ items, sprites, onChange }: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<"properties" | "collision" | "sitting" | "interactions">("properties");

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleCreateNew = () => {
    const newItem = createFurnitureTemplate();
    onChange([...items, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleUpdate = (updates: Partial<FurnitureItemDefinition>) => {
    if (!selectedItemId) return;
    onChange(
      items.map((item) =>
        item.id === selectedItemId
          ? { ...item, ...updates, updatedAt: Date.now() }
          : item,
      ),
    );
  };

  const handleDelete = () => {
    if (!selectedItemId) return;
    if (confirm("Delete this item?")) {
      onChange(items.filter((i) => i.id !== selectedItemId));
      setSelectedItemId(null);
    }
  };

  const handleAddSittingPosition = () => {
    if (!selectedItem) return;
    const newPos: SittingPosition = {
      id: `sit_${Date.now()}`,
      x: 0,
      y: 0,
      direction: "down",
    };
    handleUpdate({
      sittingPositions: [...selectedItem.sittingPositions, newPos],
    });
  };

  const handleUpdateSittingPosition = (id: string, updates: Partial<SittingPosition>) => {
    if (!selectedItem) return;
    handleUpdate({
      sittingPositions: selectedItem.sittingPositions.map((pos) =>
        pos.id === id ? { ...pos, ...updates } : pos,
      ),
    });
  };

  const handleRemoveSittingPosition = (id: string) => {
    if (!selectedItem) return;
    handleUpdate({
      sittingPositions: selectedItem.sittingPositions.filter((pos) => pos.id !== id),
    });
  };

  const handleAddInteraction = () => {
    if (!selectedItem) return;
    const newHotspot: InteractionHotspot = {
      id: `int_${Date.now()}`,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      action: "use",
    };
    handleUpdate({
      interactionHotspots: [...selectedItem.interactionHotspots, newHotspot],
    });
  };

  const handleUpdateInteraction = (id: string, updates: Partial<InteractionHotspot>) => {
    if (!selectedItem) return;
    handleUpdate({
      interactionHotspots: selectedItem.interactionHotspots.map((hotspot) =>
        hotspot.id === id ? { ...hotspot, ...updates } : hotspot,
      ),
    });
  };

  const handleRemoveInteraction = (id: string) => {
    if (!selectedItem) return;
    handleUpdate({
      interactionHotspots: selectedItem.interactionHotspots.filter(
        (hotspot) => hotspot.id !== id,
      ),
    });
  };

  return (
    <View style={styles.container}>
      {/* Item List Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Furniture Items</Text>
          <Pressable style={styles.newBtn} onPress={handleCreateNew}>
            <Text style={styles.newBtnText}>+ New</Text>
          </Pressable>
        </View>
        
        <ScrollView style={styles.itemList}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.itemCard,
                selectedItemId === item.id && styles.itemCardActive,
              ]}
              onPress={() => setSelectedItemId(item.id)}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.category} · {item.price}c
              </Text>
            </Pressable>
          ))}
          
          {items.length === 0 && (
            <Text style={styles.emptyText}>No items yet. Create one!</Text>
          )}
        </ScrollView>
      </View>

      {/* Editor Panel */}
      <View style={styles.editor}>
        {!selectedItem ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Select an item or create a new one
            </Text>
          </View>
        ) : (
          <>
            {/* Mode Tabs */}
            <View style={styles.modeTabs}>
              <Pressable
                style={[
                  styles.modeTab,
                  editMode === "properties" && styles.modeTabActive,
                ]}
                onPress={() => setEditMode("properties")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    editMode === "properties" && styles.modeTabTextActive,
                  ]}
                >
                  Properties
                </Text>
              </Pressable>
              
              <Pressable
                style={[
                  styles.modeTab,
                  editMode === "collision" && styles.modeTabActive,
                ]}
                onPress={() => setEditMode("collision")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    editMode === "collision" && styles.modeTabTextActive,
                  ]}
                >
                  Collision
                </Text>
              </Pressable>
              
              <Pressable
                style={[
                  styles.modeTab,
                  editMode === "sitting" && styles.modeTabActive,
                ]}
                onPress={() => setEditMode("sitting")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    editMode === "sitting" && styles.modeTabTextActive,
                  ]}
                >
                  Sitting
                </Text>
              </Pressable>
              
              <Pressable
                style={[
                  styles.modeTab,
                  editMode === "interactions" && styles.modeTabActive,
                ]}
                onPress={() => setEditMode("interactions")}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    editMode === "interactions" && styles.modeTabTextActive,
                  ]}
                >
                  Interactions
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.editorContent}>
              {editMode === "properties" && (
                <View style={styles.form}>
                  <Text style={styles.sectionTitle}>Basic Properties</Text>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={selectedItem.name}
                      onChangeText={(name) => handleUpdate({ name })}
                      placeholder="Item name"
                    />
                  </View>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={selectedItem.description}
                      onChangeText={(description) => handleUpdate({ description })}
                      placeholder="Item description"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.segmentedControl}>
                      {CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[
                            styles.segment,
                            selectedItem.category === cat && styles.segmentActive,
                          ]}
                          onPress={() => handleUpdate({ category: cat })}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              selectedItem.category === cat && styles.segmentTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Price (coins)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(selectedItem.price)}
                      onChangeText={(text) => {
                        const price = parseInt(text) || 0;
                        handleUpdate({ price });
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Mini-Game</Text>
                    <View style={styles.segmentedControl}>
                      {MINI_GAME_TYPES.map((game) => (
                        <Pressable
                          key={game ?? "none"}
                          style={[
                            styles.segment,
                            selectedItem.miniGame === game && styles.segmentActive,
                          ]}
                          onPress={() => handleUpdate({ miniGame: game })}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              selectedItem.miniGame === game && styles.segmentTextActive,
                            ]}
                          >
                            {game ?? "none"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Requires Unpacking</Text>
                    <Pressable
                      style={styles.checkbox}
                      onPress={() =>
                        handleUpdate({ requiresUnpacking: !selectedItem.requiresUnpacking })
                      }
                    >
                      <View
                        style={[
                          styles.checkboxBox,
                          selectedItem.requiresUnpacking && styles.checkboxBoxChecked,
                        ]}
                      >
                        {selectedItem.requiresUnpacking && (
                          <Text style={styles.checkboxCheck}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        Item needs to be unpacked before use
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {editMode === "collision" && (
                <View style={styles.form}>
                  <Text style={styles.sectionTitle}>Collision & Physics</Text>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Collision Type</Text>
                    <View style={styles.segmentedControl}>
                      {COLLISION_TYPES.map((type) => (
                        <Pressable
                          key={type ?? "none"}
                          style={[
                            styles.segment,
                            selectedItem.collision === type && styles.segmentActive,
                          ]}
                          onPress={() => handleUpdate({ collision: type })}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              selectedItem.collision === type && styles.segmentTextActive,
                            ]}
                          >
                            {type ?? "none"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.field}>
                    <Text style={styles.label}>Anchor</Text>
                    <View style={styles.segmentedControl}>
                      <Pressable
                        style={[
                          styles.segment,
                          selectedItem.anchor === "floor" && styles.segmentActive,
                        ]}
                        onPress={() => handleUpdate({ anchor: "floor" })}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            selectedItem.anchor === "floor" && styles.segmentTextActive,
                          ]}
                        >
                          floor
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.segment,
                          selectedItem.anchor === "wall" && styles.segmentActive,
                        ]}
                        onPress={() => handleUpdate({ anchor: "wall" })}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            selectedItem.anchor === "wall" && styles.segmentTextActive,
                          ]}
                        >
                          wall
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  
                  <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>Grid Width</Text>
                      <TextInput
                        style={styles.input}
                        value={String(selectedItem.gridWidth)}
                        onChangeText={(text) => {
                          const gridWidth = parseInt(text) || 1;
                          handleUpdate({ gridWidth });
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                    
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.label}>Grid Height</Text>
                      <TextInput
                        style={styles.input}
                        value={String(selectedItem.gridHeight)}
                        onChangeText={(text) => {
                          const gridHeight = parseInt(text) || 1;
                          handleUpdate({ gridHeight });
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}

              {editMode === "sitting" && (
                <View style={styles.form}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sitting Positions</Text>
                    <Pressable style={styles.addBtn} onPress={handleAddSittingPosition}>
                      <Text style={styles.addBtnText}>+ Add Position</Text>
                    </Pressable>
                  </View>
                  
                  {selectedItem.sittingPositions.map((pos) => (
                    <View key={pos.id} style={styles.listItem}>
                      <Text style={styles.listItemTitle}>Position #{pos.id.slice(-4)}</Text>
                      
                      <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.label}>X</Text>
                          <TextInput
                            style={styles.input}
                            value={String(pos.x)}
                            onChangeText={(text) => {
                              const x = parseFloat(text) || 0;
                              handleUpdateSittingPosition(pos.id, { x });
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                        
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.label}>Y</Text>
                          <TextInput
                            style={styles.input}
                            value={String(pos.y)}
                            onChangeText={(text) => {
                              const y = parseFloat(text) || 0;
                              handleUpdateSittingPosition(pos.id, { y });
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.field}>
                        <Text style={styles.label}>Direction</Text>
                        <View style={styles.segmentedControl}>
                          {["left", "right", "up", "down"].map((dir) => (
                            <Pressable
                              key={dir}
                              style={[
                                styles.segment,
                                pos.direction === dir && styles.segmentActive,
                              ]}
                              onPress={() =>
                                handleUpdateSittingPosition(pos.id, {
                                  direction: dir as any,
                                })
                              }
                            >
                              <Text
                                style={[
                                  styles.segmentText,
                                  pos.direction === dir && styles.segmentTextActive,
                                ]}
                              >
                                {dir}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => handleRemoveSittingPosition(pos.id)}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                  
                  {selectedItem.sittingPositions.length === 0 && (
                    <Text style={styles.emptyText}>
                      No sitting positions defined. Add one above.
                    </Text>
                  )}
                </View>
              )}

              {editMode === "interactions" && (
                <View style={styles.form}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Interaction Hotspots</Text>
                    <Pressable style={styles.addBtn} onPress={handleAddInteraction}>
                      <Text style={styles.addBtnText}>+ Add Hotspot</Text>
                    </Pressable>
                  </View>
                  
                  {selectedItem.interactionHotspots.map((hotspot) => (
                    <View key={hotspot.id} style={styles.listItem}>
                      <Text style={styles.listItemTitle}>
                        Hotspot #{hotspot.id.slice(-4)}
                      </Text>
                      
                      <View style={styles.field}>
                        <Text style={styles.label}>Action Name</Text>
                        <TextInput
                          style={styles.input}
                          value={hotspot.action}
                          onChangeText={(action) =>
                            handleUpdateInteraction(hotspot.id, { action })
                          }
                          placeholder="use"
                        />
                      </View>
                      
                      <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.label}>X</Text>
                          <TextInput
                            style={styles.input}
                            value={String(hotspot.x)}
                            onChangeText={(text) => {
                              const x = parseFloat(text) || 0;
                              handleUpdateInteraction(hotspot.id, { x });
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                        
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.label}>Y</Text>
                          <TextInput
                            style={styles.input}
                            value={String(hotspot.y)}
                            onChangeText={(text) => {
                              const y = parseFloat(text) || 0;
                              handleUpdateInteraction(hotspot.id, { y });
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.label}>Width</Text>
                          <TextInput
                            style={styles.input}
                            value={String(hotspot.width)}
                            onChangeText={(text) => {
                              const width = parseFloat(text) || 1;
                              handleUpdateInteraction(hotspot.id, { width });
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                        
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={styles.label}>Height</Text>
                          <TextInput
                            style={styles.input}
                            value={String(hotspot.height)}
                            onChangeText={(text) => {
                              const height = parseFloat(text) || 1;
                              handleUpdateInteraction(hotspot.id, { height });
                            }}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.field}>
                        <Text style={styles.label}>Triggers Mini-Game</Text>
                        <View style={styles.segmentedControl}>
                          {MINI_GAME_TYPES.map((game) => (
                            <Pressable
                              key={game ?? "none"}
                              style={[
                                styles.segment,
                                hotspot.miniGame === game && styles.segmentActive,
                              ]}
                              onPress={() =>
                                handleUpdateInteraction(hotspot.id, { miniGame: game })
                              }
                            >
                              <Text
                                style={[
                                  styles.segmentText,
                                  hotspot.miniGame === game && styles.segmentTextActive,
                                ]}
                              >
                                {game ?? "none"}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => handleRemoveInteraction(hotspot.id)}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                  
                  {selectedItem.interactionHotspots.length === 0 && (
                    <Text style={styles.emptyText}>
                      No interaction hotspots defined. Add one above.
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>🗑️ Delete Item</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 250,
    backgroundColor: colors.surfaceRaised,
    borderRightWidth: 2,
    borderRightColor: colors.borderStrong,
  },
  sidebarHeader: {
    padding: space.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sidebarTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  newBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  itemList: {
    flex: 1,
  },
  itemCard: {
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemCardActive: {
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  editor: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderStrong,
  },
  modeTab: {
    flex: 1,
    paddingVertical: space.md,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  modeTabActive: {
    borderBottomColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkMuted,
  },
  modeTabTextActive: {
    color: colors.accent,
  },
  editorContent: {
    flex: 1,
  },
  form: {
    padding: space.lg,
    gap: space.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  field: {
    gap: space.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 15,
    color: colors.ink,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  segmentedControl: {
    flexDirection: "row",
    gap: space.xs,
    flexWrap: "wrap",
  },
  segment: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  segmentTextActive: {
    color: colors.surfaceRaised,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxCheck: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    gap: space.md,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  listItem: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.md,
    gap: space.md,
    marginBottom: space.md,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  removeBtn: {
    backgroundColor: colors.bgDeep,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkMuted,
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkMuted,
    fontStyle: "italic",
    textAlign: "center",
    padding: space.lg,
  },
  actions: {
    padding: space.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  deleteBtn: {
    backgroundColor: "#FF4444",
    borderRadius: radii.lg,
    paddingVertical: space.md,
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
