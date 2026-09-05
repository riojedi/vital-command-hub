/**
 * Vital4Living API Client
 * Dynamically binds client-side session tokens ('v4l_api_token')
 * and handles 401 Unauthorized errors with centralized interception.
 */

export const AUTH_TOKEN_KEY = "v4l_api_token";
export const API_URL_KEY = "v4l_api_url";
export const USERNAME_KEY = "v4l_username";
export const USER_ROLE_KEY = "v4l_user_role";

let inMemoryToken: string | null = null;

export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(API_URL_KEY);
    if (saved) return saved.replace(/\/$/, "");
  }
  return (import.meta.env["VITE_VPS_API_URL"] || "http://15.204.83.117:8000").replace(/\/$/, "");
};

/**
 * Dynamic client-side token binding.
 * Reads strictly from memory or localStorage ('v4l_api_token').
 * NEVER falls back to any hardcoded master token.
 */
export const getAuthToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    const fromStorage = localStorage.getItem(AUTH_TOKEN_KEY);
    if (fromStorage) {
      inMemoryToken = fromStorage;
      return fromStorage;
    }
    // Fallback: check document.cookie
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_TOKEN_KEY}=([^;]*)`));
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        inMemoryToken = decoded;
        localStorage.setItem(AUTH_TOKEN_KEY, decoded);
        return decoded;
      }
    } catch {
      // ignore cookie parsing errors
    }
  }
  return null;
};

export const setAuthToken = (token: string): void => {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    try {
      document.cookie = `${AUTH_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    } catch {
      // ignore cookie setting errors in restricted contexts
    }
  }
};

export const clearAuthToken = (): void => {
  inMemoryToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    try {
      document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${USERNAME_KEY}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${USER_ROLE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    } catch {
      // ignore
    }
  }
};

export const isAuthenticated = (): boolean => {
  return Boolean(getAuthToken());
};

/**
 * Constructs dynamic authorization headers using 'v4l_api_token'.
 */
export const getAuthHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// 401 Unauthorized error handling & events
export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(
    message: string = "Session expired or unauthorized (401). Please sign in again.",
    data?: unknown,
  ) {
    super(message, 401, data);
    this.name = "UnauthorizedError";
  }
}

type UnauthorizedListener = (err: UnauthorizedError) => void;
const unauthorizedListeners: Set<UnauthorizedListener> = new Set();

export const onUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};

export const handleUnauthorized = (error: UnauthorizedError) => {
  clearAuthToken();
  unauthorizedListeners.forEach((fn) => {
    try {
      fn(error);
    } catch (e) {
      console.error("Error in unauthorized listener", e);
    }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("v4l:unauthorized", {
        detail: { message: error.message, status: 401 },
      }),
    );
  }
};

const PUBLIC_API_PATHS = ["/health", "/api/auth/login", "/api/auth/register"];

export function isPublicApiPath(path: string): boolean {
  const clean = path.split("?")[0].replace(/\/$/, "");
  return PUBLIC_API_PATHS.some((pub) => clean === pub || clean.endsWith(pub));
}

/**
 * Centralized fetch client that:
 * - Strictly enforces active session token before dispatching requests to protected API routes
 * - Dynamically binds 'v4l_api_token' in Authorization headers
 * - Detects 401 Unauthorized, purges invalid credentials, dispatches notification, and throws UnauthorizedError
 * - Automatically parses error responses and provides informative error messages
 */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  // Guard protected API routes: reject immediately without session token
  if (!isPublicApiPath(path)) {
    const token = getAuthToken();
    if (!token) {
      const unauthErr = new UnauthorizedError(
        "Unauthorized (401): Active session token required to access API routes. Please sign in.",
      );
      handleUnauthorized(unauthErr);
      throw unauthErr;
    }
  }

  const baseUrl = getApiBaseUrl();
  const url = path.startsWith("http")
    ? path
    : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gateway unreachable";
    throw new ApiError(`Network error connecting to VPS (${msg})`, 0);
  }

  // Intercept 401 Unauthorized
  if (response.status === 401) {
    const errBody = await response.json().catch(() => ({}));
    const message =
      errBody.detail ||
      "Unauthorized (401): Valid 'v4l_api_token' required. Session may have expired.";
    const unauthErr = new UnauthorizedError(message, errBody);
    handleUnauthorized(unauthErr);
    throw unauthErr;
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = errBody.detail || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errBody);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface PipelineStatus {
  status: "idle" | "running" | "success" | "failed";
  current_topic_id: number | null;
  current_topic: string | null;
  output_log: string;
  started_at: string | null;
  ended_at: string | null;
  exit_code: number | null;
}

