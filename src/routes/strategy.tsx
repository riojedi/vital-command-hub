import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { updateConfig } from "@/lib/bridge.functions";

export const Route = createFileRoute("/strategy")({
  head: () => ({
    meta: [
      { title: "Operational Strategy — Vital4Living Autopilot" },
      {
        name: "description",
        content:
          "Human-in-the-loop control surface for editing agent guidelines, priority keywords and blacklisted themes in the operational_strategy table.",
      },
      { property: "og:title", content: "Operational Strategy — Vital4Living Autopilot" },
      {
        property: "og:description",
        content: "Pivot agent persona, keywords and blacklists with instant emergency intervention.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StrategyPage,
});

function TokenField({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  }

  return (
    <div>
      <label className="label-caps block" htmlFor={`field-${label}`}>
        {label}
      </label>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <div className="mt-2 flex gap-2">
        <input
          id={`field-${label}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type and press Enter"
          className="touch-target flex-1 rounded-md border border-border-strong bg-input px-3 text-foreground"
        />
        <button
          type="button"
          onClick={add}
          className="touch-target rounded-md border border-border-strong px-4 font-semibold"
        >
          Add
        </button>
      </div>
      {values.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="flex items-center gap-2 rounded-md border border-border-strong bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground"
              >
                {v}
                <X aria-hidden className="size-4" />
                <span className="sr-only">Remove {v}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StrategyPage() {
  const [guidelines, setGuidelines] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(updateConfig);
  const qc = useQueryClient();

  const payload = {
    action: "system_config_update",
    target_table: "operational_strategy",
    parameters: {
      priority_keywords: keywords,
      active_guidelines: guidelines,
      blacklist_themes: blacklist,
    },
    authorization_context: "admin_verified",
  };

  async function onSave() {
    if (!guidelines.trim()) {
      toast.error("Active guidelines cannot be empty.");
      return;
    }
    setSaving(true);
    const res = await save({
      data: {
        active_guidelines: guidelines.trim(),
        priority_keywords: keywords,
        blacklist_themes: blacklist,
      },
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Operational strategy updated.");
      void qc.invalidateQueries({ queryKey: ["strategy"] });
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="label-caps flex items-center gap-2">
          <SlidersHorizontal aria-hidden className="size-4" /> operational_strategy
        </p>
        <h1 className="mt-1 text-3xl">Strategy command center</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Writes a new revision to <span className="numeric">operational_strategy</span> via{" "}
          <span className="numeric">PATCH /config</span>. Agents pick up the revision on their next
          research cycle.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel space-y-5 p-4">
          <div>
            <label className="label-caps block" htmlFor="guidelines">
              Active guidelines
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              Persona, tone and editorial mandate handed to the research and editing crew.
            </p>
            <textarea
              id="guidelines"
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              rows={7}
              placeholder="Focus on high-engagement gear fit guides. Be opinionated and cite field testing."
              className="mt-2 w-full rounded-md border border-border-strong bg-input p-3 text-foreground"
            />
          </div>

          <TokenField
            label="Priority keywords"
            hint="Steers topic discovery toward these search intents."
            values={keywords}
            onChange={setKeywords}
          />

          <TokenField
            label="Blacklist themes"
            hint="Hard-blocked subjects; drafts touching these are quarantined."
            values={blacklist}
            onChange={setBlacklist}
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving}
              className="touch-target flex items-center gap-2 rounded-md border border-alert bg-alert px-5 font-bold text-alert-foreground disabled:opacity-50"
            >
              <Save aria-hidden className="size-5" />
              {saving ? "Committing…" : "Commit strategy revision"}
            </button>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck aria-hidden className="size-4 text-ok" />
              Bearer-authenticated, human-in-the-loop
            </p>
          </div>
        </section>

        <section aria-labelledby="payload" className="panel p-4">
          <h2 id="payload" className="text-xl">
            Outgoing payload
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deterministic JSON delivered to the VPS bridge.
          </p>
          <pre className="numeric mt-3 overflow-x-auto rounded-md border border-border bg-muted p-3 text-sm">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
