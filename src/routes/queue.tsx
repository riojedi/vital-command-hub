import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ListChecks, RefreshCw } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusPill } from "@/components/StatusPill";
import { useQueueData } from "@/lib/bridge-queries";
import { ALERT_STATES, QUEUE_STATES, stateTone, type QueueItem } from "@/lib/queue-shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Editorial Queue — Vital4Living Autopilot" },
      {
        name: "description",
        content: "Interactive monitor for every article in the editorial_queue table across all 15 lifecycle states, from queued to published or quarantined.",
      },
      { property: "og:title", content: "Editorial Queue — Vital4Living Autopilot" },
      { property: "og:description", content: "Track article lifecycle states, claims and verification failures in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const { items, error, query } = useQueueData();
  const [filter, setFilter] = useState<string>("all");

  const rows = filter === "all" ? items : items.filter((i) => (i.status ?? "") === filter);

  const columns: Column<QueueItem>[] = [
    {
      key: "id",
      header: "ID",
      sortValue: (r) => Number(r.queue_id ?? 0),
      render: (r) => <span className="numeric">#{String(r.queue_id ?? "—")}</span>,
      className: "w-20",
    },
    {
      key: "title",
      header: "Article",
      sortValue: (r) => r.title ?? r.topic ?? "",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{r.title ?? r.topic ?? "Untitled"}</p>
          {r.topic && r.title ? (
            <p className="truncate text-sm text-muted-foreground">{r.topic}</p>
          ) : null}
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
      key: "claimed",
      header: "Claimed by",
      sortValue: (r) => r.claimed_by ?? "",
      render: (r) => (
        <span className="text-sm text-muted-foreground">{r.claimed_by ?? "unclaimed"}</span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      sortValue: (r) => (r.updated_at ? new Date(r.updated_at).getTime() : 0),
      render: (r) => (
        <span className="numeric text-sm text-muted-foreground">
          {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps flex items-center gap-2">
            <ListChecks aria-hidden className="size-4" /> editorial_queue
          </p>
          <h1 className="mt-1 text-3xl">Dynamic task queue</h1>
          <p className="mt-1 text-muted-foreground">
            {items.length} entries across the 15 lifecycle states.
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

      {/* 🌟 Redesigned Responsive Filter Pill Bar to prevent vertical splitting and layout squishing */}
      <div className="w-full border-b border-border/30 pb-4">
        <div className="flex flex-row gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent pb-2 px-0.5">
          {["all", ...QUEUE_STATES].map((state) => {
            const count = state === "all" ? items.length : items.filter((i) => i.status === state).length;
            const isSelected = filter === state;
            const isAlertState = ALERT_STATES.includes(state);

            return (
              <button
                key={state}
                type="button"
                onClick={() => setFilter(state)}
                className={cn(
                  "flex flex-row items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0",
                  isSelected
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-500 shadow-sm"
                    : isAlertState
                    ? "border-alert/30 bg-alert/5 text-alert hover:border-alert-strong"
                    : "border-border bg-card/40 text-muted-foreground hover:border-border-strong hover:text-foreground"
                )}
              >
                <span className="capitalize">{state.replace(/_/g, " ")}</span>
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold min-w-[20px] transition-colors",
                    isSelected
                      ? "bg-orange-500 text-slate-950"
                      : isAlertState
                      ? "bg-alert/20 text-alert"
                      : "bg-muted/80 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={query.isLoading}
        emptyLabel="No articles in this lifecycle state."
        rowKey={(r, i) => String(r.queue_id ?? i)}
        rowTone={(r) => {
          const tone = stateTone(r.status ?? "queued");
          return tone === "active" ? null : tone;
        }}
        searchable={(r) => `${r.title ?? ""} ${r.topic ?? ""} ${r.status ?? ""}`}
      />
    </div>
  );
}