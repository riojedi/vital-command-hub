import { Link } from "@tanstack/react-router";
import { BarChart3, Gauge, ListChecks, Server, Settings, SlidersHorizontal } from "lucide-react";
import mark from "@/assets/autopilot-mark.png";
import { useHealth } from "@/lib/bridge-queries";

const LINKS = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/queue", label: "Editorial queue", icon: ListChecks },
  { to: "/telemetry", label: "Telemetry", icon: Server },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/strategy", label: "Strategy", icon: SlidersHorizontal },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppNav() {
  const { online, vpsIp, query } = useHealth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={mark} alt="" loading="lazy" width={512} height={512} className="size-8" />
          <span className="font-display text-lg leading-none font-extrabold tracking-tight">
            Vital4Living
            <span className="block label-caps">Autopilot console</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "border-alert text-foreground" }}
              inactiveProps={{ className: "border-transparent text-muted-foreground" }}
              className="touch-target flex items-center gap-2 rounded-md border px-3 text-sm font-semibold whitespace-nowrap hover:text-foreground"
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <p className="label-caps flex items-center gap-2 whitespace-nowrap">
          <span
            aria-hidden
            className={`size-2 rounded-full ${online ? "bg-ok" : "bg-alert"}`}
          />
          {query.isLoading ? "checking" : online ? "bridge live" : "bridge offline"}
          <span className="numeric normal-case">{vpsIp ?? "15.204.83.117"}</span>
        </p>
      </div>
    </header>
  );
}
