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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300">
      {/* Iridescent Glowing Top Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-teal-400/60 to-indigo-500/80 pointer-events-none" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        {/* Top Header Row: Brand, Health Status, User Action */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
            <div className="relative rounded-lg p-[1px] bg-gradient-to-br from-emerald-500/60 to-teal-600/40 shadow-md shadow-emerald-950/40 group-hover:from-emerald-400 group-hover:to-teal-500 transition duration-200">
              <img
                src={mark}
                alt="Vital4Living Autopilot"
                loading="lazy"
                width={512}
                height={512}
                className="size-7 sm:size-8 rounded-[7px] object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div>
              <span className="font-display text-base sm:text-lg leading-tight font-extrabold tracking-tight block text-white group-hover:text-emerald-300 transition-colors">
                Vital4Living
              </span>
              <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-emerald-400/90 block leading-none mt-0.5">
                AUTOPILOT CONSOLE
              </span>
            </div>
          </Link>

          {/* Right Controls: Bridge Live Monitor & User Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bridge Status Indicator - Refined Monospaced Telemetry */}
            <div className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/10 bg-zinc-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-mono text-zinc-300 shadow-inner">
              <span className="relative flex size-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    online ? "bg-emerald-400" : "bg-rose-500"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full size-2 ${
                    online ? "bg-emerald-400" : "bg-rose-500"
                  }`}
                />
              </span>
              <span className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                {query.isLoading ? "POLLING" : online ? "BRIDGE LIVE" : "BRIDGE OFFLINE"}
              </span>
              <span className="text-zinc-700 font-mono">|</span>
              <span className="font-mono text-zinc-300 font-semibold">
                {vpsIp ?? "15.204.83.117"}
              </span>
            </div>

            {/* User Session Info or Sign In */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 text-xs shadow-inner">
                  <User className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="max-w-[100px] truncate font-semibold text-white sm:max-w-none">
                    {currentUser}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase font-black tracking-wider ${
                      userRole === "admin"
                        ? "border border-rose-500/40 bg-rose-950/70 text-rose-300"
                        : userRole === "editor"
                          ? "border border-blue-500/40 bg-blue-950/70 text-blue-300"
                          : "border border-zinc-700 bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {userRole}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out of console"
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/80 hover:bg-rose-950/40 hover:border-rose-800/60 hover:text-rose-300 px-2.5 py-1 text-xs text-zinc-400 transition-all duration-200"
                >
                  <LogOut className="size-3.5 shrink-0" />
                  <span className="hidden sm:inline font-semibold">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 transition duration-200 hover:shadow-emerald-500/20 active:scale-[0.98]"
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
                className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-400 transition hover:bg-zinc-800 hover:text-white md:hidden"
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
            className="mt-2.5 hidden flex-wrap items-center gap-1.5 border-t border-white/10 pt-2.5 md:flex lg:gap-2"
          >
            {LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{
                  className:
                    "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-bold shadow-[0_0_16px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/30",
                }}
                inactiveProps={{
                  className:
                    "border-transparent bg-zinc-900/40 text-zinc-400 hover:border-white/10 hover:bg-zinc-900/80 hover:text-zinc-100 hover:-translate-y-0.5",
                }}
                className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200"
              >
                <Icon aria-hidden className="size-3.5 shrink-0 text-emerald-400" />
                <span>{label}</span>
                {to === "/boardroom" && (
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </Link>
            ))}
          </nav>
        )}

        {/* Navigation Bar (Mobile / Tablet Collapsible Menu) */}
        {currentUser && mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 md:hidden"
          >
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
              {LINKS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  activeOptions={{ exact: to === "/" }}
                  activeProps={{
                    className:
                      "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]",
                  }}
                  inactiveProps={{
                    className:
                      "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:bg-zinc-800/80 hover:text-zinc-200",
                  }}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200"
                >
                  <Icon aria-hidden className="size-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">{label}</span>
                  {to === "/boardroom" && (
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile bridge health info */}
            <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] font-mono text-zinc-400 sm:hidden">
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${online ? "bg-emerald-400" : "bg-rose-500"}`} />
                {online ? "BRIDGE LIVE" : "BRIDGE OFFLINE"}
              </span>
              <span>{vpsIp ?? "15.204.83.117"}</span>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
