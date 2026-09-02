import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "alert" | "ok";
}) {
  return (
    <div
      className={cn(
        "panel flex flex-col justify-between gap-3 p-4",
        tone === "alert" && "border-alert border-2",
        tone === "ok" && "border-ok",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="label-caps">{label}</span>
        <Icon
          aria-hidden
          className={cn(
            "size-5 shrink-0",
            tone === "alert" ? "text-alert" : tone === "ok" ? "text-ok" : "text-muted-foreground",
          )}
        />
      </div>
      <div>
        <p
          className={cn(
            "numeric text-3xl leading-none font-bold",
            tone === "alert" && "text-alert",
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
