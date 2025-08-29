// app/services/feedback.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Conditions } from "../conditions/ConditionsContext";

export type StoredPlan = {
  lureName: string;
  color: string;
  shortHowTo: string;
};

export type FeedbackEntry = {
  id: string; // uuid-ish
  ts: string; // ISO timestamp
  success: boolean; // true = caught fish, false = no catch
  conditions: Conditions;
  plan: StoredPlan;
};

const KEY = "lureiq:feedback:v1";

// util
const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

async function readAll(): Promise<FeedbackEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FeedbackEntry[];
  } catch {
    return [];
  }
}

async function writeAll(items: FeedbackEntry[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

/** Call this when the user taps Yes/No under the plan */
export async function recordOutcome(opts: {
  success: boolean;
  conditions: Conditions;
  plan: StoredPlan;
}) {
  const entry: FeedbackEntry = {
    id: uuid(),
    ts: new Date().toISOString(),
    success: opts.success,
    conditions: opts.conditions,
    plan: opts.plan,
  };
  const existing = await readAll();
  existing.push(entry);
  await writeAll(existing);
  return entry;
}

/** Return all logs since N days ago (for monthly trainer/ETL) */
export async function getFeedbackSinceDays(days: number): Promise<FeedbackEntry[]> {
  const items = await readAll();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter((x) => new Date(x.ts).getTime() >= cutoff);
}

/** Pop (return & clear) everything — handy for a monthly upload */
export async function popAllFeedback(): Promise<FeedbackEntry[]> {
  const items = await readAll();
  await writeAll([]); // clear after popping
  return items;
}

/** For debugging: how many logs we have stored */
export async function getPendingFeedbackCount(): Promise<number> {
  const items = await readAll();
  return items.length;
}
