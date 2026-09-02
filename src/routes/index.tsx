import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Gauge,
  Play,
  RefreshCw,
  Timer,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { triggerRun } from "@/lib/bridge.functions";
import { useAnalyticsData, useQueueData, useTelemetryData } from "@/lib/bridge-queries";
import { ALERT_STATES, QUEUE_STATES, SLA } from "@/lib/queue-shared";

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
  const queue = useQueueData();
  const telemetry = useTelemetryData();
  const analytics = useAnalyticsData();
  const [starting, setStarting] = useState(false);
  const startRun = useServerFn(triggerRun);

  const alerts = queue.items.filter((i) => ALERT_STATES.includes(i.status ?? "")).length;
  const published = queue.items.filter((i) => i.status === "published").length;
  const inFlight = queue.items.filter(
    (i) => !["published", "quarantined"].includes(i.status ?? ""),
  ).length;
  const meanCost = published > 0 ? analytics.totalCost / published : 0;

  const durations = telemetry.runs
    .filter((r) => r.started_at && r.completed_at)
    .map(
      (r) =>
        (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 60_000,
    );
  const meanMinutes = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const bridgeError = queue.error ?? telemetry.error ?? analytics.error;

  const distribution = QUEUE_STATES.map((state) => ({
    state,
    count: queue.items.filter((i) => i.status === state).length,
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

  return (
    <div className="space-y-6">
      <header>
        <p className="label-caps flex items-center gap-2">
          <Gauge aria-hidden className="size-4" /> Operational overview
        </p>
        <h1 className="mt-1 text-4xl">Autonomous outdoor intelligence engine</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          CrewAI multi-agent research, verification and Ghost CMS publishing — monitored against the
          production definition of done.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onTrigger()}
            disabled={starting}
            className="touch-target flex items-center gap-2 rounded-md border border-alert bg-alert px-5 font-bold text-alert-foreground disabled:opacity-50"
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
  );
}
