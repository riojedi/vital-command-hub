import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Gauge,
  ListChecks,
  Server,
  Settings,
  SlidersHorizontal,
  LogIn,
  LogOut,
  User,
  Bot,
  Menu,
  X,
  Users,
} from "lucide-react";
import mark from "@/assets/autopilot-mark.png";
import { useHealth } from "@/lib/bridge-queries";
import { vitalApi, getAuthToken } from "@/lib/vitalApi";

const LINKS = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/boardroom", label: "Boardroom", icon: Users },
  { to: "/agents", label: "Agent Control", icon: Bot },
  { to: "/queue", label: "Editorial queue", icon: ListChecks },
  { to: "/telemetry", label: "Telemetry", icon: Server },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/strategy", label: "Strategy", icon: SlidersHorizontal },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppNav() {
  const { online, vpsIp, query } = useHealth();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close mobile navigation drawer whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Reactive synchronization of active user credentials
  useEffect(() => {
    const syncUser = () => {
      if (typeof window !== "undefined") {
        const token = getAuthToken();
        const u = localStorage.getItem("v4l_username");
        const r = localStorage.getItem("v4l_user_role");
        if (token && u) {
          setCurrentUser(u);
          setUserRole(r || "viewer");
        } else {
          setCurrentUser(null);
          setUserRole(null);
        }
      }
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("v4l:unauthorized", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("v4l:unauthorized", syncUser);
    };
  }, []);

  const handleSignOut = async () => {
    await vitalApi.logout();
    setCurrentUser(null);
    setUserRole(null);
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        {/* Top Header Row: Brand, Health Status, User Action */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
            <img
              src={mark}
              alt="Vital4Living Autopilot"
              loading="lazy"
              width={512}
              height={512}
              className="size-7 sm:size-8 rounded-md transition-transform group-hover:scale-105"
            />
            <div>
              <span className="font-display text-base sm:text-lg leading-tight font-extrabold tracking-tight block text-foreground group-hover:text-emerald-400 transition-colors">
                Vital4Living
              </span>
              <span className="label-caps text-[10px] sm:text-[11px] block leading-none text-muted-foreground">
                Autopilot console
              </span>
            </div>
          </Link>

          {/* Right Controls: Bridge Live Monitor & User Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bridge Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/80 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-mono text-zinc-300">
              <span
                aria-hidden
                className={`size-2 rounded-full ${online ? "bg-ok" : "bg-alert"}`}
              />
              <span className="text-muted-foreground">
                {query.isLoading ? "checking" : online ? "bridge live" : "bridge offline"}
              </span>
              <span className="numeric text-zinc-400 font-semibold">
                {vpsIp ?? "15.204.83.117"}
              </span>
            </div>

            {/* User Session Info or Sign In */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 sm:px-2.5 py-1 text-xs">
                  <User className="size-3 text-emerald-400 shrink-0" />
                  <span className="max-w-[100px] truncate font-semibold text-white sm:max-w-none">
                    {currentUser}
                  </span>
                  <span
                    className={`rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase font-bold ${
                      userRole === "admin"
                        ? "border border-rose-800/60 bg-rose-950/80 text-rose-300"
                        : userRole === "editor"
                          ? "border border-blue-800/60 bg-blue-950/80 text-blue-300"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {userRole}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out of console"
                  className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 sm:px-2.5 py-1 text-xs text-zinc-400 transition hover:border-rose-900 hover:bg-zinc-800 hover:text-rose-300"
                >
                  <LogOut className="size-3.5 shrink-0" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <LogIn className="size-3.5 shrink-0" />
                Sign In
              </Link>
            )}

            {/* Mobile Menu Hamburger Toggle (Visible only when authenticated) */}
            {currentUser && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                className="flex size-8 items-center justify-center rounded-md border border-border bg-card/60 text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden"
              >
                {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar (Desktop): Properly spaced and wrapped flexbox layout */}
        {currentUser && (
          <nav
            aria-label="Primary navigation"
            className="mt-2.5 hidden flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5 md:flex lg:gap-2"
          >
            {LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{
                  className:
                    "border-emerald-500/70 bg-emerald-950/40 text-emerald-300 font-bold shadow-xs",
                }}
                inactiveProps={{
                  className:
                    "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground",
                }}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150"
              >
                <Icon aria-hidden className="size-3.5 shrink-0 text-emerald-400/80" />
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Navigation Bar (Mobile / Tablet Collapsible Menu) */}
        {currentUser && mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 md:hidden"
          >
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
              {LINKS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  activeOptions={{ exact: to === "/" }}
                  activeProps={{
                    className: "border-emerald-500/70 bg-emerald-950/40 text-emerald-300 font-bold",
                  }}
                  inactiveProps={{
                    className:
                      "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground",
                  }}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  <Icon aria-hidden className="size-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>

            {/* Mobile bridge health info */}
            <div className="mt-1 flex items-center justify-between border-t border-border/30 pt-2 text-[10px] font-mono text-muted-foreground sm:hidden">
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${online ? "bg-ok" : "bg-alert"}`} />
                {online ? "Bridge Live" : "Bridge Offline"}
              </span>
              <span>{vpsIp ?? "15.204.83.117"}</span>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
