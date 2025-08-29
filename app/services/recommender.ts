// app/services/recommender.ts
import type { Conditions } from "../conditions/ConditionsContext";

export type LurePlan = {
  lureName: string;
  color: string;
  shortHowTo: string;
};

export async function getLureRecommendation(conditions: Conditions): Promise<LurePlan> {
  const { season, timeOfDay, clarity } = conditions;

  // Coalesce possibly-null values to safe numbers
  const wind = conditions.windMph ?? 0;
  const water = conditions.waterTempF ?? 65;

  let lureName = "Green Pumpkin Chatterbait";
  let color = "Green Pumpkin";
  let shortHowTo = "Slow-roll along grass edges; add twitches if you tick cover.";

  if (season === "summer" && water >= 75 && wind >= 8) {
    lureName = "1/2 oz Spinnerbait";
    color = clarity === "clear" ? "White/Silver" : "Chartreuse/White";
    shortHowTo = "Burn it high; pause when it flashes by cover.";
  } else if (timeOfDay === "dawn" || timeOfDay === "evening") {
    lureName = "Walking Topwater";
    color = clarity === "clear" ? "Bone" : "Black";
    shortHowTo = "Walk-the-dog steady; 1–2s pause after blowups, then resume.";
  } else if (clarity === "muddy") {
    lureName = "Black/Blue Jig + Trailer";
    color = "Black/Blue";
    shortHowTo = "Drag & hop slowly on hard bottom; feel for subtle ticks.";
  }

  return { lureName, color, shortHowTo };
}
