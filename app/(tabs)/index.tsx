import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // ✅ added
import CatchFeedbackModal from "../components/CatchFeedbackModal";
import { useCatchFeedback } from "../hooks/useCatchFeedback";

/** ====== Auto-prompt timing ======
 * After the recommendation shows, we'll wait this many seconds,
 * then trigger the yes/no prompt automatically.
 */
const PROMPT_DELAY_SECONDS = 6;

/** Types */
type Species = "Largemouth" | "Smallmouth";
type Clarity = "Clear" | "Stained" | "Muddy";
type Cover = "Grass" | "Wood" | "Rock" | "Open";
type Time = "Morning" | "Midday" | "Evening" | "Night";
type Season = "Spring" | "Summer" | "Fall" | "Winter";
type SpawnPhase = "None" | "Pre-Spawn" | "Spawn" | "Post-Spawn";

/** Chip component */
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Quick Tips block (replaces LurePlanCard) */
function QuickTips() {
  return (
    <View style={styles.tipsCard}>
      <Text style={styles.tipsTitle}>Quick Tips:</Text>
      <View style={styles.tipRow}>
        <Text style={styles.tipBullet}>•</Text>
        <Text style={styles.tipText}>Give each spot 10–15 quality casts</Text>
      </View>
      <View style={styles.tipRow}>
        <Text style={styles.tipBullet}>•</Text>
        <Text style={styles.tipText}>Start on wind blown banks or points first</Text>
      </View>
      <View style={styles.tipRow}>
        <Text style={styles.tipBullet}>•</Text>
        <Text style={styles.tipText}>Try moving baits first, then fish the bottom last.</Text>
      </View>
    </View>
  );
}

