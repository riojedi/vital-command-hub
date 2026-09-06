import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Play,
  RefreshCw,
  Cpu,
  AlertTriangle,
  Clock,
  Coins,
  Bot,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Lock,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  vitalApi,
  getAuthToken,
  isAuthenticated,
  type AgentFleetStatus,
  type AgentDetail,
  ApiError,
  UnauthorizedError,
} from "@/lib/vitalApi";

export function AgentControlCenter() {
  const [fleetStatus, setFleetStatus] = useState<AgentFleetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [resettingBreaker, setResettingBreaker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("viewer");

  // Fetch agent status and daily token usage from FastAPI backend (/api/agents)
  const fetchAgentStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const data = await vitalApi.getAgents();
      setFleetStatus(data);
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError || (err instanceof ApiError && err.status === 401)) {
        setIsUnauthorized(true);
        setError(
          "Unauthorized (401): Dynamic 'v4l_api_token' is missing or expired. Please authenticate.",
        );
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to retrieve agent status from FastAPI gateway (/api/agents).";
        setError(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial mount & live event listener
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("v4l_user_role");
      if (role) setUserRole(role);

      // Listen for global 401 unauthorized events emitted by vitalApi
      const handleUnauth = () => {
        setIsUnauthorized(true);
        setError("Your session has expired or token is invalid. Please sign in again.");
      };

      window.addEventListener("v4l:unauthorized", handleUnauth);
      return () => window.removeEventListener("v4l:unauthorized", handleUnauth);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchAgentStatus();
  }, [fetchAgentStatus]);

  // Polling interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchAgentStatus(true);
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAgentStatus]);

  // Handle manual trigger run
  const handleTriggerRun = async () => {
    if (fleetStatus?.circuit_breaker.tripped) {
      toast.error(
        "Execution Blocked: Circuit Breaker is tripped. Reset breaker before launching runs.",
      );
      return;
    }
    if (userRole === "viewer") {
      toast.error("Permission Denied: Viewer accounts cannot trigger production runs.");
      return;
    }

    setTriggering(true);
    try {
      const personaArg = selectedPersona === "all" ? undefined : selectedPersona;
      const res = (await vitalApi.triggerRun(undefined, personaArg)) as { message?: string };
      toast.success(
        res.message ||
          `Agent run successfully launched for ${selectedPersona === "all" ? "Fleet" : selectedPersona}!`,
      );
      // Refetch immediately to catch updated status
      await fetchAgentStatus(true);
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError || (err instanceof ApiError && err.status === 401)) {
        setIsUnauthorized(true);
        toast.error("Session expired (401). Please sign in.");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to trigger agent run.";
        toast.error(msg);
      }
    } finally {
      setTriggering(false);
    }
  };

  // Handle resetting circuit breaker
  const handleResetBreaker = async () => {
    setResettingBreaker(true);
    try {
      const res = await vitalApi.resetCircuitBreaker();
      toast.success(res.message || "Circuit Breaker manually reset! Normal operations resumed.");
      await fetchAgentStatus(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset Circuit Breaker.";
      toast.error(msg);
    } finally {
      setResettingBreaker(false);
    }
  };

  const isTripped = Boolean(fleetStatus?.circuit_breaker?.tripped);
  const dailyTokens = fleetStatus?.daily_tokens;
  const tokenPercentage = dailyTokens?.percentage ?? 0;
  const activeToken = getAuthToken();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Bot className="size-4" />
            <span>FastAPI Agent Orchestration (/api/agents)</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            Agent Control Center
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Real-time fleet monitoring, daily token consumption governance, manual run triggers, and
            automated safety circuit breakers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              autoRefresh
                ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Toggle live 10s auto-polling"
          >
            <span
              className={`size-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`}
            />
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => void fetchAgentStatus()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* 401 Unauthorized Alert Banner */}
      {isUnauthorized && (
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-200 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-red-900/50 border border-red-700 flex items-center justify-center shrink-0">
              <Lock className="size-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                401 Unauthorized: Valid 'v4l_api_token' Required
              </p>
              <p className="text-xs text-red-300/80">
                Your client authorization token is missing or expired. Dynamic client-side token
                binding requires authentication.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white transition shrink-0"
          >
            Sign In & Bind Token &rarr;
          </Link>
        </div>
      )}

      {/* General Non-401 Error Notice */}
      {!isUnauthorized && error && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-4 flex items-center gap-3 text-amber-200 text-xs">
          <AlertTriangle className="size-5 shrink-0 text-amber-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CIRCUIT BREAKER STATUS SECTION (VISUAL INDICATOR)                       */}
      {/* ========================================================================= */}
      <section aria-label="Circuit Breaker Status">
        {isTripped ? (
          /* TRIPPED STATE: Prominent, high-contrast critical warning banner */
          <div className="relative overflow-hidden rounded-2xl border-2 border-rose-600 bg-gradient-to-r from-rose-950/90 via-red-950/70 to-zinc-950 p-6 shadow-2xl animate-in fade-in duration-300">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 size-48 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-600/20 border-2 border-rose-500 text-rose-400 shadow-inner animate-pulse">
                  <ShieldAlert className="size-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-md animate-bounce">
                      <AlertTriangle className="size-3.5" />
                      Circuit Breaker Tripped
                    </span>
                    <span className="text-xs text-rose-300 font-mono">
                      State: <strong>EMERGENCY_HALT</strong>
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1.5">
                    Autonomous Agent Fleet Halted
                  </h2>
                  <p className="text-xs text-rose-200/90 mt-1 max-w-2xl leading-relaxed">
                    {fleetStatus?.circuit_breaker?.reason ||
                      "The circuit breaker was triggered to protect token budgets and prevent run cascades. All scheduled and autonomous agent writing tasks are currently suspended."}
                  </p>
                  {fleetStatus?.circuit_breaker?.tripped_at && (
                    <p className="text-[11px] text-rose-400/80 mt-1 font-mono flex items-center gap-1">
                      <Clock className="size-3" />
                      Tripped at:{" "}
                      {new Date(fleetStatus.circuit_breaker.tripped_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetBreaker}
                  disabled={resettingBreaker}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className={`size-4 ${resettingBreaker ? "animate-spin" : ""}`} />
                  {resettingBreaker ? "Resetting Breaker..." : "Reset Circuit Breaker"}
                </button>
                <span className="text-[10px] text-rose-300 text-center md:text-right">
                  Requires manual confirmation
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* NORMAL / CLOSED STATE: Secure guardrails active */
          <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-r from-emerald-950/30 via-zinc-900/40 to-zinc-950 p-5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-400">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 border border-emerald-800 text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Circuit Breaker: Normal
                    </span>
                    <span className="text-xs text-zinc-400">Protective Guardrails Armed</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Continuous monitoring of daily tokens ceiling (
                    {dailyTokens?.limit?.toLocaleString() || "1,000,000"}) and consecutive error
                    thresholds ({fleetStatus?.circuit_breaker?.max_consecutive_failures || 5}).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-right">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Consecutive Failures
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {fleetStatus?.circuit_breaker?.consecutive_failures || 0} /{" "}
                    {fleetStatus?.circuit_breaker?.max_consecutive_failures || 5}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-right">
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Fleet State
                  </span>
                  <span className="font-bold text-zinc-200 capitalize">
                    {fleetStatus?.status || "Operational"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. DAILY TOKEN USAGE SECTION                                              */}
      {/* ========================================================================= */}
      <section
        aria-label="Daily Token Governance"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {/* Token Meter Card */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                <Zap className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Daily Token Usage</h3>
                <p className="text-xs text-zinc-400">
                  Live 24-hour quota telemetry against circuit breaker ceiling
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  tokenPercentage > 85
                    ? "bg-rose-950 text-rose-300 border-rose-800"
                    : tokenPercentage > 60
                      ? "bg-amber-950 text-amber-300 border-amber-800"
                      : "bg-emerald-950 text-emerald-300 border-emerald-800"
                }`}
              >
                {tokenPercentage}% of Quota
              </span>
            </div>
          </div>

          {/* Large Numerical Display */}
          <div className="flex flex-wrap items-baseline gap-2 pt-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
              {dailyTokens?.used?.toLocaleString() ?? "0"}
            </span>
            <span className="text-zinc-500 font-medium text-sm">
              / {dailyTokens?.limit?.toLocaleString() ?? "1,000,000"} tokens
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTripped || tokenPercentage > 85
                    ? "bg-rose-500"
                    : tokenPercentage > 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(3, tokenPercentage))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>0 Tokens (Midnight UTC)</span>
              <span>Quota Ceiling ({dailyTokens?.limit?.toLocaleString() ?? "1,000,000"})</span>
            </div>
          </div>

          {/* Model Breakdown Sub-pills */}
          {dailyTokens?.model_breakdown && (
            <div className="pt-3 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(dailyTokens.model_breakdown).map(([model, stats]) => (
                <div
                  key={model}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-2.5"
                >
                  <span className="block text-[10px] uppercase font-mono text-zinc-400 font-bold truncate">
                    {model}
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs font-mono font-bold text-zinc-200">
                      {stats.tokens.toLocaleString()} tok
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ${stats.cost.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cost & Operational Summary Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                <Coins className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Daily Cost SLA</h3>
                <p className="text-xs text-zinc-400">Estimated LLM API expenditures today</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider block">
                  Today's Spend
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  ${(dailyTokens?.estimated_cost ?? 0).toFixed(3)} USD
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  Resets daily at {dailyTokens?.reset_time || "00:00 UTC"}
                </span>
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                  <span>Active In-flight Runs:</span>
                  <span className="font-bold text-zinc-200 font-mono">
                    {fleetStatus?.active_runs_count ?? 0}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                  <span>Queued Pipeline Topics:</span>
                  <span className="font-bold text-zinc-200 font-mono">
                    {fleetStatus?.queued_tasks_count ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client Token Binding:</span>
                  <span className="font-mono text-emerald-400 font-bold truncate max-w-[140px]">
                    {activeToken ? "v4l_api_token (Bound)" : "Unbound / Anonymous"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/telemetry"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
          >
            <Terminal className="size-3.5" />
            Inspect Detailed Telemetry Logs
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ACTION BAR: MANUAL TRIGGER RUN CONTROLS                                 */}
      {/* ========================================================================= */}
      <section
        aria-label="Manual Run Trigger"
        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Manual Run Dispatcher</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Trigger autonomous research, drafting, verification, and Ghost CMS publishing
              immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="persona-select"
                className="text-xs font-semibold text-zinc-400 whitespace-nowrap"
              >
                Persona:
              </label>
              <select
                id="persona-select"
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                disabled={isTripped || triggering}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none transition disabled:opacity-50"
              >
                <option value="all">Full Autonomous Fleet (All Personas)</option>
                <option value="CEO">Aiden Vance (Chief Executive Officer)</option>
                <option value="CTO">Kaelen Voss (Chief Technology Officer)</option>
                <option value="CFO">Sloane Sterling (Chief Financial Officer)</option>
                <option value="COO">Rowan Thorne (Chief Operating Officer)</option>
                <option value="Sierra">Sierra Marlowe (Editor-in-Chief & Tone)</option>
                <option value="Dex">Dex Okafor (Gear Analyst & Field Tests)</option>
                <option value="Wren">Wren Calloway (SEO & Affiliate Monetization)</option>
                <option value="Nyx Salinger">Nyx Salinger (Director of Social Media)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleTriggerRun}
              disabled={triggering || isTripped || userRole === "viewer"}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-lg ${
                isTripped
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  : userRole === "viewer"
                    ? "bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800"
                    : "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 cursor-pointer hover:shadow-emerald-500/20"
              }`}
            >
              {triggering ? (
                <>
                  <RefreshCw className="size-4 animate-spin text-zinc-950" />
                  Initiating Run...
                </>
              ) : isTripped ? (
                <>
                  <ShieldAlert className="size-4" />
                  Run Blocked (Breaker Tripped)
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current" />
                  Trigger Production Run
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. AGENT FLEET STATUS GRID                                                */}
      {/* ========================================================================= */}
      <section aria-label="Fleet Agent Overview" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-zinc-400" />
            <h3 className="text-base font-bold text-white">Multi-Agent Fleet Status</h3>
          </div>
          <span className="text-xs text-zinc-500">
            {fleetStatus?.agents?.length || 0} autonomous agents deployed
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 flex flex-col items-center gap-3">
            <RefreshCw className="size-7 animate-spin text-emerald-500" />
            <p className="text-xs uppercase tracking-wider font-semibold">
              Querying FastAPI backend (/api/agents)...
            </p>
          </div>
        ) : !fleetStatus?.agents || fleetStatus.agents.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">
            <p className="text-sm">No agent profiles registered on the FastAPI bridge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {fleetStatus.agents.map((agent) => {
              const isRunning = agent.status === "running";
              const isPaused = agent.status === "paused" || isTripped;

              return (
                <div
                  key={agent.id}
                  className={`rounded-2xl border p-5 shadow-sm transition flex flex-col justify-between ${
                    isRunning
                      ? "border-emerald-700/80 bg-emerald-950/20 ring-1 ring-emerald-500/30"
                      : isPaused
                        ? "border-rose-900/60 bg-rose-950/10"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name + Status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-1.5">
                          {agent.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-medium leading-tight mt-0.5">
                          {agent.role}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isRunning
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse"
                            : isPaused
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            isRunning ? "bg-emerald-400" : isPaused ? "bg-rose-400" : "bg-zinc-500"
                          }`}
                        />
                        {isPaused ? "Paused" : agent.status}
                      </span>
                    </div>

                    {/* Model Pill */}
                    <div className="inline-flex items-center gap-1.5 rounded bg-zinc-900 px-2 py-1 text-[10px] font-mono text-zinc-300 border border-zinc-800">
                      <Layers className="size-3 text-emerald-400" />
                      <span className="truncate">{agent.model}</span>
                    </div>

                    {/* Current Task */}
                    <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-2.5 text-xs text-zinc-300 leading-relaxed min-h-[58px]">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
                        Current Assignment
                      </span>
                      <p className="text-[11px] text-zinc-300 line-clamp-2">
                        {agent.current_task || "Standby for incoming topic assignment"}
                      </p>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="pt-4 mt-4 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-mono text-[11px]">
                      {agent.total_tokens?.toLocaleString() || "0"} tokens
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersona(agent.name);
                        void handleTriggerRun();
                      }}
                      disabled={isTripped || triggering || userRole === "viewer"}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-emerald-400 flex items-center gap-1 transition"
                    >
                      <Play className="size-2.5 fill-current" />
                      Run {agent.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
