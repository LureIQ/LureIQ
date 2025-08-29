import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/** Types coming in from your recommender */
export type LureReco = {
  id: string;                 // unique id for the recommendation (e.g. uuid)
  lureName: string;           // "Green Chatterbait 3/8 oz"
  color?: string;             // optional
  depth?: string;             // optional
};

type FeedbackRecord = {
  id: string;                 // feedback id (uuid)
  recoId: string;             // ties to LureReco.id
  lureName: string;
  caught: boolean;
  count?: number;
  notes?: string;
  timestamp: number;          // ms epoch
  location?: { lat: number; lon: number } | null;
};

const KEY_SCHEDULED = "lureiq_feedback_scheduled"; // JSON: {recoId, lureName, dueAt}
const KEY_QUEUE = "lureiq_feedback_queue";         // JSON: FeedbackRecord[]

type ScheduledPayload = {
  recoId: string;
  lureName: string;
  dueAt: number; // ms epoch
};

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Fake uploader: replace URL with your backend endpoint when ready */
async function uploadToBackend(records: FeedbackRecord[]) {
  // TODO: point this at your real API, include auth if needed.
  // Example:
  // await fetch("https://your.api/lureiq/catch-feedback", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ records }),
  // });
  // For now we simulate success:
  await new Promise((res) => setTimeout(res, 250));
}

export function useCatchFeedback() {
  const [modalVisible, setModalVisible] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // one-shot timer that pops the modal when due
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const armTimer = (dueAt: number | null) => {
    clearTimer();
    if (!dueAt) return;
    const delay = Math.max(0, dueAt - Date.now());
    timerRef.current = setTimeout(() => {
      setModalVisible(true);
      timerRef.current = null;
    }, delay);
  };

  // Load any scheduled prompt on mount
  useEffect(() => {
    (async () => {
      const sched = await getJSON<ScheduledPayload | null>(KEY_SCHEDULED, null);
      setScheduled(sched);
      // if already due, show now; otherwise arm timer
      if (sched) {
        if (Date.now() >= sched.dueAt) {
          setModalVisible(true);
        } else {
          armTimer(sched.dueAt);
        }
      }
      flushQueue(); // opportunistically flush any queued feedback
    })();

    // show/arm on return-to-foreground
    const sub = AppState.addEventListener("change", async (s) => {
      if (s === "active") {
        const sched = await getJSON<ScheduledPayload | null>(KEY_SCHEDULED, null);
        setScheduled(sched);
        if (sched) {
          if (Date.now() >= sched.dueAt) {
            setModalVisible(true);
            clearTimer();
          } else {
            armTimer(sched.dueAt);
          }
        } else {
          clearTimer();
        }
        flushQueue();
      }
    });

    return () => {
      sub.remove();
      clearTimer();
    };
  }, []);

  /** Call this RIGHT AFTER you render a recommendation */
  const schedulePrompt = useCallback(async (reco: LureReco, delayMinutes = 90) => {
    const dueAt =
      delayMinutes <= 0
        ? Date.now()
        : Date.now() + Math.max(0, Math.floor(delayMinutes)) * 60 * 1000;

    const payload: ScheduledPayload = {
      recoId: reco.id,
      lureName: reco.lureName,
      dueAt,
    };
    await setJSON(KEY_SCHEDULED, payload);
    setScheduled(payload);

    // If due now, show immediately; otherwise arm the one-shot timer
    if (Date.now() >= dueAt) {
      setModalVisible(true);
      clearTimer();
    } else {
      armTimer(dueAt);
    }
  }, []);

  /** If user starts/ends a trip, you can bring the prompt early */
  const forcePromptNow = useCallback(async () => {
    const sched = await getJSON<ScheduledPayload | null>(KEY_SCHEDULED, null);
    if (sched) {
      sched.dueAt = Date.now();
      await setJSON(KEY_SCHEDULED, sched);
      setScheduled(sched);
      setModalVisible(true);
      clearTimer();
    }
  }, []);

  /**
   * ✅ Optimistic close: hide the modal immediately on tap,
   * then do location/storage/upload in the background.
   */
  const submitFeedback = useCallback(
    (data: { caught: boolean; count?: number; notes?: string }) => {
      // Hide modal RIGHT AWAY so the UI feels instant
      setModalVisible(false);

      // If nothing scheduled, nothing to record — bail early
      if (!scheduled) return;

      // Run the rest asynchronously (fire-and-forget)
      (async () => {
        setSubmitting(true);

        let loc: { lat: number; lon: number } | null = null;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const p = await Location.getCurrentPositionAsync({});
            loc = { lat: p.coords.latitude, lon: p.coords.longitude };
          }
        } catch {
          // ignore if user denies or anything fails
        }

        const record: FeedbackRecord = {
          id: `${scheduled.recoId}:${Date.now()}`,
          recoId: scheduled.recoId,
          lureName: scheduled.lureName,
          caught: data.caught,
          count: data.count,
          notes: data.notes,
          timestamp: Date.now(),
          location: loc,
        };

        try {
          // queue locally
          const q = await getJSON<FeedbackRecord[]>(KEY_QUEUE, []);
          q.push(record);
          await setJSON(KEY_QUEUE, q);

          // clear scheduled prompt so it won’t reappear
          await setJSON<ScheduledPayload | null>(KEY_SCHEDULED, null);
          setScheduled(null);
          clearTimer();

          // try to upload queued records (non-blocking for the user experience)
          await flushQueue();
        } catch (e) {
          // it's fine, will retry next time
        } finally {
          setSubmitting(false);
        }
      })();
    },
    [scheduled]
  );

  const dismissPrompt = useCallback(async () => {
    await setJSON<ScheduledPayload | null>(KEY_SCHEDULED, null);
    setScheduled(null);
    setModalVisible(false);
    clearTimer();
  }, []);

  const flushQueue = useCallback(async () => {
    const q = await getJSON<FeedbackRecord[]>(KEY_QUEUE, []);
    if (!q.length) return;
    await uploadToBackend(q);
    await setJSON<FeedbackRecord[]>(KEY_QUEUE, []);
  }, []);

  return {
    // state
    modalVisible,
    scheduled,
    submitting,
    // actions
    schedulePrompt,
    forcePromptNow,
    submitFeedback,
    dismissPrompt,
  };
}
