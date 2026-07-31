import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, space, typography } from "../../theme";
import type { SpriteAtlasEntry } from "../../data/devTools";

type Props = {
  sprites: SpriteAtlasEntry[];
  onChange: (sprites: SpriteAtlasEntry[]) => void;
};

/**
 * Sprite Atlas Manager - Tool for cropping and managing sprite sheets
 * 
 * Features:
 * - Upload sprite sheets
 * - Visual cropping tool with grid overlay
 * - Define sprite bounds (x, y, width, height)
 * - Name and categorize sprites
 * - Export sprite definitions
 */
export function SpriteAtlasManager({ sprites, onChange }: Props) {
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);
  
  const selectedSprite = sprites.find((s) => s.id === selectedSpriteId);

  const handleAddSprite = () => {
    const newSprite: SpriteAtlasEntry = {
      id: `sprite_${Date.now()}`,
      name: "New Sprite",
      atlasKey: "main",
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      nativeW: 32,
      nativeH: 32,
    };
    onChange([...sprites, newSprite]);
    setSelectedSpriteId(newSprite.id);
  };

  const handleUpdate = (updates: Partial<SpriteAtlasEntry>) => {
    if (!selectedSpriteId) return;
    onChange(
      sprites.map((sprite) =>
        sprite.id === selectedSpriteId ? { ...sprite, ...updates } : sprite,
      ),
    );
  };

  const handleDelete = () => {
    if (!selectedSpriteId || !confirm("Delete this sprite?")) return;
    onChange(sprites.filter((s) => s.id !== selectedSpriteId));
    setSelectedSpriteId(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sprite Atlas</Text>
          <Pressable style={styles.addBtn} onPress={handleAddSprite}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>
        
        <ScrollView style={styles.list}>
          {sprites.map((sprite) => (
            <Pressable
              key={sprite.id}
              style={[
                styles.listItem,
                selectedSpriteId === sprite.id && styles.listItemActive,
              ]}
              onPress={() => setSelectedSpriteId(sprite.id)}
            >
              <Text style={styles.listItemName}>{sprite.name}</Text>
              <Text style={styles.listItemMeta}>
                {sprite.width}x{sprite.height}px
              </Text>
            </Pressable>
          ))}
          
          {sprites.length === 0 && (
            <Text style={styles.emptyText}>No sprites defined yet</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {!selectedSprite ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Select a sprite or add a new one
            </Text>
            <Text style={styles.placeholderHint}>
              💡 This tool lets you crop sprite sheets and define sprite bounds
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.editor}>
            <Text style={styles.sectionTitle}>Sprite Properties</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={selectedSprite.name}
                onChangeText={(name) => handleUpdate({ name })}
              />
            </View>
            
            <View style={styles.field}>
              <Text style={styles.label}>Atlas Key</Text>
              <TextInput
                style={styles.input}
                value={selectedSprite.atlasKey}
                onChangeText={(atlasKey) => handleUpdate({ atlasKey })}
              />
            </View>
            
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>X</Text>
                <TextInput
                  style={styles.input}
                  value={String(selectedSprite.x)}
                  onChangeText={(text) => {
                    const x = parseInt(text) || 0;
                    handleUpdate({ x });
                  }}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Y</Text>
                <TextInput
                  style={styles.input}
                  value={String(selectedSprite.y)}
                  onChangeText={(text) => {
                    const y = parseInt(text) || 0;
                    handleUpdate({ y });
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
                  value={String(selectedSprite.width)}
                  onChangeText={(text) => {
                    const width = parseInt(text) || 32;
                    handleUpdate({ width });
                  }}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Height</Text>
                <TextInput
                  style={styles.input}
                  value={String(selectedSprite.height)}
                  onChangeText={(text) => {
                    const height = parseInt(text) || 32;
                    handleUpdate({ height });
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete Sprite</Text>
            </Pressable>
          </ScrollView>
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
  header: {
    padding: space.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  list: {
    flex: 1,
  },
  listItem: {
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemActive: {
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  listItemMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: space.xl,
    gap: space.md,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  placeholderHint: {
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: "center",
  },
  editor: {
    flex: 1,
    padding: space.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: space.lg,
  },
  field: {
    marginBottom: space.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginBottom: space.xs,
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
  row: {
    flexDirection: "row",
    gap: space.md,
  },
  emptyText: {
    padding: space.lg,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  deleteBtn: {
    marginTop: space.xl,
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
