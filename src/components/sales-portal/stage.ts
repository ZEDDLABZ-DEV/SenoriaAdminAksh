import type { LeadStage } from "@/lib/sales-portal";

export function stageTone(stage: LeadStage): "neutral" | "good" | "warn" | "bad" {
  if (stage === "Won" || stage === "Visit booked") return "good";
  if (stage === "Lost") return "bad";
  if (stage === "New") return "warn";
  return "neutral";
}
