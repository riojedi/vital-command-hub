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
  const baseUrl = process.env["VPS_API_BASE_URL"] || "http://15.204.83.117:8000";
  const token = process.env["SECURE_API_TOKEN"] || "";

  if (!baseUrl || !token) {
    return {
      ok: false,
      unconfigured: true,
      error: "Bridge credentials are not configured (VPS_API_BASE_URL / SECURE_API_TOKEN).",
    };
  }

  try {
    let cleanBase = baseUrl.replace(/\/$/, "");
    if (cleanBase.endsWith("/api") && path.startsWith("/api")) {
      cleanBase = cleanBase.slice(0, -4);
    }
    const res = await fetch(`${cleanBase}${path}`, {

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
  recent_publications?: Array<{ 
    title?: string; 
    date?: string; 
    ghost_post_id?: string;
    article_url?: string;
    ghost_editor_url?: string;
  }>;
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
  .validator((input: unknown) => configSchema.parse(input))
  .handler(({ data }) =>

    callBridge<{ status: string; message?: string }>("/config", {
      method: "PATCH",
      body: data,
    }),
  );

// ============ API key vault ============

export type EnvKeyRecord = {
  key: string;
  /** Masked preview only — raw secret values are never returned to the browser. */
  masked: string;
  configured: boolean;
  updated_at?: string | null;
};

/** Masks server-side so a raw credential can never reach the client bundle. */
function maskValue(raw: unknown): { masked: string; configured: boolean } {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { masked: "not set", configured: false };
  }
  const v = raw.trim();
  if (v.length <= 8) return { masked: `${v.slice(0, 2)}…`, configured: true };
  return { masked: `${v.slice(0, 5)}…${v.slice(-2)}`, configured: true };
}

export const VAULT_KEYS = [
  "ANTHROPIC_API_KEY",
  "DEEPSEEK_API_KEY",
  "PERPLEXITY_API_KEY",
  "GHOST_ADMIN_API_KEY",
  "RESEND_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

export const getEnvKeys = createServerFn({ method: "GET" }).handler(
  async (): Promise<BridgeResult<EnvKeyRecord[]>> => {
    const res = await callBridge<Record<string, unknown> | Array<Record<string, unknown>>>(
      "/api/config/env",
    );
    if (!res.ok) return res;

    const raw = res.data;
    const lookup = new Map<string, unknown>();
    const meta = new Map<string, string | null>();

    if (Array.isArray(raw)) {
      for (const row of raw) {
        const key = typeof row["key"] === "string" ? row["key"] : null;
        if (!key) continue;
        lookup.set(key, row["value"] ?? row["masked"] ?? row["preview"]);
        meta.set(key, typeof row["updated_at"] === "string" ? row["updated_at"] : null);
      }
    } else if (raw && typeof raw === "object") {
      const source = (raw["env"] ?? raw["keys"] ?? raw) as Record<string, unknown>;
      for (const [key, value] of Object.entries(source)) lookup.set(key, value);
    }

    return {
      ok: true,
      data: VAULT_KEYS.map((key) => {
        const incoming = lookup.get(key);
        // The bridge may already return a masked preview; keep it, otherwise mask here.
        if (typeof incoming === "string" && /\.\.\.|…|\*/.test(incoming)) {
          return { key, masked: incoming, configured: true, updated_at: meta.get(key) ?? null };
        }
        return { key, ...maskValue(incoming), updated_at: meta.get(key) ?? null };
      }),
    };
  },
);

const envUpdateSchema = z.object({
  key: z.enum(VAULT_KEYS),
  value: z.string().min(4).max(4096),
});

export const updateEnvKey = createServerFn({ method: "POST" })
  .validator((input: unknown) => envUpdateSchema.parse(input))
  .handler(({ data }) =>

    callBridge<{ status?: string; message?: string }>("/api/config/env", {
      method: "PATCH",
      body: [{ key: data.key, value: data.value.trim() }],
    }),
  );
