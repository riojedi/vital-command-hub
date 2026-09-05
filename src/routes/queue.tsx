import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ListChecks, RefreshCw, Play, Trash2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusPill } from "@/components/StatusPill";
import { useQueueData } from "@/lib/bridge-queries";
import { ALERT_STATES, stateTone, type QueueItem } from "@/lib/queue-shared";
import { vitalApi } from "@/lib/vitalApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Editorial Queue — Vital4Living Autopilot" },
      {
        name: "description",
        content: "Interactive monitor and control center for every article in the editorial_queue table.",
      },
      { property: "og:title", content: "Editorial Queue — Vital4Living Autopilot" },
      { property: "og:description", content: "Track article lifecycle states, modify processing statuses and run agents in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QueuePage,
});

const QUEUE_CATEGORIES = [
  { id: "all", label: "All Topics", matches: () => true },
  { id: "backlog", label: "Backlog", matches: (s: string) => ["monitored", "queued", "backlog"].includes(s) },
  { id: "in_progress", label: "In Progress", matches: (s: string) => ["running", "generating", "researching", "validating", "monetizing", "drafting"].includes(s) },
  { id: "review", label: "Review Needed", matches: (s: string) => ["review", "pending_approval", "verification_failed", "flagged"].includes(s) },
  { id: "published", label: "Published", matches: (s: string) => ["published", "completed"].includes(s) },
  { id: "quarantined", label: "Quarantined", matches: (s: string) => ["failed", "quarantined", "halted", "blocked"].includes(s) },
];

