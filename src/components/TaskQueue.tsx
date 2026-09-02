import { ListChecks } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { ALERT_STATES, QUEUE_STATES, type QueueItem } from "@/lib/queue-shared";
import { cn } from "@/lib/utils";

export function TaskQueue({
  items,
  loading,
  filter,
  onFilterChange,
}: {
  items: QueueItem[];
  loading: boolean;
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  const visible = filter === "all" ? items : items.filter((i) => (i.status ?? "") === filter);

  return (
    <section aria-labelledby="queue-heading" className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="queue-heading" className="flex items-center gap-2 text-xl">
          <ListChecks aria-hidden className="size-5 text-muted-foreground" />
          Dynamic Task Queue
        </h2>
        <span className="label-caps">{visible.length} entries</span>
      </div>

      <div className="mt-4 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {["all", ...QUEUE_STATES].map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => onFilterChange(state)}
            className={cn(
              "label-caps touch-target snap-start rounded-sm border px-3 whitespace-nowrap transition-colors",
              filter === state
                ? "border-foreground bg-secondary text-secondary-foreground"
                : "border-border hover:border-border-strong",
              ALERT_STATES.includes(state) && filter !== state && "border-alert text-alert",
            )}
          >
            {state.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Loading queue from VPS…</p>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No articles in this lifecycle state.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {visible.map((item, idx) => {
            const status = item.status ?? "queued";
            const isAlert = ALERT_STATES.includes(status);
            return (
              <li
                key={item.queue_id ?? idx}
                className={cn(
                  "flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
                  isAlert ? "border-2 border-alert" : "border-border",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.title ?? item.topic ?? "Untitled"}</p>
                  <p className="numeric text-sm text-muted-foreground">
                    #{String(item.queue_id ?? "—")}
                    {item.claimed_by ? ` · ${item.claimed_by}` : ""}
                    {item.updated_at ? ` · ${new Date(item.updated_at).toLocaleString()}` : ""}
                  </p>
                </div>
                <StatusPill status={status} className="self-start sm:self-center" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
