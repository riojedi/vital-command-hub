export const QUEUE_STATES = [
  "queued",
  "claimed",
  "researching",
  "research_failed",
  "verifying",
  "verification_failed",
  "drafting",
  "editing",
  "revision_required",
  "approved",
  "pending_human_review",
  "publishing",
  "published",
  "publication_failed",
  "quarantined",
] as const;

export type QueueState = (typeof QUEUE_STATES)[number];

export const ALERT_STATES: string[] = ["verification_failed", "quarantined"];

export const FAILURE_STATES: string[] = [
  "research_failed",
  "publication_failed",
  "revision_required",
];

export const TERMINAL_OK_STATES: string[] = ["published", "approved"];

export function stateTone(status: string): "alert" | "warn" | "ok" | "active" {
  if (ALERT_STATES.includes(status)) return "alert";
  if (FAILURE_STATES.includes(status)) return "warn";
  if (TERMINAL_OK_STATES.includes(status)) return "ok";
  return "active";
}

export const SLA = {
  costPerArticle: 0.18,
  completionRate: 0.985,
  meanExecutionMinutes: 4,
};
