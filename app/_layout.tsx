// app/_layout.tsx
import { useColorScheme } from "@/hooks/useColorScheme";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ConditionsProvider } from "./conditions/ConditionsContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ConditionsProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        {/* All routes (tabs + any non-tab screens) render here */}
        <Slot />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </ConditionsProvider>
  );
}
