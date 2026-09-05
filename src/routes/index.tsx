import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  DollarSign,
  Gauge,
  LayoutDashboard,
  Play,
  RefreshCw,
  Timer,
  Zap,
  Lock,
  Server,
  LogOut,
  User,
  Terminal,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { triggerRun } from "@/lib/bridge.functions";
import { useAnalyticsData, useQueueData, useTelemetryData } from "@/lib/bridge-queries";
import { ALERT_STATES, QUEUE_STATES, SLA } from "@/lib/queue-shared";
import { vitalApi, type PipelineStatus } from "@/lib/vitalApi";
import MonetizationPanel from "../components/MonetizationPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Autopilot Overview — Vital4Living Operations" },
      {
        name: "description",
        content:
          "Live overview of the Vital4Living autonomous engine: cost-per-article SLA, editorial lifecycle distribution, agent alerts and run control.",
      },
      { property: "og:title", content: "Autopilot Overview — Vital4Living Operations" },
      {
        property: "og:description",
        content:
          "Cost SLA, lifecycle distribution and emergency run control for the Vital4Living agent fleet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const [mounted, setMounted] = useState(false);
  const queue = useQueueData();
  const telemetry = useTelemetryData();
  const analytics = useAnalyticsData();
  const [starting, setStarting] = useState(false);
  const startRun = useServerFn(triggerRun);

  // Track connection authorization state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeUsername, setActiveUsername] = useState("Guest");
  const [activeRole, setActiveRole] = useState("viewer");

  // Track active visual tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "monetization">("dashboard");

  // Hydration sync on client mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("v4l_api_token");
      const savedUser = localStorage.getItem("v4l_username") || "Admin";
      const savedRole = localStorage.getItem("v4l_user_role") || "viewer";

      if (savedToken) {
        setIsAuthorized(true);
        setActiveUsername(savedUser);
        setActiveRole(savedRole);
      } else {
        setIsAuthorized(false);
        window.location.replace("/login");
      }
    }
  }, []);

  const alerts = queue.items?.filter((i) => ALERT_STATES.includes(i.status ?? "")).length ?? 0;
  const published = queue.items?.filter((i) => i.status === "published").length ?? 0;
  const inFlight =
    queue.items?.filter((i) => !["published", "quarantined"].includes(i.status ?? "")).length ?? 0;
  const meanCost = published > 0 ? analytics.totalCost / published : 0;

  const durations =
    telemetry.runs
      ?.filter((r) => r.started_at && r.completed_at)
      .map(
        (r) => (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 60_000,
      ) ?? [];
  const meanMinutes = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const bridgeError = queue.error ?? telemetry.error ?? analytics.error;
  const distribution = QUEUE_STATES.map((state) => ({
    state,
    count: queue.items?.filter((i) => i.status === state).length ?? 0,
  })).filter((d) => d.count > 0);

  const [consoleOpen, setConsoleOpen] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Polling pipeline status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (consoleOpen || isPolling) {
      const poll = async () => {
        try {
          const status = await vitalApi.getPipelineStatus();
          setPipelineStatus(status);
          if (status.status === "success") {
            setIsPolling(false);
            refreshAll();
          } else if (status.status === "failed") {
            setIsPolling(false);
          }
        } catch {
          // ignore transient errors
        }
      };
      void poll();
      interval = setInterval(poll, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [consoleOpen, isPolling]);

  async function onTrigger() {
    setStarting(true);
    try {
      const res = await vitalApi.triggerRun();
      toast.success(res.message || `Production run initiated for ${res.persona || "agent"}`);
      setConsoleOpen(true);
      setIsPolling(true);
      void queue.query.refetch();
      void telemetry.query.refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger run");
    } finally {
      setStarting(false);
    }
  }

  function refreshAll() {
    void queue.query.refetch();
    void telemetry.query.refetch();
    void analytics.query.refetch();
  }

  const handleDisconnect = async () => {
    await vitalApi.logout();
    setIsAuthorized(false);
    toast.info("Logged out cleanly. Session revoked.");
    window.location.href = "/login";
  };

  // Prevent SSR/CSR Hydration Flicker or redirect unauthenticated visitors
  if (!mounted || !isAuthorized) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="size-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-semibold text-foreground">
          {!mounted ? "Loading Workspace..." : "Redirecting to login..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex justify-between items-start">
          <div>
            <p className="label-caps flex items-center gap-2 text-zinc-400">
              <Gauge aria-hidden className="size-4" />
              Operational overview
            </p>
            <h1 className="mt-1 text-4xl font-bold text-white">
              Autonomous outdoor intelligence engine
            </h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              CrewAI multi-agent research, verification and Ghost CMS publishing — monitored against
              the production definition of done.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {activeUsername}
              </span>
              <span
                className={`text-[10px] uppercase font-extrabold tracking-wider border rounded px-2 py-1 ${
                  activeRole === "admin"
                    ? "bg-red-950/40 text-red-400 border-red-900/60"
                    : activeRole === "editor"
                      ? "bg-blue-950/40 text-blue-400 border-blue-900/60"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}
              >
                {activeRole}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center gap-2 rounded-md border border-zinc-800 hover:border-red-900 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-red-400 transition"
              title="Logout session and clear token"
            >
              <LogOut className="size-3.5" />
              Logout Session
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (activeRole === "viewer") {
                toast.error("Access Denied: Viewers cannot trigger production runs.");
                return;
              }
              void onTrigger();
            }}
            disabled={starting || activeRole === "viewer"}
            className={`touch-target flex items-center gap-2 rounded-md border border-alert bg-alert px-5 font-bold text-alert-foreground transition shadow-md hover:brightness-110 active:scale-95 ${
              activeRole === "viewer"
                ? "opacity-30 cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500"
                : "disabled:opacity-50"
            }`}
          >
            <Play aria-hidden className="size-5 fill-current" />
            {starting ? "Launching Fleet…" : "Trigger production run"}
          </button>
          <button
            type="button"
            onClick={() => setConsoleOpen(true)}
            className="touch-target flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 font-semibold text-zinc-200 transition"
            title="View Live Agent Execution Terminal"
          >
            <Terminal className="size-4 text-emerald-400" />
            {pipelineStatus?.status === "running" ? (
              <span className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                Live Fleet Executing
              </span>
            ) : (
              "Live Console"
            )}
          </button>
          <button
            type="button"
            onClick={refreshAll}
            className="touch-target flex items-center gap-2 rounded-md border border-border-strong px-5 font-semibold"
          >
            <RefreshCw aria-hidden className="size-5" />
            Refresh telemetry
          </button>
        </div>
        {bridgeError ? (
          <p className="mt-4 flex items-start gap-2 rounded-md border-2 border-alert p-3 text-sm">
            <AlertTriangle aria-hidden className="size-5 shrink-0 text-alert" />
            <span>{bridgeError}</span>
          </p>
        ) : null}
      </header>

      {/* Modern, high-contrast tab divider menu */}
      <div className="flex border-b border-zinc-800 gap-6 mb-6 mt-4">
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "dashboard"
              ? "border-emerald-500 text-white font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LayoutDashboard className="size-4" />
          Dashboard Overview
        </button>

        {activeRole !== "viewer" && (
          <button
            type="button"
            onClick={() => setActiveTab("monetization")}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "monetization"
                ? "border-emerald-500 text-white font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Coins className="size-4" />
            Ad & Affiliate Hub
          </button>
        )}
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Mean cost / article"
              value={`$${meanCost.toFixed(3)}`}
              hint={`SLA ceiling $${SLA.costPerArticle.toFixed(2)}`}
              icon={DollarSign}
              tone={meanCost > SLA.costPerArticle ? "alert" : meanCost > 0 ? "ok" : "neutral"}
            />
            <MetricCard
              label="Token usage"
              value={analytics.totalTokens ? `${(analytics.totalTokens / 1000).toFixed(1)}k` : "—"}
              hint={`Total spend $${analytics.totalCost.toFixed(2)}`}
              icon={Zap}
            />
            <MetricCard
              label="Mean run time"
              value={meanMinutes ? `${meanMinutes.toFixed(1)}m` : "—"}
              hint={`Target ≤ ${SLA.meanExecutionMinutes}m per entry`}
              icon={Timer}
              tone={
                meanMinutes > SLA.meanExecutionMinutes ? "alert" : meanMinutes ? "ok" : "neutral"
              }
            />
            <MetricCard
              label="Attention required"
              value={String(alerts)}
              hint="verification_failed / quarantined"
              icon={AlertTriangle}
              tone={alerts > 0 ? "alert" : "neutral"}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="lifecycle" className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 id="lifecycle" className="text-xl">
                  Lifecycle distribution
                </h2>
                <Link to="/queue" className="label-caps hover:text-foreground">
                  Open queue
                </Link>
              </div>
              {queue.query.isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Reading editorial_queue…</p>
              ) : distribution.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No articles in the pipeline yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {distribution.map(({ state, count }) => (
                    <li key={state} className="flex items-center gap-3">
                      <StatusPill status={state} className="w-52 justify-center" />
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${
                            ALERT_STATES.includes(state) ? "bg-alert" : "bg-foreground"
                          }`}
                          style={{ width: `${(count / inFlight || 0) * 100 || 4}%` }}
                        />
                      </div>
                      <span className="numeric w-8 text-right">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="recent" className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 id="recent" className="text-xl">
                  Recent publications
                </h2>
                <Link to="/analytics" className="label-caps hover:text-foreground">
                  Ledger
                </Link>
              </div>
              {analytics.query.isLoading ? (
                <p className="py-8 text-center text-muted-foreground">Reading historical_ledger…</p>
              ) : analytics.publications.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No publications recorded.</p>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-800">
                  {analytics.publications.map((p, i: number) => {
                    const articleUrl =
                      p.article_url ||
                      (p.ghost_post_id ? `http://15.204.83.117:2368/p/${p.ghost_post_id}/` : "#");
                    const editorUrl =
                      p.ghost_editor_url ||
                      (p.ghost_post_id
                        ? `http://15.204.83.117/ghost/#/editor/post/${p.ghost_post_id}`
                        : null);
                    return (
                      <li
                        key={p.ghost_post_id ?? i}
                        className="flex items-center justify-between gap-3 py-3 hover:bg-zinc-900/40 px-2 rounded-md transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <CheckCircle2 aria-hidden className="size-4 shrink-0 text-emerald-400" />
                          <a
                            href={articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open published article in new tab"
                            className="min-w-0 flex-1 truncate text-zinc-200 hover:text-emerald-400 font-medium text-sm flex items-center gap-1.5 transition"
                          >
                            <span className="truncate">{p.title ?? "Untitled"}</span>
                            <ExternalLink className="size-3.5 shrink-0 opacity-40 group-hover:opacity-100 text-emerald-400 transition" />
                          </a>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {editorUrl && (
                            <a
                              href={editorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                              title="Open in Ghost CMS Editor"
                            >
                              Ghost Edit
                            </a>
                          )}
                          <span className="numeric text-xs text-zinc-500">
                            {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === "monetization" && <MonetizationPanel />}

      {/* Live Execution Console Modal */}
      {consoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            {/* Console Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                  <Terminal className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Live Multi-Agent Pipeline Console
                    </h3>
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold tracking-wider ${
                        pipelineStatus?.status === "running"
                          ? "bg-amber-950/70 text-amber-300 border border-amber-800 animate-pulse"
                          : pipelineStatus?.status === "success"
                            ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800"
                            : pipelineStatus?.status === "failed"
                              ? "bg-rose-950/70 text-rose-300 border border-rose-800"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {pipelineStatus?.status || "idle"}
                    </span>
                  </div>
                  {pipelineStatus?.current_topic && (
                    <p className="text-xs text-zinc-400 truncate max-w-md">
                      Target:{" "}
                      <span className="text-zinc-200 font-semibold">
                        {pipelineStatus.current_topic}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pipelineStatus?.status !== "running" && (
                  <button
                    type="button"
                    onClick={() => void onTrigger()}
                    disabled={starting}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                  >
                    <Play className="size-3 fill-current" />
                    Run Next
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConsoleOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-zinc-950 text-zinc-300 min-h-[350px] max-h-[60vh] select-text">
              {pipelineStatus?.output_log ? (
                <pre className="whitespace-pre-wrap leading-relaxed text-emerald-400/90 font-mono">
                  {pipelineStatus.output_log}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-16 gap-2">
                  <RefreshCw className="size-6 animate-spin text-zinc-600" />
                  <p className="text-sm font-sans">Awaiting pipeline logs from VPS...</p>
                </div>
              )}
            </div>

            {/* Console Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/80 bg-zinc-900/40 text-xs text-zinc-400">
              <div className="flex items-center gap-4">
                <span>
                  Target Persona: <strong className="text-zinc-200">Sierra / Dex / Wren</strong>
                </span>
                {pipelineStatus?.started_at && (
                  <span>Started: {new Date(pipelineStatus.started_at).toLocaleTimeString()}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void vitalApi.getPipelineStatus().then(setPipelineStatus)}
                  className="flex items-center gap-1 hover:text-zinc-200 text-zinc-400 transition"
                >
                  <RefreshCw className="size-3.5" />
                  Refresh Stream
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={() => setConsoleOpen(false)}
                  className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