const AVAILABLE_STATES = [
  { value: "queued", label: "Queued" },
  { value: "monitored", label: "Monitored (Radar)" },
  { value: "running", label: "Running" },
  { value: "review", label: "Review Needed" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
  { value: "quarantined", label: "Quarantined" },
];

function QueuePage() {
  const { items, error, query } = useQueueData();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [runningId, setRunningId] = useState<number | null>(null);

  // New Topic Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPersona, setNewPersona] = useState("Sierra");
  const [newScore, setNewScore] = useState(85);
  const [submitting, setSubmitting] = useState(false);

  const activeCategory = QUEUE_CATEGORIES.find((c) => c.id === selectedCategory) ?? QUEUE_CATEGORIES[0]!;
  const rows = items.filter((i) => activeCategory.matches(i.status ?? "queued"));

  const handleStatusChange = async (queueId: number, newStatus: string) => {
    try {
      await vitalApi.updateQueueItem(queueId, { processing_status: newStatus });
      toast.success(`Topic #${queueId} status changed to '${newStatus}'`);
      void query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleRunTopic = async (queueId: number, persona?: string) => {
    setRunningId(queueId);
    try {
      toast.info(`Launching agent writing fleet for topic #${queueId}...`);
      await vitalApi.triggerRun(queueId, persona);
      toast.success(`Pipeline launched for topic #${queueId}! Check Overview console for live logs.`);
      void query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger run for topic");
    } finally {
      setRunningId(null);
    }
  };

  const handleDeleteTopic = async (queueId: number) => {
    if (!confirm(`Remove topic #${queueId} from editorial queue?`)) return;
    try {
      await vitalApi.deleteQueueItem(queueId);
      toast.success(`Topic #${queueId} removed from queue.`);
      void query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete topic");
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("http://15.204.83.117:8000/api/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("v4l_api_token") || "sk-v4l-MdI7-aclT18hH:6V4-uklvH-2026"}`
        },
        body: JSON.stringify({
          topic_title: newTitle.trim(),
          content_type: "article",
          persona: newPersona,
          topic_score: Number(newScore)
        })
      });
      if (!res.ok) throw new Error("Failed to create topic");
      toast.success(`Added "${newTitle.trim()}" to queue!`);
      setNewTitle("");
      setShowAddModal(false);
      void query.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create topic");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<QueueItem>[] = [
    {
      key: "id",
      header: "ID",
      sortValue: (r) => Number(r.queue_id ?? 0),
      render: (r) => <span className="numeric text-xs text-zinc-400 font-mono">#{String(r.queue_id ?? "—")}</span>,
      className: "w-16",
    },
    {
      key: "title",
      header: "Article Topic",
      sortValue: (r) => r.title ?? r.topic ?? "",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-100">{r.title ?? r.topic ?? "Untitled"}</p>
          {r.topic && r.title && r.topic !== r.title ? (
            <p className="truncate text-xs text-zinc-400">{r.topic}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "State & Status Control",
      sortValue: (r) => r.status ?? "",
      render: (r) => {
        const currStatus = r.status ?? "queued";
        const qId = Number(r.queue_id ?? 0);
        return (
          <div className="flex items-center gap-2">
            <select
              value={currStatus}
              onChange={(e) => void handleStatusChange(qId, e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-emerald-500 transition cursor-pointer hover:border-zinc-500 font-medium"
            >
              {AVAILABLE_STATES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
            <StatusPill status={currStatus} />
          </div>
        );
      },
    },
    {
      key: "claimed",
      header: "Assigned Staff",
      sortValue: (r) => r.claimed_by ?? "",
      render: (r) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
          {r.claimed_by || (r as any).persona || "Unassigned"}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      sortValue: (r) => (r.updated_at ? new Date(r.updated_at).getTime() : 0),
      render: (r) => (
        <span className="numeric text-xs text-zinc-400">
          {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => {
        const qId = Number(r.queue_id ?? 0);
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => void handleRunTopic(qId, r.claimed_by || (r as any).persona)}
              disabled={runningId === qId}
              title="Run writing loop on this topic immediately"
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition disabled:opacity-50"
            >
              <Play className="size-3 fill-current" />
              {runningId === qId ? "Launching…" : "Run"}
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteTopic(qId)}
              title="Remove from queue"
              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      },
      className: "w-28 text-right",
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps flex items-center gap-2 text-emerald-400">
            <ListChecks aria-hidden className="size-4" /> editorial_queue
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">Editorial Queue & State Engine</h1>
          <p className="mt-1 text-zinc-400 text-sm">
            {items.length} total topics organized across synchronized production phases. Change states interactively or trigger single-topic runs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-sm font-semibold transition shadow-sm"
          >
            <Plus className="size-4" />
            New Topic
          </button>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="touch-target flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 transition"
          >
            <RefreshCw aria-hidden className="size-4" /> Refresh
          </button>
        </div>
      </header>

      {error ? (
        <p className="flex items-start gap-2 rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          <AlertTriangle aria-hidden className="size-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </p>
      ) : null}

      {/* Categorized Filter Bar */}
      <div className="w-full border-b border-zinc-800 pb-3">
        <div className="flex flex-row gap-2 overflow-x-auto pb-1">
          {QUEUE_CATEGORIES.map((cat) => {
            const count = cat.id === "all" ? items.length : items.filter((i) => cat.matches(i.status ?? "queued")).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex flex-row items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                  isSelected
                    ? "border-emerald-500 bg-emerald-950/50 text-emerald-300 font-bold shadow-sm"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                )}
              >
                <span>{cat.label}</span>
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold min-w-[20px]",
                    isSelected
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-800 text-zinc-400"
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
        emptyLabel="No articles in this category."
        rowKey={(r, i) => String(r.queue_id ?? i)}
        rowTone={(r) => {
          const tone = stateTone(r.status ?? "queued");
          return tone === "active" ? null : tone;
        }}
        searchable={(r) => `${r.title ?? ""} ${r.topic ?? ""} ${r.status ?? ""} ${r.claimed_by ?? ""}`}
      />

      {/* Add Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-400" />
                Add Editorial Topic
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dynafit Rotation 14 Sizing & DIN Release Curves"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Staff Writer</label>
                  <select
                    value={newPersona}
                    onChange={(e) => setNewPersona(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Sierra">Sierra (Fit & Sizing)</option>
                    <option value="Dex">Dex (Outdoor Tech)</option>
                    <option value="Wren">Wren (Physiology)</option>
                    <option value="Bo">Bo (Durability)</option>
                    <option value="Niko">Niko (Field Tuning)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Priority Score (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newScore}
                    onChange={(e) => setNewScore(Number(e.target.value))}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 rounded-md border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Save Topic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}