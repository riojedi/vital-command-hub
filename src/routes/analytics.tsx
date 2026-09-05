import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, DollarSign, FileText, RefreshCw, Zap, ExternalLink } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable, type Column } from "@/components/DataTable";
import { MetricCard } from "@/components/MetricCard";
import { useAnalyticsData, useTelemetryData } from "@/lib/bridge-queries";
import { SLA } from "@/lib/queue-shared";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Publication Analytics — Vital4Living Autopilot" },
      {
        name: "description",
        content:
          "Publication ledger, Ghost post attribution and cumulative cost analytics for the Vital4Living autonomous webzine.",
      },
      { property: "og:title", content: "Publication Analytics — Vital4Living Autopilot" },
      {
        property: "og:description",
        content: "Ghost publication history and cost-per-article trend against the $0.18 SLA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

type Publication = { 
  title?: string; 
  date?: string; 
  ghost_post_id?: string;
  article_url?: string;
  ghost_editor_url?: string;
};

function AnalyticsPage() {
  const { publications, totalCost, totalTokens, error, query } = useAnalyticsData();
  const telemetry = useTelemetryData();

  const chartData = telemetry.runs
    .filter((r) => r.estimated_cost != null)
    .slice(0, 12)
    .reverse()
    .map((r) => ({
      run: `#${String(r.run_id ?? "")}`,
      cost: Number((r.estimated_cost ?? 0).toFixed(3)),
    }));

  const columns: Column<Publication>[] = [
    {
      key: "title",
      header: "Title",
      sortValue: (r) => r.title ?? "",
      render: (r) => {
        const articleUrl = r.article_url || (r.ghost_post_id ? `http://15.204.83.117:2368/p/${r.ghost_post_id}/` : null);
        return articleUrl ? (
          <a
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-zinc-100 hover:text-emerald-400 hover:underline inline-flex items-center gap-1.5 group"
          >
            <span>{r.title ?? "Untitled"}</span>
            <ExternalLink className="size-3.5 opacity-50 group-hover:opacity-100 text-emerald-400 shrink-0" />
          </a>
        ) : (
          <span className="font-semibold">{r.title ?? "Untitled"}</span>
        );
      },
    },
    {
      key: "date",
      header: "Published",
      sortValue: (r) => (r.date ? new Date(r.date).getTime() : 0),
      render: (r) => (
        <span className="numeric text-sm text-muted-foreground">
          {r.date ? new Date(r.date).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "ghost",
      header: "Ghost Post",
      sortValue: (r) => r.ghost_post_id ?? "",
      render: (r) => {
        const editorUrl = r.ghost_editor_url || (r.ghost_post_id ? `http://15.204.83.117/ghost/#/editor/post/${r.ghost_post_id}` : null);
        if (!r.ghost_post_id) return <span className="numeric text-sm text-zinc-600">—</span>;
        return editorUrl ? (
          <a
            href={editorUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Ghost Admin Editor"
            className="numeric text-xs font-mono text-emerald-400 hover:underline inline-flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 hover:border-emerald-500 transition"
          >
            <span>{r.ghost_post_id.slice(0, 10)}…</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        ) : (
          <span className="numeric text-sm">{r.ghost_post_id}</span>
        );
      },
    },
  ];

  const meanCost = publications.length ? totalCost / publications.length : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps flex items-center gap-2">
            <BarChart3 aria-hidden className="size-4" /> historical_ledger
          </p>
          <h1 className="mt-1 text-3xl">Publication analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Ghost CMS publishing history and cumulative engine economics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void query.refetch();
            void telemetry.query.refetch();
          }}
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

      <section aria-label="Ledger summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Publications"
          value={String(publications.length)}
          hint="Latest ledger window"
          icon={FileText}
        />
        <MetricCard
          label="Cumulative cost"
          value={`$${totalCost.toFixed(2)}`}
          hint="All recorded agent runs"
          icon={DollarSign}
        />
        <MetricCard
          label="Cost / article"
          value={`$${meanCost.toFixed(3)}`}
          hint={`SLA ceiling $${SLA.costPerArticle.toFixed(2)}`}
          icon={DollarSign}
          tone={meanCost > SLA.costPerArticle ? "alert" : meanCost ? "ok" : "neutral"}
        />
        <MetricCard
          label="Tokens"
          value={totalTokens ? `${(totalTokens / 1000).toFixed(1)}k` : "—"}
          hint="Aggregate usage"
          icon={Zap}
        />
      </section>

      <section aria-labelledby="cost-trend" className="panel p-4">
        <h2 id="cost-trend" className="text-xl">
          Cost per run vs SLA
        </h2>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">No cost data recorded yet.</p>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="run"
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Bar dataKey="cost" fill="var(--color-chart-1)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <DataTable
        rows={publications}
        columns={columns}
        loading={query.isLoading}
        emptyLabel="No publications recorded."
        rowKey={(r, i) => r.ghost_post_id ?? String(i)}
        searchable={(r) => `${r.title ?? ""} ${r.ghost_post_id ?? ""}`}
      />
    </div>
  );
}
