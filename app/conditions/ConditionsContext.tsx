// app/conditions/ConditionsContext.tsx
import * as Location from "expo-location";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ZipPromptModal } from "../components/ZipPromptModal";

export type Conditions = {
  lat: number | null;
  lon: number | null;
  zip?: string | null;
  waterBody?: string | null;
  dateISO: string;
  timeOfDay: "night" | "dawn" | "morning" | "midday" | "afternoon" | "evening";
  season: "winter" | "spring" | "summer" | "fall";
  airTempF?: number | null;
  waterTempF?: number | null;
  windMph?: number | null;
  windDir?: string | null;
  cloudCoverPct?: number | null;
  barometerInHg?: number | null;
  precipInLast24h?: number | null;
  moonPhase?: string | null;
  clarity?: "stained" | "muddy" | "clear" | null;
};

type Ctx = {
  conditions: Conditions;
  refresh: () => Promise<void>;
  loading: boolean;
  lastUpdated: number | null;
  error: string | null;
};

const ConditionsContext = createContext<Ctx | null>(null);

function inferSeason(d: Date): Conditions["season"] {
  const m = d.getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  return "fall";
}

function inferTimeOfDay(d: Date): Conditions["timeOfDay"] {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 7) return "dawn";
  if (h < 11) return "morning";
  if (h < 15) return "midday";
  if (h < 18) return "afternoon";
  return "evening";
}

// Hook to manage ZIP modal state
function useZipPrompt() {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((zip: string | null) => void) | null>(null);

  function ask(): Promise<string | null> {
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = (z) => {
        setOpen(false);
        resolve(z);
      };
    });
  }

  function handleSubmit(zip: string | null) {
    resolverRef.current?.(zip);
  }

  const modal = <ZipPromptModal visible={open} onSubmit={handleSubmit} />;
  return { ask, modal };
}

// Convert ZIP → lat/lon
async function geocodeZip(zip: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return null;
    return { lat: parseFloat(place.latitude), lon: parseFloat(place.longitude) };
  } catch {
    return null;
  }
}

async function getUserLocationWithZipFallback(askZip: () => Promise<string | null>) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === "granted") {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, zip: null as string | null };
  }
  // Ask for ZIP
  const zip = await askZip();
  if (zip && /^\d{5}$/.test(zip)) {
    const coords = await geocodeZip(zip);
    if (coords) return { ...coords, zip };
  }
  return { lat: null, lon: null, zip: zip ?? null };
}

// Dummy environment data (replace with real APIs later)
async function getEnvData(lat: number, lon: number) {
  return {
    airTempF: 74,
    waterTempF: 70,
    windMph: 6,
    windDir: "NW",
    cloudCoverPct: 35,
    barometerInHg: 29.95,
    precipInLast24h: 0.0,
    moonPhase: "Waning gibbous",
    clarity: "stained" as const,
    waterBody: null as string | null,
  };
}

export const ConditionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conditions, setConditions] = useState<Conditions>(() => {
    const now = new Date();
    return {
      lat: null,
      lon: null,
      dateISO: now.toISOString(),
      season: inferSeason(now),
      timeOfDay: inferTimeOfDay(now),
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUpdatedRef = useRef<number | null>(null);

  const { ask, modal } = useZipPrompt();

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const { lat, lon, zip } = await getUserLocationWithZipFallback(ask);

        if (lat != null && lon != null) {
          const env = await getEnvData(lat, lon);
          setConditions({
            lat,
            lon,
            zip,
            dateISO: now.toISOString(),
            season: inferSeason(now),
            timeOfDay: inferTimeOfDay(now),
            ...env,
          });
          lastUpdatedRef.current = Date.now();
        } else {
          setConditions((prev) => ({
            ...prev,
            zip: zip ?? null,
            dateISO: now.toISOString(),
            season: inferSeason(now),
            timeOfDay: inferTimeOfDay(now),
          }));
          throw new Error("We need location or a valid ZIP to pull conditions.");
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to refresh conditions");
      } finally {
        setLoading(false);
      }
    },
    [ask]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: Ctx = {
    conditions,
    refresh,
    loading,
    lastUpdated: lastUpdatedRef.current,
    error,
  };

  return (
    <ConditionsContext.Provider value={value}>
      {children}
      {modal}
    </ConditionsContext.Provider>
  );
};

export function useConditions() {
  const ctx = useContext(ConditionsContext);
  if (!ctx) throw new Error("useConditions must be used within a ConditionsProvider");
  return ctx;
}