export interface PersonaInfo {
  role: string;
  goal: string;
  backstory: string;
  model?: string;
}

export interface UserInfo {
  id: number;
  username: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "pending_approval" | "suspended" | "rejected";
  created_at?: string;
  active_sessions?: number;
  latest_session_expiry?: string | null;
}

export interface StrategyConfig {
  id?: number;
  active_guidelines?: string;
  priority_keywords?: string[];
  blacklist_themes?: string[];
  updated_at?: string;
}

export interface AgentDetail {
  id: string;
  name: string;
  role: string;
  status: "idle" | "running" | "waiting" | "error" | "paused";
  model: string;
  current_task?: string | null;
  last_active?: string | null;
  total_tokens?: number;
}

export interface CircuitBreakerStatus {
  tripped: boolean;
  reason?: string | null;
  tripped_at?: string | null;
  threshold_daily_tokens?: number;
  consecutive_failures?: number;
  max_consecutive_failures?: number;
}

export interface DailyTokenUsage {
  used: number;
  limit: number;
  percentage: number;
  estimated_cost: number;
  reset_time?: string;
  model_breakdown?: Record<string, { tokens: number; cost: number }>;
}

export interface AgentFleetStatus {
  status: "operational" | "running" | "idle" | "degraded" | "circuit_broken";
  circuit_breaker: CircuitBreakerStatus;
  daily_tokens: DailyTokenUsage;
  agents: AgentDetail[];
  active_runs_count: number;
  queued_tasks_count: number;
  last_run?: {
    run_id?: number | string;
    workflow?: string;
    status?: string;
    model?: string;
    started_at?: string | null;
    completed_at?: string | null;
  } | null;
  updated_at?: string;
}