export default function WizardHome() {
  /** ---------------- Animations ---------------- */
  // Splash overlay fade
  const [overlayVisible, setOverlayVisible] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Step card fade
  const stepOpacity = useRef(new Animated.Value(0)).current;

  // “Analyzing…” pulse
  const analyzingOpacity = useRef(new Animated.Value(1)).current;

  // Result fade
  const resultOpacity = useRef(new Animated.Value(0)).current;

  // Fade in current step card whenever step changes
  const runStepFade = () => {
    stepOpacity.setValue(0);
    Animated.timing(stepOpacity, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Splash fade out after ~4s
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setOverlayVisible(false);
      });
    }, 4000);
    return () => clearTimeout(t);
  }, [overlayOpacity]);

  /** Hidden auto values */
  const [time, setTime] = useState<Time>("Morning");
  const [season, setSeason] = useState<Season>("Summer");
  const [species] = useState<Species>("Largemouth");
  const [spawnPhase, setSpawnPhase] = useState<SpawnPhase>("None");

  /** User prompts */
  const [clarity, setClarity] = useState<Clarity | null>(null);
  const [cover, setCover] = useState<Cover | null>(null);

  /** Steps: 0 = clarity, 1 = cover, 2 = action/result */
  const [step, setStep] = useState<0 | 1 | 2>(0);
  useEffect(runStepFade, [step]); // animate on step change

  /** Autofill status */
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  /** Loading AI (animated pulse while true) */
  const [loadingAI, setLoadingAI] = useState(false);
  useEffect(() => {
    if (loadingAI) {
      analyzingOpacity.setValue(0.6);
      Animated.loop(
        Animated.sequence([
          Animated.timing(analyzingOpacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(analyzingOpacity, {
            toValue: 0.6,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      analyzingOpacity.stopAnimation(() => {
        analyzingOpacity.setValue(1);
      });
    }
  }, [loadingAI, analyzingOpacity]);

  /** Optional remote weights (for monthly updates) */
  const [remoteWeights, setRemoteWeights] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("https://YOUR_BACKEND/lure-weights.json", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          if (data?.weights) setRemoteWeights(data.weights);
        }
      } catch {
        /* ignore — fallback to built-ins */
      }
    })();
  }, []);

  /** Recommendation result */
  const [result, setResult] = useState<null | {
    lure: string;
    color: string;
    retrieve: string;
    depth: string;
  }>(null);

  /** 👉 Catch feedback hook (modal + scheduler + submit) */
  const {
    modalVisible,
    scheduled,
    submitting,
    schedulePrompt,
    submitFeedback,
    dismissPrompt,
  } = useCatchFeedback();

  /** Helpers */
  function presetFromClock() {
    const h = new Date().getHours();
    setTime(h < 10 ? "Morning" : h < 16 ? "Midday" : h < 20 ? "Evening" : "Night");
    const m = new Date().getMonth();
    setSeason(m <= 1 ? "Winter" : m <= 4 ? "Spring" : m <= 7 ? "Summer" : m <= 9 ? "Fall" : "Winter");
  }

  function findNearestHourIndex(hours: Date[], now: Date) {
    if (!hours.length) return 0;
    let idx = 0, best = Infinity;
    for (let i = 0; i < hours.length; i++) {
      const d = Math.abs(hours[i].getTime() - now.getTime());
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    return idx;
  }

  function inferTimeOfDay(now: Date, sunrise: Date | null, sunset: Date | null): Time {
    if (!sunrise || !sunset) {
      const h = now.getHours();
      if (h < 6) return "Night";
      if (h < 11) return "Morning";
      if (h < 17) return "Midday";
      if (h < 21) return "Evening";
      return "Night";
    }
    const afterSun = now.getTime() - sunrise.getTime();
       const beforeSet = sunset.getTime() - now.getTime();
    if (afterSun >= 0 && afterSun < 2 * 60 * 60 * 1000) return "Morning";
    if (afterSun >= 2 * 60 * 60 * 1000 && beforeSet > 2 * 60 * 60 * 1000) return "Midday";
    if (beforeSet >= 0) return "Evening";
    return "Night";
  }

  function inferSpawnPhase(
    _species: Species,
    estWaterF: number,
    now: Date,
    latitude: number
  ): SpawnPhase {
    const m = now.getMonth();
    const isSpringWindow = latitude >= 37 ? (m >= 3 && m <= 5) : (m >= 2 && m <= 4);
    if (estWaterF >= 60 && estWaterF <= 75 && isSpringWindow) return "Spawn";
    if (estWaterF >= 50 && estWaterF < 60 && isSpringWindow) return "Pre-Spawn";
    if (estWaterF > 70 && isSpringWindow) return "Post-Spawn";
    return "None";
  }

  /** On mount: get location + weather, infer time/season/clarity/spawn */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingAuto(true);
        setAutoMsg("Requesting location…");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== "granted") {
          setAutoMsg("Location denied. Quick 2 prompts below.");
          presetFromClock();
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        setAutoMsg("Pulling weather…");

        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lon}` +
          `&hourly=precipitation,temperature_2m` +
          `&daily=sunrise,sunset` +
          `&timezone=auto`;
        const r = await fetch(url);
        const data = await r.json();
        if (cancelled) return;

        const now = new Date();
        const sunrise = data?.daily?.sunrise?.[0] ? new Date(data.daily.sunrise[0]) : null;
        const sunset = data?.daily?.sunset?.[0] ? new Date(data.daily.sunset[0]) : null;
        setTime(inferTimeOfDay(now, sunrise, sunset));

        const m = now.getMonth();
        setSeason(m <= 1 ? "Winter" : m <= 4 ? "Spring" : m <= 7 ? "Summer" : m <= 9 ? "Fall" : "Winter");

        // Guess clarity from recent precip (~last 12h)
        const hoursArr: Date[] = (data?.hourly?.time || []).map((t: string) => new Date(t));
        const precip: number[] = data?.hourly?.precipitation || [];
        const endIdx = findNearestHourIndex(hoursArr, now);
        const startIdx = Math.max(0, endIdx - 12);
        let total12h = 0;
        for (let i = startIdx; i <= endIdx; i++) total12h += Number(precip[i] || 0);
        const guess: Clarity = total12h > 15 ? "Muddy" : total12h > 2 ? "Stained" : "Clear";
        setClarity(guess);

        // Estimate water temp from afternoon air temps (~last 72h) -> infer spawn
        const airTimes: string[] = data?.hourly?.time || [];
        const airTempsC: number[] = data?.hourly?.temperature_2m || [];
        let sumF = 0, count = 0;
        for (let i = airTimes.length - 1; i >= 0; i--) {
          const t = new Date(airTimes[i]);
          const hrsAgo = (now.getTime() - t.getTime()) / (1000 * 60 * 60);
          if (hrsAgo > 72) break;
          const localHr = t.getHours();
          if (localHr >= 12 && localHr <= 18) {
            const airF = (airTempsC[i] as number) * (9 / 5) + 32;
            sumF += airF;
            count++;
          }
        }
        const avgAirF = count ? sumF / count : null;
        const estWaterF = avgAirF ? Math.max(35, Math.min(90, avgAirF - 5)) : 55;
        setSpawnPhase(inferSpawnPhase(species, estWaterF, now, lat));

        setAutoMsg("Autofilled time/season/spawn. Two quick questions ↓");
      } catch (e) {
        console.error(e);
        presetFromClock();
        setSpawnPhase("None");
        setAutoMsg("Couldn’t load weather — answer the two prompts.");
      } finally {
        if (!cancelled) setLoadingAuto(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Wizard actions */
  function chooseClarity(c: Clarity) {
    setClarity(c);
    setStep(1);
    setResult(null);
  }
  function chooseCover(c: Cover) {
    setCover(c);
    setStep(2);
    setResult(null);
  }
  function backOne() {
    if (loadingAI) return;
    if (step === 1) setStep(0);
    if (step === 2) setStep(1);
    setResult(null);
  }

  /** Priority-weighted recommendation (no images) */
  function computeRecommendation(): {
    lure: string;
    color: string;
    retrieve: string;
    depth: string;
  } {
    const c = clarity as Clarity;
    const cov = cover as Cover;
    const t = time;
    const s = season;
    const sp = spawnPhase;

    const LURES = [
      "Texas-Rigged Creature",
      "Weightless Senko",
      "Drop Shot",
      "Chatterbait",
      "Swim Jig",
      "Flipping Jig",
      "Football Jig",
      "Squarebill Crankbait",
      "Blade Bait",
      "Spinnerbait",
      "Topwater (Walking Bait)",
      "Buzzbait",
      "Lipless Crankbait",
      "Popping Frog",
      "Jerkbait",
      "Soft Swimbait",
      "Ned Rig",
      "Carolina Rig",
      "Underspin",
    ] as const;
    type Lure = typeof LURES[number];

    // Base starting weights
    const base: Record<Lure, number> = {
      "Texas-Rigged Creature": 2,
      "Weightless Senko": 2,
      "Drop Shot": 1,
      "Chatterbait": 2,
      "Swim Jig": 2,
      "Flipping Jig": 2,
      "Football Jig": 2,
      "Squarebill Crankbait": 1,
      "Blade Bait": 1,
      "Spinnerbait": 1,
      "Topwater (Walking Bait)": 1,
      "Buzzbait": 1,
      "Lipless Crankbait": 1,
      "Popping Frog": 1,
      "Jerkbait": 1,
      "Soft Swimbait": 1,
      "Ned Rig": 1,
      "Carolina Rig": 1,
      "Underspin": 1,
    };

    // Seed scores
    const score: Record<Lure, number> = Object.fromEntries(
      LURES.map((l) => [l, base[l]])
    ) as any;

    // Remote overrides (if monthly weights are hosted)
    if (remoteWeights) {
      for (const l of LURES) {
        if (remoteWeights[l] != null) {
          score[l] = remoteWeights[l];
        }
      }
    }

    // ---- Heuristics ----
    // Cover
    if (cov === "Grass") {
      score["Swim Jig"] += 3;
      score["Chatterbait"] += 3;
      if (s === "Fall") score["Lipless Crankbait"] += 3;
      if (s === "Summer" && (t === "Morning" || t === "Evening")) score["Popping Frog"] += 3;
    }
    if (cov === "Wood") {
      score["Flipping Jig"] += 3;
      if (s === "Summer" && (t === "Midday" || t === "Evening")) score["Carolina Rig"] += 2;
      score["Texas-Rigged Creature"] += 2;
    }
    if (cov === "Rock") {
      score["Football Jig"] += 3;
      score["Squarebill Crankbait"] += s === "Spring" || s === "Fall" ? 2 : 0;
      if (s === "Summer") score["Carolina Rig"] += 2;
      if (s === "Winter" && c === "Clear") score["Jerkbait"] += 3;
      if (s === "Winter") score["Blade Bait"] += 3;
    }
    if (cov === "Open") {
      if (t === "Morning" || t === "Evening") score["Topwater (Walking Bait)"] += 3;
      if (c === "Clear" && (s === "Fall" || s === "Spring")) score["Soft Swimbait"] += 3;
      if (c !== "Muddy" && (s === "Winter" || sp === "Pre-Spawn")) score["Underspin"] += 2;
      score["Drop Shot"] += 1;
      if (c === "Clear") score["Ned Rig"] += 2;
      if (c !== "Clear") score["Weightless Senko"] += 1;
    }

    // Clarity
    if (c === "Clear") {
      score["Jerkbait"] += s === "Winter" || sp === "Pre-Spawn" ? 2 : 1;
      score["Soft Swimbait"] += 1;
      score["Ned Rig"] += 2;
      score["Spinnerbait"] -= 1;
    }
    if (c === "Stained") {
      score["Chatterbait"] += 1;
      score["Spinnerbait"] += 1;
    }
    if (c === "Muddy") {
      score["Chatterbait"] += 2;
      score["Spinnerbait"] += 2;
      score["Lipless Crankbait"] -= 2;
      score["Jerkbait"] -= 3;
      score["Ned Rig"] -= 2;
    }

    // Time
    if (t === "Morning" || t === "Evening") {
      score["Topwater (Walking Bait)"] += 2;
      if (cov === "Grass") score["Popping Frog"] += 2;
      score["Chatterbait"] += 1;
    }
    if (t === "Midday") {
      score["Carolina Rig"] += 1;
      score["Football Jig"] += 1;
      score["Drop Shot"] += 1;
    }

    // Season
    if (s === "Winter") {
      score["Blade Bait"] += 2;
      score["Jerkbait"] += c === "Clear" ? 2 : 0;
      score["Football Jig"] += 1;
      score["Drop Shot"] += 1;
      score["Topwater (Walking Bait)"] -= 3;
      score["Popping Frog"] -= 4;
    }
    if (s === "Spring") {
      score["Chatterbait"] += 2;
      score["Weightless Senko"] += 1;
      score["Texas-Rigged Creature"] += 1;
    }
    if (s === "Summer") {
      score["Popping Frog"] += cov === "Grass" ? 2 : 0;
      score["Carolina Rig"] += 1;
      score["Swim Jig"] += 1;
      score["Topwater (Walking Bait)"] += 1;
    }
    if (s === "Fall") {
      score["Lipless Crankbait"] += 2;
      score["Spinnerbait"] += c !== "Muddy" ? 2 : 0;
      score["Soft Swimbait"] += c === "Clear" ? 1 : 0;
    }

    // Spawn
    if (sp === "Pre-Spawn") {
      score["Chatterbait"] += 2;
      score["Jerkbait"] += c === "Clear" ? 1 : 0;
    }
    if (sp === "Spawn") {
      score["Weightless Senko"] += 3;
      score["Texas-Rigged Creature"] += 3;
      score["Jerkbait"] -= 3;
      score["Lipless Crankbait"] -= 2;
    }
    if (sp === "Post-Spawn") {
      score["Soft Swimbait"] += 2;
      score["Topwater (Walking Bait)"] += 2;
      score["Swim Jig"] += 1;
    }

    // Pick best
    let best: Lure = LURES[0];
    let bestScore = -Infinity;
    for (const l of LURES) {
      const jitter = Math.random() * 0.01;
      const sVal = score[l] + jitter;
      if (sVal > bestScore) {
        bestScore = sVal;
        best = l;
      }
    }

    // Color guidance by clarity
    let color = "Green Pumpkin";
    if (c === "Clear") color = "Natural (Green Pumpkin/Watermelon/Shad)";
    if (c === "Stained") color = "Chartreuse/White or Junebug";
    if (c === "Muddy") color = "Black/Blue";

    // Retrieve/depth presets
    const meta: Record<Lure, { retrieve: string; depth: string }> = {
      "Texas-Rigged Creature": { retrieve: "Pitch/drag with pauses", depth: "2–8 ft" },
      "Weightless Senko": { retrieve: "Slow sink; short twitches", depth: "2–10 ft" },
      "Drop Shot": { retrieve: "Twitch-shake in place", depth: "10–25 ft" },
      "Chatterbait": { retrieve: "Steady; rip free from grass", depth: "2–6 ft" },
      "Swim Jig": { retrieve: "Slow roll edges/lanes", depth: "2–6 ft" },
      "Flipping Jig": { retrieve: "Pitch to targets; short hops", depth: "2–10 ft" },
      "Football Jig": { retrieve: "Drag bottom; occasional hops", depth: "8–15 ft" },
      "Squarebill Crankbait": { retrieve: "Deflect off rock/cover", depth: "3–6 ft" },
      "Blade Bait": { retrieve: "Lift-drop near bottom", depth: "10–25 ft" },
      "Spinnerbait": { retrieve: "Burn then pause", depth: "2–8 ft" },
      "Topwater (Walking Bait)": { retrieve: "Walk-the-dog", depth: "Surface" },
      "Buzzbait": { retrieve: "Steady buzz", depth: "Surface" },
      "Lipless Crankbait": { retrieve: "Burn/yo-yo over grass", depth: "2–6 ft" },
      "Popping Frog": { retrieve: "Pop/twitch over mats", depth: "Surface" },
      "Jerkbait": { retrieve: "Twitch-twitch… long pause", depth: "4–8 ft" },
      "Soft Swimbait": { retrieve: "Slow roll mid-column", depth: "3–10 ft" },
      "Ned Rig": { retrieve: "Short hops; deadstick", depth: "6–20 ft" },
      "Carolina Rig": { retrieve: "Drag along points/ledges", depth: "8–20 ft" },
      "Underspin": { retrieve: "Slow roll near bait balls", depth: "6–15 ft" },
    };

    const { retrieve, depth } = meta[best];
    return { lure: best, color, retrieve, depth };
  }

  /** Button handler: show “Analyzing…” then show result, with animations */
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleRecommendPress() {
    if (!clarity || !cover || loadingAI) return;
    setResult(null);
    setLoadingAI(true);
    aiTimeoutRef.current = setTimeout(() => {
      const rec = computeRecommendation();
      setLoadingAI(false);
      setResult(rec);

      // 👇 After the result appears, wait N seconds, then trigger the prompt automatically
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
      promptTimerRef.current = setTimeout(() => {
        try {
          const recoId = [
            rec.lure,
            rec.color,
            time,
            season,
            clarity,
            cover,
            spawnPhase,
            coords ? `${coords.lat.toFixed(3)},${coords.lon.toFixed(3)}` : "nocoords",
            Date.now(), // unique per run
          ].join("|");

          // Schedule with 0 minutes so the hook pops it immediately
          schedulePrompt(
            {
              id: recoId,
              lureName: rec.lure,
              color: rec.color,
              depth: rec.depth,
            },
            0
          );
        } catch {}
      }, PROMPT_DELAY_SECONDS * 1000);

      // result fade in
      resultOpacity.setValue(0);
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      aiTimeoutRef.current = null;
    }, 3000);
  }

  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
    };
  }, []);

  const ready = useMemo(() => !!clarity && !!cover, [clarity, cover]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Make the status bar readable on your blue background */}
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Splash overlay with fade-out */}
        {overlayVisible && (
          <Animated.View style={[overlayStyles.wrap, { opacity: overlayOpacity }]} pointerEvents="none">
            <Image
              source={require("../../assets/images/splash.png")}
              style={overlayStyles.bg}
              resizeMode="contain"
              onError={(e) =>
                console.warn("Splash image failed to load", e.nativeEvent.error)
              }
            />
          </Animated.View>
        )}

        {/* Header + status */}
        <Text style={styles.title}>LureIQ</Text>
        <Text style={styles.subtitle}>
          I auto-set time, season & spawn from your location. Just answer two quick questions.
        </Text>

        <View style={styles.autoRow}>
          <Text style={styles.autoText}>
            {loadingAuto ? "Detecting…" : autoMsg ?? "Ready."}
            {coords ? `  (${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)})` : ""}
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={async () => {
              if (loadingAI) return;
              setStep(0);
              setResult(null);
              setClarity(null);
              setCover(null);
              try {
                setLoadingAuto(true);
                setAutoMsg("Refreshing location…");
                const pos = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                setCoords({ lat, lon });
                setAutoMsg("Pulling weather…");
                const url =
                  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                  `&hourly=precipitation,temperature_2m&daily=sunrise,sunset&timezone=auto`;
                const r = await fetch(url);
                const data = await r.json();
                const now = new Date();
                const sunrise = data?.daily?.sunrise?.[0]
                  ? new Date(data.daily.sunrise[0])
                  : null;
                const sunset = data?.daily?.sunset?.[0]
                  ? new Date(data.daily.sunset[0])
                  : null;
                setTime(inferTimeOfDay(now, sunrise, sunset));
                const m = now.getMonth();
                setSeason(
                  m <= 1 ? "Winter" : m <= 4 ? "Spring" : m <= 7 ? "Summer" : m <= 9 ? "Fall" : "Winter"
                );

                // clarity again
                const hoursArr: Date[] = (data?.hourly?.time || []).map(
                  (t: string) => new Date(t)
                );
                const precip: number[] = data?.hourly?.precipitation || [];
                const endIdx = findNearestHourIndex(hoursArr, now);
                const startIdx = Math.max(0, endIdx - 12);
                let total12h = 0;
                for (let i = startIdx; i <= endIdx; i++)
                  total12h += Number(precip[i] || 0);
                setClarity(total12h > 15 ? "Muddy" : total12h > 2 ? "Stained" : "Clear");

                // spawn again
                const airTimes: string[] = data?.hourly?.time || [];
                const airTempsC: number[] = data?.hourly?.temperature_2m || [];
                let sumF = 0, count = 0;
                for (let i = airTimes.length - 1; i >= 0; i--) {
                  const t = new Date(airTimes[i]);
                  const hrsAgo = (now.getTime() - t.getTime()) / (1000 * 60 * 60);
                  if (hrsAgo > 72) break;
                  const localHr = t.getHours();
                  if (localHr >= 12 && localHr <= 18) {
                    const airF = (airTempsC[i] as number) * (9 / 5) + 32;
                    sumF += airF;
                    count++;
                  }
                }
                const avgAirF = count ? sumF / count : null;
                const estWaterF = avgAirF ? Math.max(35, Math.min(90, avgAirF - 5)) : 55;
                setSpawnPhase(inferSpawnPhase(species, estWaterF, now, lat));

                setAutoMsg("Updated. Two quick questions ↓");
              } catch {
                setAutoMsg("Refresh failed — answer the two prompts manually.");
              } finally {
                setLoadingAuto(false);
              }
            }}
            disabled={loadingAuto || loadingAI}
          >
            {loadingAuto ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.refreshText}>Use my location</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ✅ QUICK TIPS (replaces LurePlanCard) */}
        <QuickTips />

        {/* STEP 0: clarity (fades in) */}
        {!loadingAI && step === 0 && (
          <Animated.View style={[styles.card, { opacity: stepOpacity }]}>
            <Text style={styles.cardTitle}>How’s the water look today?</Text>
            <View style={styles.row}>
              <Chip
                label="Open/Clear"
                selected={clarity === "Clear"}
                onPress={() => chooseClarity("Clear")}
              />
              <Chip
                label="Stained"
                selected={clarity === "Stained"}
                onPress={() => chooseClarity("Stained")}
              />
              <Chip
                label="Muddy"
                selected={clarity === "Muddy"}
                onPress={() => chooseClarity("Muddy")}
              />
            </View>
            <Text style={styles.helper}>
              (I guessed {clarity ?? "…"} from recent rain — tap to confirm.)
            </Text>
          </Animated.View>
        )}

        {/* STEP 1: cover (fades in) */}
        {!loadingAI && step === 1 && (
          <Animated.View style={[styles.card, { opacity: stepOpacity }]}>
            <Text style={styles.cardTitle}>Is there any cover on the water?</Text>
            <View style={styles.row}>
              <Chip
                label="Grass"
                selected={cover === "Grass"}
                onPress={() => chooseCover("Grass")}
              />
              <Chip
                label="Wood"
                selected={cover === "Wood"}
                onPress={() => chooseCover("Wood")}
              />
              <Chip
                label="Rocky"
                selected={cover === "Rock"}
                onPress={() => chooseCover("Rock")}
              />
              <Chip
                label="Clear (Open)"
                selected={cover === "Open"}
                onPress={() => chooseCover("Open")}
              />
            </View>
            <TouchableOpacity style={styles.backBtn} onPress={backOne}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            {!loadingAI && (
              <Animated.View style={[styles.summaryBox, { opacity: stepOpacity }]}>
                <Text style={styles.summaryText}>
                  {season} • {time} • {clarity} • {cover} •{" "}
                  {spawnPhase === "None" ? "No Spawn" : spawnPhase}
                </Text>
                <TouchableOpacity style={styles.backBtn} onPress={backOne}>
                  <Text style={styles.backText}>← Change answers</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {!loadingAI && (
              <TouchableOpacity
                style={[styles.cta, !ready && { opacity: 0.5 }]}
                onPress={handleRecommendPress}
                disabled={!ready}
                activeOpacity={0.9}
              >
                <Text style={styles.ctaText}>Get Lure Recommendation</Text>
              </TouchableOpacity>
            )}

            {loadingAI && (
              <Animated.View style={[styles.loadingCard, { opacity: analyzingOpacity }]}>
                <Text style={styles.analyzing}>
                  Analyzing data with A.I. to pick BEST possible lure…
                </Text>
              </Animated.View>
            )}

            {!loadingAI && result && (
              <Animated.View style={[styles.resultCard, { opacity: resultOpacity }]}>
                <Text style={styles.resultTitle}>{result.lure}</Text>
                <Text style={styles.resultLine}>
                  <Text style={styles.bold}>Color: </Text>
                  {result.color}
                </Text>
                <Text style={styles.resultLine}>
                  <Text style={styles.bold}>Depth: </Text>
                  {result.depth}
                </Text>
                <Text style={styles.resultLine}>
                  <Text style={styles.bold}>Retrieve: </Text>
                  {result.retrieve}
                </Text>
                <Text style={styles.disclaimer}>
                  (Time/season/spawn auto-set from your location. You answered water look + cover.)
                </Text>
              </Animated.View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ✅ Catch Feedback Modal */}
      <CatchFeedbackModal
        visible={modalVisible}
        lureName={scheduled?.lureName}
        submitting={submitting}
        onYes={() => submitFeedback({ caught: true })}
        onNo={() => submitFeedback({ caught: false })}
        onDismiss={dismissPrompt}
      />
    </SafeAreaView>
  );
}

/** Styles */
const styles = StyleSheet.create({
  // ✅ color the safe area so the blue goes behind the notch too
  safe: { flex: 1, backgroundColor: "#87AFC7" },

  container: { padding: 20, gap: 10 },

  // 🔺 made bigger + centered
  title: { fontSize: 32, fontWeight: "800", textAlign: "center", marginBottom: 6 },

  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 8 },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cfd3d8",
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: "#1e90ff", borderColor: "#1e90ff" },
  chipText: { fontSize: 15, fontWeight: "700" },
  chipTextSelected: { color: "#fff" },

  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  autoText: { fontSize: 12, opacity: 0.7, maxWidth: "65%" },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cfd3d8",
  },
  refreshText: { fontWeight: "700" },

  /** Tips styles */
  tipsCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  tipsTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
  tipBullet: { width: 16, textAlign: "center", fontSize: 16 },
  tipText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0b1f33" },

  /** Wizard styles */
  card: { padding: 16, borderRadius: 16, backgroundColor: "#274472", marginTop: 6 },
  cardTitle: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  helper: { color: "#e5e7eb", fontSize: 12, marginTop: 10 },

  backBtn: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 10 },
  backText: { color: "#fff", fontWeight: "700" },

  summaryBox: { marginTop: 6, padding: 12, borderRadius: 12, backgroundColor: "#f1f5f9" },
  summaryText: { fontSize: 14, fontWeight: "700" },

  cta: {
    marginTop: 10,
    backgroundColor: "#0f9d58",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "white", fontSize: 18, fontWeight: "800" },

  loadingCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#274472",
    alignItems: "center",
    justifyContent: "center",
  },
  analyzing: { color: "white", fontSize: 16, fontWeight: "800", textAlign: "center" },

  resultCard: { marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: "#274472" },
  resultTitle: { fontSize: 20, fontWeight: "800", color: "white", marginBottom: 8, textAlign: "center" },
  resultLine: { color: "white", marginTop: 2, fontSize: 14 },
  bold: { fontWeight: "800" },
  disclaimer: { color: "#e5e7eb", fontSize: 12, marginTop: 10 },
});

/** Overlay styles */
const overlayStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#87AFC7",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  bg: { width: "100%", height: "100%" },
});
