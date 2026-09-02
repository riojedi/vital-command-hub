import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server-side proxy to the Vital4Living FastAPI bridge running on the OVHcloud VPS.
 * The SECURE_API_TOKEN (mapped to LITELLM_MASTER_KEY on the VPS) never reaches the browser.
 */

export type BridgeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; unconfigured?: boolean };

async function callBridge<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<BridgeResult<T>> {
  const baseUrl = process.env["VPS_API_BASE_URL"];
  const token = process.env["SECURE_API_TOKEN"];

  if (!baseUrl || !token) {
    return {
      ok: false,
      unconfigured: true,
      error: "Bridge credentials are not configured (VPS_API_BASE_URL / SECURE_API_TOKEN).",
    };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Bridge ${path} failed: ${res.status} ${text.slice(0, 300)}`);
      return {
        ok: false,
        error:
          res.status === 401
            ? "Unauthorized — the bearer token does not match LITELLM_MASTER_KEY on the VPS."
            : `Bridge responded ${res.status}.`,
      };
    }

    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    console.error(`Bridge ${path} unreachable`, err);
    return { ok: false, error: "VPS bridge unreachable (network timeout or service down)." };
  }
}

export type HealthPayload = { status: string; vps_ip?: string };

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

export type AnalyticsPayload = {
  recent_publications?: Array<{ title?: string; date?: string; ghost_post_id?: string }>;
  total_token_usage?: number | null;
  total_estimated_cost?: number | null;
};

export const getHealth = createServerFn({ method: "GET" }).handler(() =>
  callBridge<HealthPayload>("/health"),
);

export const getQueue = createServerFn({ method: "GET" }).handler(() =>
  callBridge<QueueItem[] | { items: QueueItem[] }>("/queue"),
);

export const getTelemetry = createServerFn({ method: "GET" }).handler(() =>
  callBridge<TelemetryRun[] | { runs: TelemetryRun[] }>("/telemetry"),
);

export const getAnalytics = createServerFn({ method: "GET" }).handler(() =>
  callBridge<AnalyticsPayload>("/analytics"),
);

export const triggerRun = createServerFn({ method: "POST" }).handler(() =>
  callBridge<{ status: string; task_id?: number | string; pid?: number }>("/trigger-run", {
    method: "POST",
  }),
);

const configSchema = z.object({
  active_guidelines: z.string().min(1).max(4000),
  priority_keywords: z.array(z.string().min(1).max(120)).max(50),
  blacklist_themes: z.array(z.string().min(1).max(120)).max(50),
});

export const updateConfig = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => configSchema.parse(input))
  .handler(({ data }) =>
    callBridge<{ status: string; message?: string }>("/config", {
      method: "PATCH",
      body: data,
    }),
  );
