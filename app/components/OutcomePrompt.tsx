// app/components/OutcomePrompt.tsx
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { Conditions } from "../conditions/ConditionsContext";
import { recordOutcome, type StoredPlan } from "../services/feedback";

type Props = {
  conditions: Conditions;
  plan: StoredPlan;
};

const Btn: React.FC<{ onPress: () => void; children: React.ReactNode }> = ({ onPress, children }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: "#111827",
      marginRight: 10,
    }}
  >
    <Text style={{ color: "white", fontWeight: "700" }}>{children}</Text>
  </TouchableOpacity>
);

const LinkBtn: React.FC<{ onPress: () => void; children: React.ReactNode }> = ({ onPress, children }) => (
  <TouchableOpacity onPress={onPress} style={{ marginTop: 8 }}>
    <Text style={{ textDecorationLine: "underline", fontWeight: "600" }}>{children}</Text>
  </TouchableOpacity>
);

export const OutcomePrompt: React.FC<Props> = ({ conditions, plan }) => {
  const [submitted, setSubmitted] = useState<null | "yes" | "no">(null);

  async function handle(success: boolean) {
    try {
      await recordOutcome({ success, conditions, plan });
      setSubmitted(success ? "yes" : "no");
    } catch (e) {
      // keep it simple; in production maybe toast this
      setSubmitted(success ? "yes" : "no");
    }
  }

  if (submitted) {
    return (
      <View style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 14 }}>
          {submitted === "yes" ? "🔥 Nice! Logged that catch." : "Logged it. We’ll learn from the miss."}
        </Text>
        <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
          This helps LureIQ sharpen recommendations over time.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>Did this catch a fish?</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Btn onPress={() => handle(true)}>Yes ✅</Btn>
        <Btn onPress={() => handle(false)}>No ❌</Btn>
      </View>
      <LinkBtn onPress={() => setSubmitted("no")}>Skip for now</LinkBtn>
    </View>
  );
};

export default OutcomePrompt;
