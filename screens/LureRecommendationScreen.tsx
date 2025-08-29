// screens/LureRecommendationScreen.tsx
import React from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LureSvg from "../components/LureSvg"; // <-- CORRECT PATH

/**
 * We’ll prefer an SVG sent from the backend in rec.svg.
 * If there’s no SVG, we fall back to a clean placeholder image.
 * (No local PNGs required.)
 */

// Remote placeholder for when there’s no SVG yet
function getLureImageSource() {
  return {
    uri: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg",
  };
}

/** Demo SVG so you can see something right now.
 * When your Flask backend starts returning rec.svg,
 * this demo will be replaced automatically by that real SVG.
 */
const DEMO_CHATTERBAIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <rect x="0" y="0" width="320" height="180" fill="#0b1220"/>
  <!-- Blade -->
  <polygon points="80,60 100,50 120,60 100,70" fill="#c0c9d2" stroke="#9aa3ac" />
  <line x1="120" y1="60" x2="150" y2="65" stroke="#c0c9d2" stroke-width="2"/>
  <!-- Head -->
  <ellipse cx="170" cy="75" rx="18" ry="12" fill="#3d9c46" stroke="#222"/>
  <!-- Skirt -->
  <g opacity="0.9" stroke="#3d9c46">
    <line x1="170" y1="75" x2="210" y2="55" />
    <line x1="170" y1="75" x2="210" y2="65" />
    <line x1="170" y1="75" x2="210" y2="75" />
    <line x1="170" y1="75" x2="210" y2="85" />
    <line x1="170" y1="75" x2="210" y2="95" />
  </g>
  <!-- Hook -->
  <path d="M 185 75 Q 215 70 235 80" stroke="#222" stroke-width="3" fill="none"/>
  <path d="M 235 80 q 12 -6 18 6" stroke="#222" stroke-width="3" fill="none"/>
  <text x="10" y="170" fill="#8aa4cc" font-size="10">Generic Chatterbait (Green)</text>
</svg>
`;

export type LureRecommendation = {
  lureName: string;   // e.g., "Chatterbait"
  color: string;      // e.g., "Green Pumpkin"
  weightOz?: number;
  depth?: string;
  tip: string;        // retrieve tip
  buyUrl?: string;
  svg?: string;       // inline SVG from backend
};

export default function LureRecommendationScreen() {
  // Demo data for now; backend will replace this with real content.
  const rec: LureRecommendation = {
    lureName: "Chatterbait",
    color: "Green",
    weightOz: 0.375,
    depth: "2–6 ft",
    tip: "Slow-roll along grass edges. Bump cover, then pause 1–2 beats to trigger bites.",
    buyUrl: "https://example.com/buy?sku=chatterbait-green-3-8",
    svg: DEMO_CHATTERBAIT_SVG, // <-- remove once backend returns svg
  };

  const weightStr =
    typeof rec.weightOz === "number"
      ? `${Math.round(rec.weightOz * 100) / 100} oz`
      : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{rec.lureName}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{rec.color}</Text>
          </View>
        </View>

        {/* Prefer backend/demo SVG; fallback to placeholder image */}
        {rec.svg ? (
          <LureSvg svg={rec.svg} />
        ) : (
          <Image
            source={getLureImageSource()}
            style={styles.image}
            resizeMode="contain"
          />
        )}

        <View style={styles.metaRow}>
          {weightStr ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>{weightStr}</Text>
            </View>
          ) : null}
          {rec.depth ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>{rec.depth}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipLabel}>Retrieve</Text>
          <Text style={styles.tipText}>{rec.tip}</Text>
        </View>

        {rec.buyUrl ? (
          <Pressable
            onPress={() => Linking.openURL(rec.buyUrl!)}
            style={({ pressed }) => [styles.buyButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.buyButtonText}>Buy this lure</Text>
          </Pressable>
        ) : null}

        <Text style={styles.footerNote}>
          Tip: Tap a different spot on the map to refresh the recommendation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#0b1220",
    minHeight: "100%",
  },
  card: {
    backgroundColor: "#111a2b",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    color: "#e6edf7",
    fontSize: 24,
    fontWeight: "700",
  },
  pill: {
    backgroundColor: "#1e2b45",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { color: "#9cc0ff", fontWeight: "600" },
  image: {
    width: "100%",
    height: 220,
    marginVertical: 12,
    backgroundColor: "#0f1729",
    borderRadius: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  metaPill: {
    backgroundColor: "#17223a",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: { color: "#cfe1ff", fontWeight: "600" },
  tipBox: {
    backgroundColor: "#0f1b33",
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  tipLabel: {
    color: "#9cc0ff",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  tipText: {
    color: "#e6edf7",
    lineHeight: 20,
  },
  buyButton: {
    marginTop: 14,
    backgroundColor: Platform.select({
      ios: "#3b82f6",
      android: "#3b82f6",
      default: "#3b82f6",
    }),
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  buyButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  footerNote: {
    color: "#8aa4cc",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
});
