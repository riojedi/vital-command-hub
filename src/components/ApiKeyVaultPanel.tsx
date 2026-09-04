import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Bot,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Sparkle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getEnvKeys, updateEnvKey, VAULT_KEYS, type EnvKeyRecord } from "@/lib/bridge.functions";
import { cn } from "@/lib/utils";

type VaultKey = (typeof VAULT_KEYS)[number];

const KEY_META: Record<VaultKey, { label: string; hint: string; icon: typeof KeyRound }> = {
  ANTHROPIC_API_KEY: {
    label: "Anthropic",
    hint: "Primary drafting and editing model access",
    icon: Sparkle,
  },
  DEEPSEEK_API_KEY: {
    label: "DeepSeek",
    hint: "Low-cost research and summarisation tier",
    icon: Bot,
  },
  PERPLEXITY_API_KEY: {
    label: "Perplexity",
    hint: "Grounded web research for verification",
    icon: Eye,
  },
  GHOST_ADMIN_API_KEY: {
    label: "Ghost Admin",
    hint: "Publishing to the Vital4Living webzine",
    icon: KeyRound,
  },
  RESEND_API_KEY: {
    label: "Resend",
    hint: "Transactional and digest email delivery",
    icon: Send,
  },
  TELEGRAM_BOT_TOKEN: {
    label: "Telegram bot",
    hint: "Operator alerts for failed verification runs",
    icon: Send,
  },
  TELEGRAM_CHAT_ID: {
    label: "Telegram chat ID",
    hint: "Destination chat for autopilot notifications",
    icon: Send,
  },
};

export function ApiKeyVaultPanel() {
  const fetchKeys = useServerFn(getEnvKeys);
  const saveKey = useServerFn(updateEnvKey);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const query = useQuery({
    queryKey: ["env-keys"],
    queryFn: () => fetchKeys(),
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: (vars: { key: VaultKey; value: string }) => saveKey({ data: vars }),
    onSuccess: (res, vars) => {
      if (res.ok) {
        toast.success(`${KEY_META[vars.key].label} key updated on the VPS.`);
        setEditing(null);
        setDraft("");
        void qc.invalidateQueries({ queryKey: ["env-keys"] });
      } else {
        toast.error(res.error);
      }
    },
    onError: () => toast.error("Could not reach the bridge to rotate this credential."),
  });

  const result = query.data;
  const records: EnvKeyRecord[] =
    result?.ok === true
      ? result.data
      : VAULT_KEYS.map((key) => ({ key, masked: "unavailable", configured: false }));
  const error = result && result.ok === false ? result.error : null;

  function startEdit(key: string) {
    setEditing(key);
    setDraft("");
  }

  return (
    <section aria-labelledby="vault" className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label-caps flex items-center gap-2">
            <Lock aria-hidden className="size-4" /> GET /api/config/env
          </p>
          <h2 id="vault" className="mt-1 text-2xl">
            API key vault
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Values are masked before they leave the server — raw credentials are never sent to this
            browser. Updates are written straight into the VPS <span className="numeric">.env</span>{" "}
            manifest.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="touch-target flex items-center gap-2 rounded-md border border-border-strong px-4 font-semibold"
        >
          <RefreshCw aria-hidden className={cn("size-5", query.isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-md border-2 border-alert p-3 text-sm">
          <AlertTriangle aria-hidden className="size-5 shrink-0 text-alert" />
          <span>{error}</span>
        </p>
      ) : null}

      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {records.map((record) => {
          const meta = KEY_META[record.key as VaultKey];
          const Icon = meta?.icon ?? KeyRound;
          const isEditing = editing === record.key;
          const saving = mutation.isPending && mutation.variables?.key === record.key;

          return (
            <li
              key={record.key}
              className={cn(
                "rounded-md border p-4",
                record.configured ? "border-border" : "border-alert",
              )}
            >
              <div className="flex items-start gap-3">
                <Icon aria-hidden className="mt-1 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{meta?.label ?? record.key}</p>
                  <p className="numeric text-sm text-muted-foreground">{record.key}</p>
                  <p className="mt-2 numeric text-sm">
                    {query.isLoading ? (
                      "loading…"
                    ) : (
                      <>
                        <span className={record.configured ? "" : "text-alert"}>
                          {record.masked}
                        </span>{" "}
                        <span className="label-caps">
                          {record.configured ? "[masked]" : "[missing]"}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{meta?.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (isEditing ? setEditing(null) : startEdit(record.key))}
                  aria-expanded={isEditing}
                  className="touch-target flex shrink-0 items-center gap-2 rounded-md border border-border-strong px-3 text-sm font-semibold"
                >
                  {isEditing ? (
                    <>
                      <X aria-hidden className="size-4" /> Cancel
                    </>
                  ) : (
                    "Update key"
                  )}
                </button>
              </div>

              {isEditing ? (
                <form
                  className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = draft.trim();
                    if (value.length < 4) {
                      toast.error("Paste the full credential before confirming.");
                      return;
                    }
                    mutation.mutate({ key: record.key as VaultKey, value });
                  }}
                >
                  <label className="sr-only" htmlFor={`input-${record.key}`}>
                    New value for {record.key}
                  </label>
                  <input
                    id={`input-${record.key}`}
                    type="password"
                    autoComplete="off"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Paste new API key"
                    className="touch-target numeric min-w-0 flex-1 rounded-md border border-border-strong bg-input px-3 text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="touch-target flex items-center gap-2 rounded-md border border-alert bg-alert px-4 font-bold text-alert-foreground disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 aria-hidden className="size-5 animate-spin" />
                    ) : (
                      <Lock aria-hidden className="size-5" />
                    )}
                    Confirm
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
