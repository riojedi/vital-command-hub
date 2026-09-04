import { createFileRoute } from "@tanstack/react-router";
import { Server, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { ApiKeyVaultPanel } from "@/components/ApiKeyVaultPanel";
import { useHealth } from "@/lib/bridge-queries";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Key Vault — Vital4Living Autopilot" },
      {
        name: "description",
        content:
          "Manage the Vital4Living bridge connection and rotate masked environment credentials for Anthropic, DeepSeek, Perplexity, Ghost, Resend and Telegram.",
      },
      { property: "og:title", content: "Settings & Key Vault — Vital4Living Autopilot" },
      {
        property: "og:description",
        content: "Rotate autopilot API credentials with masked previews and bearer-authenticated writes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { online, vpsIp } = useHealth();

  return (
    <div className="space-y-5">
      <header>
        <p className="label-caps flex items-center gap-2">
          <SettingsIcon aria-hidden className="size-4" /> System settings
        </p>
        <h1 className="mt-1 text-3xl">Bridge & credentials</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Configuration surface for the FastAPI bridge and the credential manifest that powers the
          agent fleet.
        </p>
      </header>

      <section aria-labelledby="bridge" className="panel p-4">
        <h2 id="bridge" className="flex items-center gap-2 text-xl">
          <Server aria-hidden className="size-5" /> Bridge connection
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="label-caps">Status</dt>
            <dd className="mt-1 flex items-center gap-2 font-semibold">
              <span aria-hidden className={`size-2 rounded-full ${online ? "bg-ok" : "bg-alert"}`} />
              {online ? "Operational" : "Unreachable"}
            </dd>
          </div>
          <div>
            <dt className="label-caps">VPS host</dt>
            <dd className="numeric mt-1">{vpsIp ?? "15.204.83.117"}</dd>
          </div>
          <div>
            <dt className="label-caps">Auth</dt>
            <dd className="mt-1 flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-4 text-ok" /> Bearer token (server-held)
            </dd>
          </div>
        </dl>
      </section>

      <ApiKeyVaultPanel />
    </div>
  );
}
