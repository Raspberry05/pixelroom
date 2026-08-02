import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TopNav } from "../components/TopNav";
import { colors, radii, space, typography } from "../theme";
import { RoomLayoutEditor } from "../components/devtools/RoomLayoutEditor";
import { FurnitureItemEditor } from "../components/devtools/FurnitureItemEditor";
import { OverlayFramesEditor } from "../components/devtools/OverlayFramesEditor";
import {
  loadDevToolsState,
  saveDevToolsState,
  exportDevToolsState,
  importDevToolsState,
  seedGameCatalog,
  type DevToolsState,
} from "../data/devTools";
import {
  loadHousingSkuCatalog,
  saveDishCatalog,
  saveHousingSkuCatalog,
  seedDishesFromRecipes,
  seedHousingSkusFromInventory,
  loadDishCatalog,
} from "../data/catalogExtras";

type DevToolTab = "rooms" | "furniture" | "overlays" | "export";

type Props = {
  onBack: () => void;
};

export function DevToolsScreen({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<DevToolTab>("furniture");
  const [devState, setDevState] = useState<DevToolsState>(() => loadDevToolsState());

  const handleStateUpdate = (updates: Partial<DevToolsState>) => {
    const newState = { ...devState, ...updates };
    setDevState(newState);
    saveDevToolsState(updates);
  };

  const handleExport = () => {
    const json = exportDevToolsState(devState);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roomie-devtools-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        const imported = importDevToolsState(json);
        if (imported) {
          setDevState(imported);
          saveDevToolsState(imported);
          alert("Imported successfully!");
        } else {
          alert("Failed to import - invalid JSON");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <View style={styles.container}>
      <TopNav
        title="🛠️ Developer Tools"
        subtitle="Items, overlay frames, rooms & store"
        onBack={onBack}
      />

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "furniture" && styles.tabActive]}
          onPress={() => setActiveTab("furniture")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "furniture" && styles.tabTextActive,
            ]}
          >
              🪑 Items
            </Text>
          </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "overlays" && styles.tabActive]}
          onPress={() => setActiveTab("overlays")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "overlays" && styles.tabTextActive,
            ]}
          >
            🎞️ Overlays
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "rooms" && styles.tabActive]}
          onPress={() => setActiveTab("rooms")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "rooms" && styles.tabTextActive,
            ]}
          >
            🏠 Rooms
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "export" && styles.tabActive]}
          onPress={() => setActiveTab("export")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "export" && styles.tabTextActive,
            ]}
          >
            💾 Export
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {activeTab === "overlays" && (
          <OverlayFramesEditor
            frames={devState.overlayFrames ?? []}
            onChange={(overlayFrames) => handleStateUpdate({ overlayFrames })}
          />
        )}

        {activeTab === "rooms" && (
          <RoomLayoutEditor
            templates={devState.roomTemplates}
            furniture={devState.furnitureItems}
            onChange={(templates) => handleStateUpdate({ roomTemplates: templates })}
          />
        )}

        {activeTab === "furniture" && (
          <FurnitureItemEditor
            state={devState}
            onStateUpdate={(updates) => {
              const next = { ...devState, ...updates };
              setDevState(next);
              saveDevToolsState(updates);
            }}
            onSeedCatalog={() => {
              const seeded = seedGameCatalog(devState);
              setDevState(seeded);
              saveDevToolsState(seeded);
              const housingSkus = seedHousingSkusFromInventory(
                loadHousingSkuCatalog(),
              );
              saveHousingSkuCatalog(housingSkus);
              const dishes = seedDishesFromRecipes(loadDishCatalog());
              saveDishCatalog(dishes);
              alert(
                `Loaded game catalog (${seeded.furnitureItems.length} items, ${housingSkus.length} housing SKUs, ${dishes.length} dishes, ${seeded.overlayFrames?.length ?? 0} overlay frames, ${seeded.spriteAtlas.length} atlas slices). Use Items filters for Furniture / Housing / Grocery / Clothes / Dishes.`,
              );
            }}
          />
        )}

        {activeTab === "export" && (
          <View style={styles.exportPanel}>
            <Text style={styles.exportTitle}>Export/Import Data</Text>
            <Text style={styles.exportDescription}>
              Export your custom content to share or backup. Import previously
              exported data. Atlas crop entries are kept in sync automatically
              when you edit furniture in the Items tab — there is no
              separate Sprites editor.
            </Text>

            <View style={styles.exportActions}>
              <Pressable style={styles.exportBtn} onPress={handleExport}>
                <Text style={styles.exportBtnText}>📤 Export JSON</Text>
              </Pressable>

              <Pressable style={styles.exportBtn} onPress={handleImport}>
                <Text style={styles.exportBtnText}>📥 Import JSON</Text>
              </Pressable>
            </View>

            <View style={styles.stats}>
              <Text style={styles.statsTitle}>Current Content:</Text>
              <Text style={styles.statsItem}>
                • {devState.furnitureItems.length} catalog items (furniture +
                housing objects; grocery/clothes edit under Items filters)
              </Text>
              <Text style={styles.statsItem}>
                • {devState.overlayFrames?.length ?? 0} overlay frames (sequence
                images)
              </Text>
              <Text style={styles.statsItem}>
                • {devState.roomTemplates.length} room templates
              </Text>
              <Text style={styles.statsItem}>
                • {devState.spriteAtlas.length} atlas slices (synced from
                furniture crops)
              </Text>
              <Text style={styles.statsItem}>
                • {devState.deletedCatalogIds?.length ?? 0} catalog deletes
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderStrong,
  },
  tab: {
    flex: 1,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  tabText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  exportPanel: {
    flex: 1,
    padding: space.xl,
    gap: space.lg,
  },
  exportTitle: {
    ...typography.brand,
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
  },
  exportDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  exportActions: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.md,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    paddingVertical: space.lg,
    alignItems: "center",
  },
  exportBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.surfaceRaised,
  },
  stats: {
    marginTop: space.xl,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.sm,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: space.xs,
  },
  statsItem: {
    fontSize: 14,
    color: colors.inkMuted,
  },
});
