import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Lock,
  Server,
  User,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Shield,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { vitalApi, getApiBaseUrl } from "@/lib/vitalApi";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In & Access Control — Vital4Living Autopilot" },
      {
        name: "description",
        content: "Sign in or request access to the Vital4Living operations console.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "register">("signin");

  // Sign In Form State
  const [vpsUrl, setVpsUrl] = useState("http://15.204.83.117:8000");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Register Form State
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regNotes, setRegNotes] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessUser, setRegSuccessUser] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const existingToken = localStorage.getItem("v4l_api_token");
      if (existingToken && !searchParams.get("force")) {
        navigate({ to: "/" });
        return;
      }

      const savedUrl = localStorage.getItem("v4l_api_url");
      if (savedUrl) setVpsUrl(savedUrl);

      if (searchParams.get("tab") === "signup" || searchParams.get("tab") === "register") {
        setTab("register");
      }
    }
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    const cleanUrl = vpsUrl.trim().replace(/\/$/, "");
    if (!cleanUrl) {
      setSignInError("Please provide a valid VPS API Gateway URL.");
      return;
    }
    if (!username.trim() || !password) {
      setSignInError("Please enter your username and password.");
      return;
    }

    setSigningIn(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("v4l_api_url", cleanUrl);
      }
      const data = await vitalApi.login({
        username: username.trim(),
        password: password,
      });

      toast.success(`Welcome back, ${data.username}! (${data.role})`);
      window.location.href = "/";
    } catch (err: unknown) {
      setSignInError(
        err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.",
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (regUsername.trim().length < 3) {
      setRegError("Username must be at least 3 characters.");
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      return;
    }

    setRegistering(true);
    try {
      const cleanUrl = vpsUrl.trim().replace(/\/$/, "");
      if (typeof window !== "undefined" && cleanUrl) {
        localStorage.setItem("v4l_api_url", cleanUrl);
      }

      const regPayload: { username: string; password: string; full_name?: string; notes?: string } =
        {
          username: regUsername.trim(),
          password: regPassword,
        };
      if (regFullName.trim()) {
        regPayload.full_name = regFullName.trim();
      }
      if (regNotes.trim()) {
        regPayload.notes = regNotes.trim();
      }

      await vitalApi.register(regPayload);

      setRegSuccessUser(regUsername.trim());
      toast.success("Access request submitted for administrator review!");
    } catch (err: unknown) {
      setRegError(
        err instanceof Error ? err.message : "Registration failed. Username may already exist.",
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 mb-1">
              <Shield className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Vital4Living Operations
            </h1>
            <p className="text-xs text-zinc-400">
              Autonomous outdoor intelligence engine & webzine console
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setTab("signin");
                setSignInError(null);
              }}
              className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition ${
                tab === "signin"
                  ? "border-emerald-500 text-white font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setRegError(null);
              }}
              className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition ${
                tab === "register"
                  ? "border-emerald-500 text-white font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Request Access
            </button>
          </div>

          {/* SIGN IN TAB */}
          {tab === "signin" && (
            <div className="space-y-4">
              {signInError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/40 p-3.5 text-xs text-red-200">
                  <AlertTriangle className="size-5 shrink-0 text-red-400 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Authentication Failed</span>
                    <p className="text-red-300/80">{signInError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Server className="size-3.5 text-emerald-500" />
                    VPS API Gateway
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="e.g. http://15.204.83.117:8000"
                    value={vpsUrl}
                    onChange={(e) => setVpsUrl(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <User className="size-3.5 text-emerald-500" />
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin or editor"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Lock className="size-3.5 text-emerald-500" />
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 py-3 text-sm font-semibold text-white transition disabled:opacity-50 cursor-pointer"
                >
                  {signingIn ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      Sign In to Console
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setTab("register")}
                  className="text-xs text-zinc-400 hover:text-emerald-400 transition"
                >
                  Don't have an account?{" "}
                  <span className="font-semibold text-emerald-400">Request access here &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* REGISTER / REQUEST ACCESS TAB */}
          {tab === "register" && (
            <div className="space-y-4">
              {regSuccessUser ? (
                <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-5 space-y-3 text-center">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-900/50 text-emerald-400 mb-1">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Access Request Queued!</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Registration for user{" "}
                    <strong className="text-emerald-400 font-mono">"{regSuccessUser}"</strong> has
                    been recorded in the PostgreSQL state engine with status{" "}
                    <span className="text-amber-300 font-semibold">pending_approval</span>.
                  </p>
                  <div className="rounded-lg bg-zinc-900/80 border border-zinc-800 p-3 text-[11px] text-zinc-400 text-left">
                    <strong>Next Steps:</strong> An administrator will review your request in
                    Settings and assign your role (Viewer, Editor, or Admin). Once approved, you can
                    immediately log in with your credentials.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegSuccessUser(null);
                      setUsername(regSuccessUser);
                      setTab("signin");
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Proceed to Sign In
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3 text-xs text-zinc-400">
                    Self-service registration puts new accounts into a safe{" "}
                    <span className="text-amber-400 font-semibold">Pending Approval</span> state.
                    Administrators must approve your account before login is granted.
                  </div>

                  {regError && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/40 p-3.5 text-xs text-red-200">
                      <AlertTriangle className="size-5 shrink-0 text-red-400 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold">Registration Error</span>
                        <p className="text-red-300/80">{regError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-zinc-400">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Choose unique username (min 3 chars)"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-zinc-400">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Min 6 chars"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-zinc-400">
                          Confirm *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Re-type password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-zinc-400">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-zinc-400">
                        Role Request / Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Ski boot editor, content reviewer, SEO analyst"
                        value={regNotes}
                        onChange={(e) => setRegNotes(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={registering}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      {registering ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Submitting Access Request...
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-4" />
                          Submit Request for Approval
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
