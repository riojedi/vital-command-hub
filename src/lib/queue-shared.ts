export {
  QUEUE_STATES,
  ALERT_STATES,
  FAILURE_STATES,
  TERMINAL_OK_STATES,
  stateTone,
  SLA,
} from "./queue-states";
export type { QueueState } from "./queue-states";

export type QueueItem = {
  queue_id?: number | string;
  title?: string;
  status?: string;
  topic?: string;
  updated_at?: string | null;
  claimed_by?: string | null;
};

export type TelemetryRun = {
  run_id?: number | string;
  workflow?: string;
  status?: string;
  model?: string | null;
  token_usage?: number | null;
  estimated_cost?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
};
