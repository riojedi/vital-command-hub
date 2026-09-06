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
    <div className="relative space-y-8 pb-16 text-zinc-100 overflow-hidden">
      {/* Subtle Glowing Radial Gradients Background Canvas */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/3 -translate-x-1/2 w-[650px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[550px] h-[350px] bg-indigo-500/[0.04] rounded-full blur-[140px]" />
      </div>

      {/* Top Header Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-zinc-950/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl transition-all duration-300">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-teal-400/80 to-indigo-500/80" />
        <div className="absolute -top-32 -right-32 size-[24rem] bg-emerald-500/10 blur-[90px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-400" />
              </span>
              <span className="font-mono">FASTAPI ORCHESTRATOR &bull; /api/agents</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1.5 font-display">
              Agent Control Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Real-time fleet monitoring, daily token consumption governance, manual run triggers, and
              automated safety circuit breakers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                autoRefresh
                  ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : "border-white/10 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
              }`}
              title="Toggle live 10s auto-polling"
            >
              <span
                className={`size-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`}
              />
              <span className="font-mono text-[11px]">POLLING {autoRefresh ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => void fetchAgentStatus()}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-white/10 bg-zinc-900/80 hover:bg-zinc-800/90 text-zinc-200 hover:text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
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
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950/80 backdrop-blur-xl p-5 shadow-xl transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-teal-400/80 to-indigo-500/80" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 shadow-md">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Circuit Breaker: Normal
                    </span>
                    <span className="text-xs text-zinc-400">Protective Guardrails Armed</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Continuous monitoring of daily tokens ceiling (
                    <span className="font-mono font-semibold">{dailyTokens?.limit?.toLocaleString() || "1,000,000"}</span>) and consecutive error
                    thresholds (<span className="font-mono font-semibold">{fleetStatus?.circuit_breaker?.max_consecutive_failures || 5}</span>).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-right shadow-inner">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                    Consecutive Failures
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {fleetStatus?.circuit_breaker?.consecutive_failures || 0} /{" "}
                    {fleetStatus?.circuit_breaker?.max_consecutive_failures || 5}
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-white/10 text-right shadow-inner">
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                    Fleet State
                  </span>
                  <span className="font-mono font-bold text-zinc-200 uppercase text-sm">
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
        <div className="relative overflow-hidden lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-6 shadow-2xl space-y-4">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-teal-400/60 to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                <Zap className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">Daily Token Usage</h3>
                <p className="text-xs text-zinc-400">
                  Live 24-hour quota telemetry against circuit breaker ceiling
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                  tokenPercentage > 85
                    ? "bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                    : tokenPercentage > 60
                      ? "bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                      : "bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                }`}
              >
                {tokenPercentage}% of Quota
              </span>
            </div>
          </div>

          {/* Large Numerical Display */}
          <div className="flex flex-wrap items-baseline gap-2 pt-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
              {dailyTokens?.used?.toLocaleString() ?? "0"}
            </span>
            <span className="text-zinc-400 font-mono text-sm font-medium">
              / {dailyTokens?.limit?.toLocaleString() ?? "1,000,000"} tokens
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-zinc-900/90 overflow-hidden border border-white/10 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                  isTripped || tokenPercentage > 85
                    ? "bg-gradient-to-r from-rose-600 to-rose-400"
                    : tokenPercentage > 60
                      ? "bg-gradient-to-r from-amber-600 to-amber-400"
                      : "bg-gradient-to-r from-emerald-600 to-teal-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(3, tokenPercentage))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
              <span>0 Tokens (Midnight UTC)</span>
              <span>Quota Ceiling ({dailyTokens?.limit?.toLocaleString() ?? "1,000,000"})</span>
            </div>
          </div>

          {/* Model Breakdown Sub-pills */}
          {dailyTokens?.model_breakdown && (
            <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(dailyTokens.model_breakdown).map(([model, stats]) => (
                <div
                  key={model}
                  className="rounded-xl bg-zinc-900/70 backdrop-blur-md border border-white/10 p-2.5 shadow-inner"
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
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/60 via-indigo-500/40 to-transparent" />
          <div>
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-blue-950/70 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
                <Coins className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">Daily Cost SLA</h3>
                <p className="text-xs text-zinc-400">Estimated LLM API expenditures today</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-zinc-900/70 backdrop-blur-md border border-white/10 shadow-inner">
                <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
                  Today's Spend
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                  ${(dailyTokens?.estimated_cost ?? 0).toFixed(3)} USD
                </span>
                <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                  Resets daily at {dailyTokens?.reset_time || "00:00 UTC"}
                </span>
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between border-b border-white/5 pb-1.5 font-mono">
                  <span className="font-sans text-zinc-400">Active In-flight Runs:</span>
                  <span className="font-bold text-zinc-200">
                    {fleetStatus?.active_runs_count ?? 0}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5 font-mono">
                  <span className="font-sans text-zinc-400">Queued Pipeline Topics:</span>
                  <span className="font-bold text-zinc-200">
                    {fleetStatus?.queued_tasks_count ?? 0}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="font-sans text-zinc-400">Client Token Binding:</span>
                  <span className="text-emerald-400 font-bold truncate max-w-[140px]">
                    {activeToken ? "v4l_api_token (Bound)" : "Unbound / Anonymous"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/telemetry"
            className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-md"
          >
            <Terminal className="size-3.5 text-emerald-400" />
            <span>Inspect Detailed Telemetry Logs</span>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ACTION BAR: MANUAL TRIGGER RUN CONTROLS                                 */}
      {/* ========================================================================= */}
      <section
        aria-label="Manual Run Trigger"
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-6 shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-teal-400/60 to-transparent" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {fleetStatus.agents.map((agent) => {
              const isRunning = agent.status === "running";
              const isPaused = agent.status === "paused" || isTripped;

              return (
                <div
                  key={agent.id}
                  className={`group relative overflow-hidden rounded-2xl border p-4 shadow-xl transition-all duration-300 flex flex-col justify-between backdrop-blur-xl hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6)] active:scale-[0.98] ${
                    isRunning
                      ? "border-emerald-500/60 bg-gradient-to-b from-emerald-950/50 via-zinc-900/80 to-zinc-950/95 ring-1 ring-emerald-500/40 shadow-emerald-950/40"
                      : isPaused
                        ? "border-rose-900/60 bg-gradient-to-b from-rose-950/30 via-zinc-900/70 to-zinc-950/95"
                        : "border-white/10 bg-gradient-to-b from-zinc-900/70 via-zinc-950/80 to-zinc-950/95 hover:border-white/25 hover:bg-zinc-900/80"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/60 via-teal-400/50 to-indigo-500/60 opacity-75 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="space-y-3">
                    {/* Header: Name + Status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-1.5 font-display">
                          {agent.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-medium leading-tight mt-0.5 line-clamp-1">
                          {agent.role}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                          isRunning
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                            : isPaused
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            isRunning ? "bg-emerald-400 animate-ping" : isPaused ? "bg-rose-400" : "bg-zinc-500"
                          }`}
                        />
                        {isPaused ? "Paused" : agent.status}
                      </span>
                    </div>

                    {/* Model Pill */}
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-2.5 py-1 text-[10px] font-mono text-zinc-300 border border-white/10 shadow-inner">
                      <Layers className="size-3 text-emerald-400" />
                      <span className="truncate">{agent.model}</span>
                    </div>

                    {/* Current Task */}
                    <div className="rounded-xl bg-zinc-900/70 backdrop-blur-md border border-white/10 p-3 text-xs text-zinc-300 leading-relaxed min-h-[62px] shadow-inner">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                        Current Assignment
                      </span>
                      <p className="text-[11px] text-zinc-300 line-clamp-2">
                        {agent.current_task || "Standby for incoming topic assignment"}
                      </p>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-mono text-[11px] text-zinc-400">
                      {agent.total_tokens?.toLocaleString() || "0"} tokens
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersona(agent.name);
                        void handleTriggerRun();
                      }}
                      disabled={isTripped || triggering || userRole === "viewer"}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:hover:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 transition-all duration-150 active:scale-95"
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
