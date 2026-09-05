import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Server, Settings as SettingsIcon, ShieldCheck, Users, Key } from "lucide-react";
import { ApiKeyVaultPanel } from "@/components/ApiKeyVaultPanel";
import { UserManagementPanel } from "@/components/UserManagementPanel";
import { useHealth } from "@/lib/bridge-queries";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Team Management — Vital4Living Autopilot" },
      {
        name: "description",
        content:
          "Manage team members, roles, passwords, bridge connection, and rotate masked environment credentials.",
      },
      { property: "og:title", content: "Settings & Team Management — Vital4Living Autopilot" },
      {
        property: "og:description",
        content: "Manage team users and rotate autopilot API credentials with masked previews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { online, vpsIp } = useHealth();
  const [activeTab, setActiveTab] = useState<"users" | "vault">("users");

  return (
    <div className="space-y-5">
      <header>
        <p className="label-caps flex items-center gap-2 text-emerald-400">
          <SettingsIcon aria-hidden className="size-4" /> System settings
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Administration & Credentials</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Manage team member accounts, permission roles, and the cryptographic API credential vault powering the autonomous agent fleet.
        </p>
      </header>

      <section aria-labelledby="bridge" className="panel p-4">
        <h2 id="bridge" className="flex items-center gap-2 text-lg font-bold text-white">
          <Server aria-hidden className="size-4 text-emerald-400" /> Bridge Connection Status
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="label-caps">Status</dt>
            <dd className="mt-1 flex items-center gap-2 font-semibold text-sm">
              <span aria-hidden className={`size-2 rounded-full ${online ? "bg-ok" : "bg-alert"}`} />
              <span className={online ? "text-emerald-400" : "text-rose-400"}>
                {online ? "Operational (Bridge Live)" : "Unreachable"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="label-caps">VPS Host</dt>
            <dd className="numeric mt-1 text-sm font-mono text-zinc-300">{vpsIp ?? "15.204.83.117"}</dd>
          </div>
          <div>
            <dt className="label-caps">Authentication Engine</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm text-zinc-300">
              <ShieldCheck aria-hidden className="size-4 text-emerald-400" /> PostgreSQL Sessions + PBKDF2
            </dd>
          </div>
        </dl>
      </section>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "users"
              ? "border-emerald-500 text-white font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="size-4 text-emerald-400" />
          Team & User Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vault")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "vault"
              ? "border-emerald-500 text-white font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Key className="size-4 text-emerald-400" />
          API Credential Vault
        </button>
      </div>

      {activeTab === "users" && <UserManagementPanel />}
      {activeTab === "vault" && <ApiKeyVaultPanel />}
    </div>
  );
}
