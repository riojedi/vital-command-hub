import { cn } from "@/lib/utils";
import { stateTone } from "@/lib/queue-states";

const toneClass: Record<string, string> = {
  alert: "border-alert text-alert",
  warn: "border-warn text-warn",
  ok: "border-ok text-ok",
  active: "border-border-strong text-muted-foreground",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center rounded-sm border px-2 py-1 leading-none",
        toneClass[stateTone(status)],
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
