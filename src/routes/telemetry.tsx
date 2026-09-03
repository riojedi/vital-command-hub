import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, Server } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { useTelemetryData } from "@/lib/bridge-queries";
import { SLA, type TelemetryRun } from "@/lib/queue-shared";
import { DollarSign, Timer, Zap } from "lucide-react";

export const Route = createFileRoute("/telemetry")({
  head: () => ({
    meta: [
      { title: "Agent Telemetry — Vital4Living Autopilot" },
      {
        name: "description",
        content:
          "Model performance, token usage and cost-per-run telemetry sourced from the agent_runs table on the OVHcloud VPS.",
      },
      { property: "og:title", content: "Agent Telemetry — Vital4Living Autopilot" },
      {
        property: "og:description",
        content: "Per-run token usage, model attribution and cost deviation against the SLA target.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TelemetryPage,
});

function minutes(run: TelemetryRun) {
  if (!run.started_at || !run.completed_at) return null;
  return (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 60_000;
}

function TelemetryPage() {
  const { runs, error, query } = useTelemetryData();

  const completed = runs.filter((r) => r.status === "published" || r.status === "approved").length;
  const failed = runs.filter((r) => (r.status ?? "").includes("failed")).length;
  const completionRate = runs.length ? (runs.length - failed) / runs.length : 0;
  const totalTokens = runs.reduce((a, r) => a + (r.token_usage ?? 0), 0);
  const totalCost = runs.reduce((a, r) => a + (r.estimated_cost ?? 0), 0);
  const durations = runs.map(minutes).filter((m): m is number => m !== null);
  const meanMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const columns: Column<TelemetryRun>[] = [
    {
      key: "run",
      header: "Run",
      sortValue: (r) => Number(r.run_id ?? 0),
      render: (r) => (
        <div>
          <p className="numeric font-semibold">#{String(r.run_id ?? "—")}</p>
          <p className="text-sm text-muted-foreground">{r.workflow ?? "Production_Run"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "State",
      sortValue: (r) => r.status ?? "",
      render: (r) => <StatusPill status={r.status ?? "queued"} />,
    },
    {
      key: "model",
      header: "Model",
      sortValue: (r) => r.model ?? "",
      render: (r) => <span className="numeric text-sm">{r.model ?? "—"}</span>,
    },
    {
      key: "tokens",
      header: "Tokens",
      sortValue: (r) => r.token_usage ?? 0,
      render: (r) => <span className="numeric">{(r.token_usage ?? 0).toLocaleString()}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      sortValue: (r) => r.estimated_cost ?? 0,
      render: (r) => {
        const cost = r.estimated_cost ?? 0;
        return (
          <span className={`numeric font-bold ${cost > SLA.costPerArticle ? "text-alert" : ""}`}>
            ${cost.toFixed(3)}
          </span>
        );
      },
    },
    {
      key: "duration",
      header: "Duration",
      sortValue: (r) => minutes(r) ?? 0,
      render: (r) => {
        const m = minutes(r);
        return (
          <span
            className={`numeric text-sm ${m && m > SLA.meanExecutionMinutes ? "text-alert" : "text-muted-foreground"}`}
          >
            {m ? `${m.toFixed(1)}m` : "running"}
          </span>
        );
      },
    },
    {
      key: "started",
      header: "Started",
      sortValue: (r) => (r.started_at ? new Date(r.started_at).getTime() : 0),
      render: (r) => (
        <span className="numeric text-sm text-muted-foreground">
          {r.started_at ? new Date(r.started_at).toLocaleString() : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps flex items-center gap-2">
            <Server aria-hidden className="size-4" /> agent_runs
          </p>
          <h1 className="mt-1 text-3xl">System telemetry</h1>
          <p className="mt-1 text-muted-foreground">
            {runs.length} recorded runs · {completed} reached terminal success
          </p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="touch-target flex items-center gap-2 rounded-md border border-border-strong px-4 font-semibold"
        >
          <RefreshCw aria-hidden className="size-5" /> Refresh
        </button>
      </header>

      {error ? (
        <p className="flex items-start gap-2 rounded-md border-2 border-alert p-3 text-sm">
          <AlertTriangle aria-hidden className="size-5 shrink-0 text-alert" />
          <span>{error}</span>
        </p>
      ) : null}

      <section aria-label="Telemetry summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Completion rate"
          value={runs.length ? `${(completionRate * 100).toFixed(1)}%` : "—"}
          hint={`SLA ≥ ${(SLA.completionRate * 100).toFixed(1)}%`}
          icon={AlertTriangle}
          tone={
            runs.length === 0
              ? "neutral"
              : completionRate < SLA.completionRate
                ? "alert"
                : "ok"
          }
        />
        <MetricCard
          label="Tokens burned"
          value={totalTokens ? `${(totalTokens / 1000).toFixed(1)}k` : "—"}
          hint="Across listed runs"
          icon={Zap}
        />
        <MetricCard
          label="Run spend"
          value={`$${totalCost.toFixed(2)}`}
          hint={`Mean $${runs.length ? (totalCost / runs.length).toFixed(3) : "0.000"} / run`}
          icon={DollarSign}
          tone={runs.length && totalCost / runs.length > SLA.costPerArticle ? "alert" : "neutral"}
        />
        <MetricCard
          label="Mean duration"
          value={meanMinutes ? `${meanMinutes.toFixed(1)}m` : "—"}
          hint={`Target ≤ ${SLA.meanExecutionMinutes}m`}
          icon={Timer}
          tone={meanMinutes > SLA.meanExecutionMinutes ? "alert" : meanMinutes ? "ok" : "neutral"}
        />
      </section>

      <DataTable
        rows={runs}
        columns={columns}
        loading={query.isLoading}
        emptyLabel="No agent runs recorded yet."
        rowKey={(r, i) => String(r.run_id ?? i)}
        rowTone={(r) => ((r.estimated_cost ?? 0) > SLA.costPerArticle ? "alert" : null)}
        searchable={(r) => `${r.workflow ?? ""} ${r.model ?? ""} ${r.status ?? ""}`}
      />
    </div>
  );
}
