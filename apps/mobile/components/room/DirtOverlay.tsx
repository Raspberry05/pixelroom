import { StyleSheet, Text, View } from "react-native";

type Props = {
  dirtLevel: number;
  stageWidth: number;
  stageHeight: number;
};

export function DirtOverlay({ dirtLevel, stageWidth, stageHeight }: Props) {
  if (dirtLevel === 0) return null;

  // Generate spider webs for high dirt levels
  const spiderWebs = dirtLevel >= 3 ? [
    { x: 5, y: 10 },
    { x: 85, y: 15 },
    { x: 15, y: 8 },
    { x: 70, y: 12 },
  ] : [];

  // Dust particles
  const dustCount = Math.min(dirtLevel * 8, 24);
  const dustParticles = Array.from({ length: dustCount }, (_, i) => ({
    id: i,
    x: Math.random() * 90 + 5,
    y: Math.random() * 80 + 10,
    size: Math.random() * 15 + 10,
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Dust overlay */}
      {dirtLevel >= 1 && (
        <View
          style={[
            styles.dustLayer,
            { opacity: Math.min(dirtLevel * 0.08, 0.25) },
          ]}
        />
      )}

      {/* Dust particles */}
      {dirtLevel >= 1 &&
        dustParticles.map((dust) => (
          <View
            key={dust.id}
            style={[
              styles.dustParticle,
              {
                left: `${dust.x}%`,
                top: `${dust.y}%`,
                width: dust.size,
                height: dust.size,
                opacity: 0.3 + Math.random() * 0.2,
              },
            ]}
          />
        ))}

      {/* Spider webs */}
      {spiderWebs.map((web, i) => (
        <Text
          key={`web-${i}`}
          style={[
            styles.spiderWeb,
            {
              left: `${web.x}%`,
              top: `${web.y}%`,
            },
          ]}
        >
          🕸️
        </Text>
      ))}

      {/* Stains */}
      {dirtLevel >= 2 && (
        <>
          <Text style={[styles.stain, { left: "20%", bottom: "25%" }]}>
            🟤
          </Text>
          <Text style={[styles.stain, { left: "65%", bottom: "30%" }]}>
            🟤
          </Text>
          {dirtLevel >= 3 && (
            <Text style={[styles.stain, { left: "40%", bottom: "20%" }]}>
              🟤
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  dustLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#8B7355",
  },
  dustParticle: {
    position: "absolute",
    backgroundColor: "#A0826D",
    borderRadius: 999,
  },
  spiderWeb: {
    position: "absolute",
    fontSize: 48,
    opacity: 0.7,
  },
  stain: {
    position: "absolute",
    fontSize: 32,
    opacity: 0.6,
  },
});
