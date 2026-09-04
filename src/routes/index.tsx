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
  User
} from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { triggerRun } from "@/lib/bridge.functions";
import { useAnalyticsData, useQueueData, useTelemetryData } from "@/lib/bridge-queries";
import { ALERT_STATES, QUEUE_STATES, SLA } from "@/lib/queue-shared";
import MonetizationPanel from "../components/MonetizationPanel";

export const Route = createFileRoute("/")({ 
  head: () => ({ 
    meta: [ 
      { title: "Autopilot Overview — Vital4Living Operations" }, 
      { name: "description", content: "Live overview of the Vital4Living autonomous engine: cost-per-article SLA, editorial lifecycle distribution, agent alerts and run control." }, 
      { property: "og:title", content: "Autopilot Overview — Vital4Living Operations" }, 
      { property: "og:description", content: "Cost SLA, lifecycle distribution and emergency run control for the Vital4Living agent fleet." }, 
      { property: "og:type", content: "website" }, 
      { name: "twitter:card", content: "summary_large_image" }
    ] 
  }), 
  component: Overview 
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

  // Modal connection form states
  const [vpsUrl, setVpsUrl] = useState("http://15.204.83.117:8000");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Track active visual tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "monetization">("dashboard");

  // Hydration sync on client mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("v4l_api_token");
      const savedUrl = localStorage.getItem("v4l_api_url");
      const savedUser = localStorage.getItem("v4l_username") || "Admin";
      const savedRole = localStorage.getItem("v4l_user_role") || "viewer";
      
      if (savedToken && savedUrl) {
        setIsAuthorized(true);
        setActiveUsername(savedUser);
        setActiveRole(savedRole);
      }
      
      const vpsStorageUrl = localStorage.getItem("v4l_api_url");
      if (vpsStorageUrl) {
        setVpsUrl(vpsStorageUrl);
      }
    }
  }, []);

  const alerts = queue.items?.filter((i) => ALERT_STATES.includes(i.status ?? "")).length ?? 0; 
  const published = queue.items?.filter((i) => i.status === "published").length ?? 0; 
  const inFlight = queue.items?.filter((i) => !["published", "quarantined"].includes(i.status ?? "")).length ?? 0; 
  const meanCost = published > 0 ? analytics.totalCost / published : 0;

  const durations = telemetry.runs
    ?.filter((r) => r.started_at && r.completed_at)
    .map((r) => (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 60_000) ?? []; 
  const meanMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  
  const bridgeError = queue.error ?? telemetry.error ?? analytics.error;
  const distribution = QUEUE_STATES.map((state) => ({ 
    state, 
    count: queue.items?.filter((i) => i.status === state).length ?? 0, 
  })).filter((d) => d.count > 0);



  async function onTrigger() { 
    setStarting(true); 
    const res = await startRun(); 
    setStarting(false); 
    if (res.ok) { 
      toast.success(`Run initiated — task ${String(res.data.task_id ?? "?")}`); 
      void queue.query.refetch(); 
      void telemetry.query.refetch(); 
    } else { 
      toast.error(res.error); 
    } 
  }

  function refreshAll() { 
    void queue.query.refetch(); 
    void telemetry.query.refetch(); 
    void analytics.query.refetch(); 
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectionError(null);

    let cleanUrl = vpsUrl.trim();
    if (cleanUrl.endsWith("/")) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    try {
      // Direct login POST against PostgreSQL database via FastAPI
      const response = await fetch(`${cleanUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.session_token) {
          localStorage.setItem("v4l_api_url", cleanUrl);
          localStorage.setItem("v4l_api_token", data.session_token);
          localStorage.setItem("v4l_username", data.username);
          localStorage.setItem("v4l_user_role", data.role || "viewer");
          
          setIsAuthorized(true);
          setActiveUsername(data.username);
          setActiveRole(data.role || "viewer");
          toast.success(`Successfully authenticated as ${data.username} (${data.role})!`);
          refreshAll();
        } else {
          setConnectionError("Server authentication failed to generate session token.");
        }
      } else if (response.status === 401 || response.status === 403) {
        setConnectionError("Invalid Administrator Username or Password.");
      } else {
        const errJson = await response.json().catch(() => ({}));
        setConnectionError(errJson.detail || `Server returned connection status ${response.status}`);
      }
    } catch (err: any) {
      setConnectionError(err.message || "Unable to reach the secure authentication endpoint.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const cleanUrl = localStorage.getItem("v4l_api_url");
    const activeToken = localStorage.getItem("v4l_api_token");

    if (cleanUrl && activeToken) {
      // Call standard log out to invalidate session in DB
      await fetch(`${cleanUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
      }).catch(() => {});
    }

    localStorage.removeItem("v4l_api_url");
    localStorage.removeItem("v4l_api_token");
    localStorage.removeItem("v4l_username");
    localStorage.removeItem("v4l_user_role");
    setIsAuthorized(false);
    setActiveUsername("Guest");
    setActiveRole("viewer");
    toast.info("Logged out cleanly. Session revoked.");
  };

  // Prevent SSR/CSR Hydration Flicker
  if (!mounted) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4 bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-500" />
          <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  // Intercept unauthorized users with clean Username/Password Form
  if (!isAuthorized) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 mb-2">
                <Lock className="size-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Secure Workspace Login</h2>
              <p className="text-sm text-zinc-400">
                Sign into your admin user account to manage the autonomous outdoor intelligence engine.
              </p>
            </div>

            {connectionError && (
              <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/40 p-3.5 text-xs text-red-200">
                <AlertTriangle className="size-5 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Authentication Failed</span>
                  <p className="text-red-300/80">{connectionError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Server className="size-3.5 text-emerald-500" />
                  VPS API Gateway
                </label>
                <input
                  type="url"
                  required
                  placeholder="e.g. http://15.204.83.117:8000"
                  value={vpsUrl}
                  onChange={(e) => setVpsUrl(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <User className="size-3.5 text-emerald-500" />
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Lock className="size-3.5 text-emerald-500" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 py-3 text-sm font-semibold text-white transition disabled:opacity-50 cursor-pointer"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Authenticating User...
                  </>
                ) : (
                  <>
                    Sign In & Authenticate
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
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
            <h1 className="mt-1 text-4xl font-bold text-white">Autonomous outdoor intelligence engine</h1> 
            <p className="mt-2 max-w-2xl text-zinc-400"> 
              CrewAI multi-agent research, verification and Ghost CMS publishing — monitored against the production definition of done. 
            </p> 
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {activeUsername}
              </span>
              <span className={`text-[10px] uppercase font-extrabold tracking-wider border rounded px-2 py-1 ${
                activeRole === "admin" ? "bg-red-950/40 text-red-400 border-red-900/60" :
                activeRole === "editor" ? "bg-blue-950/40 text-blue-400 border-blue-900/60" :
                "bg-zinc-900 text-zinc-500 border-zinc-800"
              }`}>
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
            className={`touch-target flex items-center gap-2 rounded-md border border-alert bg-alert px-5 font-bold text-alert-foreground transition ${
              activeRole === "viewer" ? "opacity-30 cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500" : "disabled:opacity-50"
            }`} 
          > 
            <Play aria-hidden className="size-5" /> 
            {starting ? "Initiating…" : "Trigger production run"} 
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
              tone={meanMinutes > SLA.meanExecutionMinutes ? "alert" : meanMinutes ? "ok" : "neutral"}
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
                <ul className="mt-4 divide-y divide-border">
                  {analytics.publications.map((p, i) => (
                    <li key={p.ghost_post_id ?? i} className="flex items-center gap-3 py-3">
                      <CheckCircle2 aria-hidden className="size-4 shrink-0 text-ok" />
                      <span className="min-w-0 flex-1 truncate">{p.title ?? "Untitled"}</span>
                      <span className="numeric shrink-0 text-sm text-muted-foreground">
                        {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === "monetization" && (
        <MonetizationPanel />
      )}
    </div>
  );
}
