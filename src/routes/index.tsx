import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Play,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/MetricCard";
import { TaskQueue } from "@/components/TaskQueue";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { AutopilotSidebar } from "@/components/AutopilotSidebar";
import { getAnalytics, getHealth, getQueue, getTelemetry, triggerRun } from "@/lib/bridge.functions";
import { ALERT_STATES, SLA, type QueueItem, type TelemetryRun } from "@/lib/queue-shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vital4Living Autopilot — Agent Operations Console" },
      {
        name: "description",
        content:
          "Command surface for the Vital4Living autonomous outdoor intelligence engine: editorial queue, agent telemetry, cost SLA and emergency strategy control.",
      },
      { property: "og:title", content: "Vital4Living Autopilot — Agent Operations Console" },
      {
        property: "og:description",
        content:
          "Monitor the CrewAI editorial lifecycle, token cost per article and publication ledger from one alpine-optimized dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function asArray<T>(payload: T[] | { items?: T[]; runs?: T[] } | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.runs ?? [];
}

function Dashboard() {
  const [filter, setFilter] = useState("all");

  const health = useServerFn(getHealth);
  const queue = useServerFn(getQueue);
  const telemetry = useServerFn(getTelemetry);
  const analytics = useServerFn(getAnalytics);
  const startRun = useServerFn(triggerRun);

  const healthQ = useQuery({
    queryKey: ["health"],
    queryFn: () => health(),
    refetchInterval: 60_000,
  });
  const queueQ = useQuery({
    queryKey: ["queue"],
    queryFn: () => queue(),
    refetchInterval: 20_000,
  });
  const telemetryQ = useQuery({
    queryKey: ["telemetry"],
    queryFn: () => telemetry(),
    refetchInterval: 30_000,
  });
  const analyticsQ = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analytics(),
    refetchInterval: 60_000,
  });

  const [starting, setStarting] = useState(false);

  const queueItems: QueueItem[] = queueQ.data?.ok ? asArray<QueueItem>(queueQ.data.data) : [];
  const runs: TelemetryRun[] = telemetryQ.data?.ok ? asArray<TelemetryRun>(telemetryQ.data.data) : [];
  const analyticsData = analyticsQ.data?.ok ? analyticsQ.data.data : undefined;

  const alerts = queueItems.filter((i) => ALERT_STATES.includes(i.status ?? "")).length;
  const published = queueItems.filter((i) => i.status === "published").length;
  const totalCost = analyticsData?.total_estimated_cost ?? 0;
  const totalTokens = analyticsData?.total_token_usage ?? 0;
  const publications = analyticsData?.recent_publications ?? [];
  const meanCost = published > 0 ? totalCost / published : 0;

  const bridgeError =
    (healthQ.data && !healthQ.data.ok && healthQ.data.error) ||
    (queueQ.data && !queueQ.data.ok && queueQ.data.error) ||
    null;

  async function onTrigger() {
    setStarting(true);
    const res = await startRun();
    setStarting(false);
    if (res.ok) {
      toast.success(`Run initiated — task ${String(res.data.task_id ?? "?")}`);
      void queueQ.refetch();
      void telemetryQ.refetch();
    } else {
      toast.error(res.error);
    }
  }

  function refreshAll() {
    void healthQ.refetch();
    void queueQ.refetch();
    void telemetryQ.refetch();
    void analyticsQ.refetch();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_24rem]">
      <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 lg:pb-6">
        <header className="border-b border-border pb-5">
          <p className="label-caps flex items-center gap-2">
            <Server aria-hidden className="size-4" />
            OVHcloud VPS {healthQ.data?.ok ? (healthQ.data.data.vps_ip ?? "") : "15.204.83.117"}
            <span
              className={
                healthQ.data?.ok ? "font-bold text-ok" : "font-bold text-alert"
              }
            >
              {healthQ.isLoading ? "checking" : healthQ.data?.ok ? "operational" : "offline"}
            </span>
          </p>
          <h1 className="mt-2 text-4xl">Vital4Living Autopilot</h1>
          <p className="mt-1 text-muted-foreground">
            Autonomous outdoor intelligence engine — editorial lifecycle, telemetry and emergency
            control.
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
              Refresh
            </button>
          </div>

          {bridgeError ? (
            <p className="mt-4 flex items-start gap-2 rounded-md border-2 border-alert p-3 text-sm">
              <AlertTriangle aria-hidden className="size-5 shrink-0 text-alert" />
              <span>{bridgeError}</span>
            </p>
          ) : null}
        </header>

        <section aria-label="Key metrics" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Mean cost / article"
            value={`$${meanCost.toFixed(3)}`}
            hint={`SLA ceiling $${SLA.costPerArticle.toFixed(2)}`}
            icon={DollarSign}
            tone={meanCost > SLA.costPerArticle ? "alert" : meanCost > 0 ? "ok" : "neutral"}
          />
          <MetricCard
            label="Token usage"
            value={totalTokens ? `${(totalTokens / 1000).toFixed(1)}k` : "—"}
            hint={`Total spend $${totalCost.toFixed(2)}`}
            icon={Zap}
          />
          <MetricCard
            label="Published"
            value={String(publications.length || published)}
            hint="Ghost CMS ledger"
            icon={CheckCircle2}
            tone={published > 0 ? "ok" : "neutral"}
          />
          <MetricCard
            label="Attention required"
            value={String(alerts)}
            hint="verification_failed / quarantined"
            icon={AlertTriangle}
            tone={alerts > 0 ? "alert" : "neutral"}
          />
        </section>

        <div className="mt-6 space-y-6">
          <TaskQueue
            items={queueItems}
            loading={queueQ.isLoading}
            filter={filter}
            onFilterChange={setFilter}
          />

          <TelemetryPanel runs={runs} loading={telemetryQ.isLoading} />

          <section aria-labelledby="ledger-heading" className="panel p-4">
            <h2 id="ledger-heading" className="flex items-center gap-2 text-xl">
              <BarChart3 aria-hidden className="size-5 text-muted-foreground" />
              Publication ledger
            </h2>
            {analyticsQ.isLoading ? (
              <p className="py-8 text-center text-muted-foreground">Reading historical_ledger…</p>
            ) : publications.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No publications recorded.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {publications.map((p, i) => (
                  <li key={p.ghost_post_id ?? i} className="flex justify-between gap-3 py-3">
                    <span className="min-w-0 truncate font-semibold">{p.title ?? "Untitled"}</span>
                    <span className="numeric flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                      <Clock aria-hidden className="size-4" />
                      {p.date ? new Date(p.date).toLocaleDateString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <AutopilotSidebar />
    </div>
  );
}
