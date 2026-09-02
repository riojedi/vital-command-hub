import { Activity } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { SLA, type TelemetryRun } from "@/lib/queue-shared";
import { cn } from "@/lib/utils";

export function TelemetryPanel({ runs, loading }: { runs: TelemetryRun[]; loading: boolean }) {
  return (
    <section aria-labelledby="telemetry-heading" className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="telemetry-heading" className="flex items-center gap-2 text-xl">
          <Activity aria-hidden className="size-5 text-muted-foreground" />
          System Telemetry
        </h2>
        <span className="label-caps">SLA ${SLA.costPerArticle.toFixed(2)} / article</span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Reading agent_runs…</p>
      ) : runs.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No agent runs recorded yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {runs.map((run, idx) => {
            const cost = run.estimated_cost ?? 0;
            const overSla = cost > SLA.costPerArticle;
            return (
              <li
                key={run.run_id ?? idx}
                className={cn(
                  "grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center",
                  overSla ? "border-alert" : "border-border",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{run.workflow ?? "Production_Run"}</p>
                  <p className="numeric text-sm text-muted-foreground">
                    {run.model ?? "model n/a"}
                    {run.started_at ? ` · ${new Date(run.started_at).toLocaleString()}` : ""}
                  </p>
                </div>
                <p className="numeric text-sm">
                  {(run.token_usage ?? 0).toLocaleString()} tok
                  <span className={cn("ml-3 font-bold", overSla && "text-alert")}>
                    ${cost.toFixed(3)}
                  </span>
                </p>
                <StatusPill status={run.status ?? "queued"} className="justify-self-start" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