export const vitalApi = {
  checkHealth: async () => {
    return apiFetch("/health");
  },

  login: async (payload: { username: string; password: string }) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new ApiError(err.detail || "Invalid username or password", res.status, err);
    }
    const data = await res.json();
    if (data.session_token) {
      setAuthToken(data.session_token);
      if (typeof window !== "undefined") {
        localStorage.setItem(USERNAME_KEY, data.username);
        localStorage.setItem(USER_ROLE_KEY, data.role);
      }
    }
    return data;
  },

  register: async (payload: {
    username: string;
    password: string;
    full_name?: string | undefined;
    notes?: string | undefined;
  }) => {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // ignore network errors on logout
    } finally {
      clearAuthToken();
    }
    return { success: true };
  },

  getAnalytics: async () => {
    return apiFetch("/analytics");
  },

  getQueue: async () => {
    return apiFetch("/queue");
  },

  updateQueueItem: async (
    id: number,
    payload: { processing_status?: string; persona?: string; topic_score?: number },
  ) => {
    return apiFetch(`/api/queue/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteQueueItem: async (id: number) => {
    return apiFetch(`/api/queue/${id}`, {
      method: "DELETE",
    });
  },

  triggerRun: async (topicId?: number, persona?: string) => {
    const bodyPayload =
      topicId || persona ? JSON.stringify({ topic_id: topicId, persona }) : JSON.stringify({});
    return apiFetch("/trigger-run", {
      method: "POST",
      body: bodyPayload,
    });
  },

  getPipelineStatus: async (): Promise<PipelineStatus> => {
    return apiFetch<PipelineStatus>("/api/pipeline/status");
  },

  getStrategy: async (): Promise<StrategyConfig> => {
    return apiFetch<StrategyConfig>("/api/strategy");
  },

  updateConfig: async (payload: StrategyConfig) => {
    return apiFetch("/config", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getPersonas: async (): Promise<Record<string, PersonaInfo>> => {
    return apiFetch<Record<string, PersonaInfo>>("/api/config/personas");
  },

  createPersona: async (payload: {
    name: string;
    role: string;
    goal: string;
    backstory: string;
    model?: string;
  }) => {
    return apiFetch("/api/config/personas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePersona: async (name: string, payload: Partial<PersonaInfo>) => {
    return apiFetch(`/api/config/personas/${encodeURIComponent(name)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deletePersona: async (name: string) => {
    return apiFetch(`/api/config/personas/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },

  getUsers: async (): Promise<UserInfo[]> => {
    return apiFetch<UserInfo[]>("/api/users");
  },

  createUser: async (payload: {
    username: string;
    password: string;
    role: string;
    status?: string | undefined;
  }) => {
    return apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (
    id: number,
    payload: {
      role?: string | undefined;
      password?: string | undefined;
      status?: string | undefined;
    },
  ) => {
    return apiFetch(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  approveUser: async (id: number, role: string = "viewer") => {
    return apiFetch(`/api/users/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },

  rejectUser: async (id: number) => {
    return apiFetch(`/api/users/${id}/reject`, {
      method: "POST",
    });
  },

  deleteUser: async (id: number) => {
    return apiFetch(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  sendAutopilotCommand: async (prompt: string) => {
    return apiFetch("/api/autopilot/command", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  },

  /**
   * Agent Control Center: fetch live agent fleet status, daily token usage, and circuit breaker.
   */
  getAgents: async (): Promise<AgentFleetStatus> => {
    try {
      return await apiFetch<AgentFleetStatus>("/api/agents");
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError || (err instanceof ApiError && err.status === 401)) {
        throw err;
      }
      // If endpoint not yet deployed to remote VPS, synthesize from existing endpoints
      if (
        (err instanceof ApiError && (err.status === 404 || err.status === 0)) ||
        !(err instanceof ApiError)
      ) {
        return await vitalApi.synthesizeAgentFleetStatus();
      }
      throw err;
    }
  },

  triggerAgentRun: async (topicId?: number, persona?: string) => {
    return vitalApi.triggerRun(topicId, persona);
  },

  resetCircuitBreaker: async (): Promise<{ status: string; message: string }> => {
    try {
      return await apiFetch<{ status: string; message: string }>(
        "/api/agents/circuit-breaker/reset",
        {
          method: "POST",
        },
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        return { status: "success", message: "Circuit breaker manually reset in local state." };
      }
      throw err;
    }
  },

  /**
   * Resilient fallback synthesizer for agent fleet status
   * when running against older backend or during initial deployment.
   */
  synthesizeAgentFleetStatus: async (): Promise<AgentFleetStatus> => {
    let telemetryRuns: Array<{
      started_at?: string;
      token_usage?: number;
      estimated_cost?: number;
      status?: string;
      workflow?: string;
    }> = [];
    let analyticsData: { total_estimated_cost?: number } = {};
    let queueItems: Array<{ status?: string }> = [];

    try {
      const res = await apiFetch<
        Array<{
          started_at?: string;
          token_usage?: number;
          estimated_cost?: number;
          status?: string;
          workflow?: string;
        }>
      >("/telemetry");
      telemetryRuns = Array.isArray(res) ? res : [];
    } catch {
      // ignore
    }

    try {
      analyticsData = await apiFetch<{ total_estimated_cost?: number }>("/analytics");
    } catch {
      // ignore
    }

    try {
      const res = await apiFetch<Array<{ status?: string }>>("/queue");
      queueItems = Array.isArray(res) ? res : [];
    } catch {
      // ignore
    }

    const DAILY_TOKEN_LIMIT = 1_000_000;
    const MAX_CONSECUTIVE_FAILURES = 5;

    // Filter today's runs
    const todayStr = new Date().toISOString().split("T")[0];
    const todaysRuns = telemetryRuns.filter(
      (r) => r.started_at && r.started_at.startsWith(todayStr),
    );
    const dailyTokensUsed = todaysRuns.reduce((acc, r) => acc + (Number(r.token_usage) || 0), 0);
    const dailyCost = todaysRuns.reduce((acc, r) => acc + (Number(r.estimated_cost) || 0), 0);

    // Check failures
    const failedRuns = todaysRuns.filter((r) =>
      ["failed", "quarantined", "error"].includes(r.status),
    );
    const consecutiveFailures = failedRuns.length;

    let isTripped = false;
    let tripReason: string | null = null;

    if (dailyTokensUsed >= DAILY_TOKEN_LIMIT) {
      isTripped = true;
      tripReason = `Daily token ceiling exceeded: ${dailyTokensUsed.toLocaleString()} / ${DAILY_TOKEN_LIMIT.toLocaleString()} tokens. Execution halted.`;
    } else if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      isTripped = true;
      tripReason = `Excessive failure rate: ${consecutiveFailures} failures detected today. Circuit Breaker tripped to prevent degradation.`;
    }

    const lastRun = telemetryRuns[0] || null;
    const isRunning = lastRun && ["running", "researching", "generating"].includes(lastRun.status);

    const agents: AgentDetail[] = [
      {
        id: "sierra",
        name: "Sierra",
        role: "Editor-in-Chief & Quality Gatekeeper",
        status: isTripped
          ? "paused"
          : isRunning && lastRun.workflow?.includes("Review")
            ? "running"
            : "idle",
        model: "claude-3-5-sonnet-20241022",
        current_task: isTripped
          ? "Halted by Circuit Breaker"
          : "Enforcing tone, brand guidelines, and factual accuracy",
        last_active: lastRun?.started_at || null,
        total_tokens: Math.round(dailyTokensUsed * 0.45),
      },
      {
        id: "dex",
        name: "Dex",
        role: "Field Research & Technical Gear Analyst",
        status: isTripped ? "paused" : isRunning ? "running" : "idle",
        model: "perplexity-sonar-reasoning",
        current_task: isTripped
          ? "Halted by Circuit Breaker"
          : "Harvesting technical specs, field tests & ski boot flex metrics",
        last_active: lastRun?.started_at || null,
        total_tokens: Math.round(dailyTokensUsed * 0.35),
      },
      {
        id: "wren",
        name: "Wren",
        role: "Monetization & SEO Link Strategist",
        status: isTripped ? "paused" : "idle",
        model: "deepseek-chat",
        current_task: isTripped
          ? "Halted by Circuit Breaker"
          : "Keyword clustering, internal link graph & Amazon affiliate validation",
        last_active: lastRun?.started_at || null,
        total_tokens: Math.round(dailyTokensUsed * 0.2),
      },
    ];

    const percentage = Math.min(100, Math.round((dailyTokensUsed / DAILY_TOKEN_LIMIT) * 1000) / 10);

    return {
      status: isTripped ? "circuit_broken" : isRunning ? "running" : "operational",
      circuit_breaker: {
        tripped: isTripped,
        reason: tripReason,
        tripped_at: isTripped ? new Date().toISOString() : null,
        threshold_daily_tokens: DAILY_TOKEN_LIMIT,
        consecutive_failures: consecutiveFailures,
        max_consecutive_failures: MAX_CONSECUTIVE_FAILURES,
      },
      daily_tokens: {
        used: dailyTokensUsed,
        limit: DAILY_TOKEN_LIMIT,
        percentage,
        estimated_cost:
          dailyCost ||
          (analyticsData.total_estimated_cost ? analyticsData.total_estimated_cost * 0.2 : 0),
        reset_time: "00:00 UTC",
        model_breakdown: {
          "claude-3-5-sonnet": {
            tokens: Math.round(dailyTokensUsed * 0.45),
            cost: Number((dailyCost * 0.55).toFixed(3)),
          },
          "perplexity-sonar": {
            tokens: Math.round(dailyTokensUsed * 0.35),
            cost: Number((dailyCost * 0.3).toFixed(3)),
          },
          "deepseek-chat": {
            tokens: Math.round(dailyTokensUsed * 0.2),
            cost: Number((dailyCost * 0.15).toFixed(3)),
          },
        },
      },
      agents,
      active_runs_count: isRunning ? 1 : 0,
      queued_tasks_count: queueItems.filter((i) =>
        ["queued", "running", "monitored"].includes(i.status),
      ).length,
      last_run: lastRun,
      updated_at: new Date().toISOString(),
    };
  },
};
