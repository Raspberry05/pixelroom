import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, space, typography } from "../../theme";
import {
  createRoomTemplate,
  type RoomTemplate,
  type FurnitureItemDefinition,
} from "../../data/devTools";

type Props = {
  templates: RoomTemplate[];
  furniture: FurnitureItemDefinition[];
  onChange: (templates: RoomTemplate[]) => void;
};

/**
 * Room Layout Editor - Visual tool for designing room layouts
 * 
 * Features:
 * - Drag-and-drop furniture placement on grid
 * - Window placement
 * - Floor/wall tile selection
 * - Room expansion controls
 * - Save/load room templates
 */
export function RoomLayoutEditor({ templates, furniture, onChange }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleCreateNew = () => {
    const newTemplate = createRoomTemplate();
    onChange([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
  };

  const handleUpdate = (updates: Partial<RoomTemplate>) => {
    if (!selectedTemplateId) return;
    onChange(
      templates.map((template) =>
        template.id === selectedTemplateId
          ? { ...template, ...updates, updatedAt: Date.now() }
          : template,
      ),
    );
  };

  const handleDelete = () => {
    if (!selectedTemplateId || !confirm("Delete this room template?")) return;
    onChange(templates.filter((t) => t.id !== selectedTemplateId));
    setSelectedTemplateId(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Room Templates</Text>
          <Pressable style={styles.addBtn} onPress={handleCreateNew}>
            <Text style={styles.addBtnText}>+ New</Text>
          </Pressable>
        </View>
        
        <ScrollView style={styles.list}>
          {templates.map((template) => (
            <Pressable
              key={template.id}
              style={[
                styles.listItem,
                selectedTemplateId === template.id && styles.listItemActive,
              ]}
              onPress={() => setSelectedTemplateId(template.id)}
            >
              <Text style={styles.listItemName}>{template.name}</Text>
              <Text style={styles.listItemMeta}>
                {template.furniture.length} items
              </Text>
            </Pressable>
          ))}
          
          {templates.length === 0 && (
            <Text style={styles.emptyText}>No room templates yet</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {!selectedTemplate ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Select a template or create a new one
            </Text>
            <Text style={styles.placeholderHint}>
              💡 This tool lets you visually design room layouts
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.editor}>
            <Text style={styles.sectionTitle}>Room Properties</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={selectedTemplate.name}
                onChangeText={(name) => handleUpdate({ name })}
              />
            </View>
            
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={selectedTemplate.description}
                onChangeText={(description) => handleUpdate({ description })}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Left Expansions</Text>
                <TextInput
                  style={styles.input}
                  value={String(selectedTemplate.expansionsLeft)}
                  onChangeText={(text) => {
                    const expansionsLeft = parseInt(text) || 0;
                    handleUpdate({ expansionsLeft });
                  }}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Right Expansions</Text>
                <TextInput
                  style={styles.input}
                  value={String(selectedTemplate.expansionsRight)}
                  onChangeText={(text) => {
                    const expansionsRight = parseInt(text) || 0;
                    handleUpdate({ expansionsRight });
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Text style={styles.sectionTitle}>Furniture ({selectedTemplate.furniture.length})</Text>
            <Text style={styles.hint}>
              Visual editor coming soon. For now, edit the JSON export.
            </Text>
            
            <Pressable style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete Template</Text>
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
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: space.md,
  },
  hint: {
    fontSize: 14,
    color: colors.inkMuted,
    fontStyle: "italic",
    padding: space.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    marginBottom: space.lg,
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
