import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Ultra-stable LurePlanCard
 * - No Animated, no timers, no effects
 * - Just a simple card with a toggle
 * - Safe to render at launch
 */
export default function LurePlanCard() {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Lure Plan</Text>
      <Text style={styles.subtitle}>
        Quick tip card. Tap the button for a simple plan.
      </Text>

      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.9}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{open ? "Hide Plan" : "Show Plan"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.planBox}>
          <Text style={styles.planLine}>
            • Start on wind-blown banks or points.
          </Text>
          <Text style={styles.planLine}>
            • Cover water first (moving bait), then slow down (bottom bait).
          </Text>
          <Text style={styles.planLine}>
            • Change angles before changing lures.
          </Text>
          <Text style={styles.planLine}>
            • Give each spot 10–15 quality casts.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#1f2d44", // dark blue to match your theme
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#dbe4f0",
    fontSize: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#0f9d58",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },
  planBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#274472",
    gap: 4,
  },
  planLine: {
    color: "white",
    fontSize: 13,
  },
});
