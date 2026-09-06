import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Save,
  ShieldCheck,
  SlidersHorizontal,
  X,
  UserPlus,
  Sparkles,
  Bot,
  Cpu,
  RefreshCw,
  Check,
  Trash2,
  Edit3,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { vitalApi, type StrategyConfig, type PersonaInfo } from "@/lib/vitalApi";

export const Route = createFileRoute("/strategy")({
  head: () => ({
    meta: [
      { title: "Strategy & AI Staff Control — Vital4Living Autopilot" },
      {
        name: "description",
        content:
          "Human-in-the-loop control surface for configuring AI staff members, editorial personas, guidelines, priority keywords and blacklisted themes.",
      },
      { property: "og:title", content: "Strategy & AI Staff Control — Vital4Living Autopilot" },
      {
        property: "og:description",
        content:
          "Pivot agent personas, tune staff writers, and deploy editorial guidelines in real time.",
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
      <p className="mt-1 text-xs text-zinc-400">{hint}</p>
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
          placeholder="Type keyword and press Enter"
          className="touch-target flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="touch-target rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-4 text-xs font-semibold text-zinc-200 transition"
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
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-rose-500/50 hover:text-rose-300 transition"
              >
                <span>{v}</span>
                <X aria-hidden className="size-3 text-zinc-400" />
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
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"personas" | "strategy">("personas");

  // Strategy State
  const [guidelines, setGuidelines] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [strategyLoading, setStrategyLoading] = useState(true);
  const [savingStrategy, setSavingStrategy] = useState(false);

  // Persona Management State
  const [personas, setPersonas] = useState<Record<string, PersonaInfo>>({});
  const [selectedPersonaName, setSelectedPersonaName] = useState<string>("Sierra");
  const [personasLoading, setPersonasLoading] = useState(true);
  const [savingPersona, setSavingPersona] = useState(false);

  // Selected persona edit fields
  const [personaRole, setPersonaRole] = useState("");
  const [personaGoal, setPersonaGoal] = useState("");
  const [personaBackstory, setPersonaBackstory] = useState("");
  const [personaModel, setPersonaModel] = useState("premium-writer-llm");

  // Create New AI Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("");
  const [newStaffGoal, setNewStaffGoal] = useState("");
  const [newStaffBackstory, setNewStaffBackstory] = useState("");
  const [newStaffModel, setNewStaffModel] = useState("premium-writer-llm");
  const [creatingStaff, setCreatingStaff] = useState(false);

  // 1. Fetch current strategy on mount
  const loadStrategy = async () => {
    setStrategyLoading(true);
    try {
      const data = await vitalApi.getStrategy();
      if (data) {
        setGuidelines(data.active_guidelines || "");
        setKeywords(data.priority_keywords || []);
        setBlacklist(data.blacklist_themes || []);
      }
    } catch {
      // fallback
    } finally {
      setStrategyLoading(false);
    }
  };

  // 2. Fetch AI staff personas on mount
  const loadPersonas = async () => {
    setPersonasLoading(true);
    try {
      const data = await vitalApi.getPersonas();
      setPersonas(data);
      const names = Object.keys(data);
      if (names.length > 0 && names[0] && !data[selectedPersonaName]) {
        setSelectedPersonaName(names[0]);
      }
    } catch {
      // fallback
    } finally {
      setPersonasLoading(false);
    }
  };

  useEffect(() => {
    void loadStrategy();
    void loadPersonas();
  }, []);

  // Update persona form fields whenever selected persona changes
  useEffect(() => {
    if (personas[selectedPersonaName]) {
      const p = personas[selectedPersonaName];
      setPersonaRole(p.role || "");
      setPersonaGoal(p.goal || "");
      setPersonaBackstory(p.backstory || "");
      setPersonaModel(p.model || "premium-writer-llm");
    }
  }, [selectedPersonaName, personas]);

  // Save modified persona profile
  const handleSavePersona = async () => {
    setSavingPersona(true);
    try {
      await vitalApi.updatePersona(selectedPersonaName, {
        role: personaRole,
        goal: personaGoal,
        backstory: personaBackstory,
        model: personaModel,
      });
      toast.success(`AI Staff Profile "${selectedPersonaName}" updated!`);
      void loadPersonas();
    } catch (err: any) {
      toast.error(err.message || "Failed to update persona");
    } finally {
      setSavingPersona(false);
    }
  };

  // Create new AI staff member
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffRole.trim()) return;
    setCreatingStaff(true);
    try {
      await vitalApi.createPersona({
        name: newStaffName.trim(),
        role: newStaffRole.trim(),
        goal: newStaffGoal.trim(),
        backstory: newStaffBackstory.trim(),
        model: newStaffModel,
      });
      toast.success(`AI Staff Member "${newStaffName.trim()}" created!`);
      const addedName = newStaffName.trim();
      setNewStaffName("");
      setNewStaffRole("");
      setNewStaffGoal("");
      setNewStaffBackstory("");
      setShowAddStaffModal(false);
      await loadPersonas();
      setSelectedPersonaName(addedName);
    } catch (err: any) {
      toast.error(err.message || "Failed to create AI staff member");
    } finally {
      setCreatingStaff(false);
    }
  };

  // Delete AI staff member
  const handleDeleteStaff = async (name: string) => {
    if (["Sierra", "Dex", "Wren", "Bo", "Niko", "Nyx Salinger", "Nyx"].includes(name)) {
      if (!confirm(`Warning: "${name}" is a core default executive staff officer. Delete anyway?`))
        return;
    } else {
      if (!confirm(`Are you sure you want to remove AI staff writer "${name}"?`)) return;
    }

    try {
      await vitalApi.deletePersona(name);
      toast.success(`AI Staff "${name}" deleted.`);
      await loadPersonas();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete persona");
    }
  };

  // Save global strategy
  async function onSaveStrategy() {
    if (!guidelines.trim()) {
      toast.error("Active guidelines cannot be empty.");
      return;
    }
    setSavingStrategy(true);
    try {
      await vitalApi.updateConfig({
        active_guidelines: guidelines.trim(),
        priority_keywords: keywords,
        blacklist_themes: blacklist,
      });
      toast.success("Operational strategy committed to PostgreSQL state engine!");
      void qc.invalidateQueries({ queryKey: ["strategy"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update strategy");
    } finally {
      setSavingStrategy(false);
    }
  }

  const outgoingPayload = {
    action: "system_config_update",
    target_table: "operational_strategy",
    parameters: {
      priority_keywords: keywords,
      active_guidelines: guidelines,
      blacklist_themes: blacklist,
    },
    authorization_context: "admin_verified",
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps flex items-center gap-2 text-emerald-400">
            <SlidersHorizontal aria-hidden className="size-4" /> operational_strategy & personas
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">Strategy & AI Staff Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Select and tune individual AI staff contributors, create new specialized agents, or
            update global keyword and guideline mandates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-sm font-semibold transition shadow-sm"
          >
            <UserPlus className="size-4" />
            New AI Staff Member
          </button>
          <button
            type="button"
            onClick={() => {
              void loadStrategy();
              void loadPersonas();
            }}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-sm font-medium text-zinc-300 transition"
          >
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Modern Navigation Tabs */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("personas")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "personas"
              ? "border-emerald-500 text-white font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Bot className="size-4 text-emerald-400" />
          AI Editorial Staff & Personas ({Object.keys(personas).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("strategy")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "strategy"
              ? "border-emerald-500 text-white font-bold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Layers className="size-4 text-emerald-400" />
          Global Guidelines & Keywords
        </button>
      </div>

      {/* TAB 1: AI STAFF ROSTER & PERSONA EDITOR */}
      {activeTab === "personas" && (
        <div className="space-y-6">
          {/* Persona Selection Carousel/Grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Bot className="size-4 text-emerald-400" /> Select AI Staff Member to Configure
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(personas).map(([name, p]) => {
                const isSelected = selectedPersonaName === name;
                return (
                  <div
                    key={name}
                    onClick={() => setSelectedPersonaName(name)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-950/20"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-bold text-white text-base flex items-center gap-1.5">
                          {name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                            isSelected
                              ? "bg-emerald-500 text-zinc-950"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isSelected ? "Active" : "Select"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium line-clamp-2 mb-2">
                        {p.role}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                      <span className="truncate">{p.model || "premium-writer"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Persona Configuration Panel */}
          {personas[selectedPersonaName] && (
            <div className="panel p-6 space-y-5 border border-zinc-800 bg-zinc-950 rounded-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-bold text-lg">
                    {selectedPersonaName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      Configuring: {selectedPersonaName}
                      <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                        CrewAI Agent Contributor
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Changes made here are saved directly to{" "}
                      <code className="text-emerald-400 font-mono">personas.json</code> and consumed
                      dynamically during production runs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDeleteStaff(selectedPersonaName)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 px-3 py-1.5 rounded-md border border-zinc-800 transition"
                  >
                    <Trash2 className="size-3.5" />
                    Delete Staff Member
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSavePersona()}
                    disabled={savingPersona}
                    className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                  >
                    <Save className="size-3.5" />
                    {savingPersona ? "Saving Profile…" : "Save Persona Changes"}
                  </button>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Professional Role Title
                    </label>
                    <input
                      type="text"
                      value={personaRole}
                      onChange={(e) => setPersonaRole(e.target.value)}
                      placeholder="e.g. Sierra Marlowe - Fit & Sizing Standards Specialist"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Core LLM Routing Model
                    </label>
                    <select
                      value={personaModel}
                      onChange={(e) => setPersonaModel(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="premium-writer-llm">
                        premium-writer-llm (Claude 3.5 Sonnet / High Precision)
                      </option>
                      <option value="cheap-llm">
                        cheap-llm (Perplexity Sonar / Fast Summaries & Drafts)
                      </option>
                      <option value="live-research-llm">
                        live-research-llm (Perplexity Sonar-Pro / Live Radar Specs)
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Editorial Goal & Directives
                    </label>
                    <textarea
                      rows={4}
                      value={personaGoal}
                      onChange={(e) => setPersonaGoal(e.target.value)}
                      placeholder="e.g. Write highly engaging, elite-level technical copy..."
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white focus:border-emerald-500 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Backstory & Personality Voice Tone
                  </label>
                  <p className="text-xs text-zinc-500">
                    Defines the persona's vocabulary, biases, jargon level, and strict refusal to
                    use AI clichés.
                  </p>
                  <textarea
                    rows={9}
                    value={personaBackstory}
                    onChange={(e) => setPersonaBackstory(e.target.value)}
                    placeholder="An obsessive, no-nonsense ski technician who lives on the boot bench..."
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white focus:border-emerald-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GLOBAL OPERATIONAL STRATEGY */}
      {activeTab === "strategy" && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="panel space-y-5 p-5 border border-zinc-800 bg-zinc-950 rounded-xl">
            <div>
              <label className="label-caps block text-white font-bold" htmlFor="guidelines">
                Active Guidelines & Editorial Mandate
              </label>
              <p className="mt-1 text-xs text-zinc-400">
                Core tone, sizing authority rules, and editorial principles enforced across all
                automated articles.
              </p>
              <textarea
                id="guidelines"
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                rows={7}
                placeholder="Loading active strategy from PostgreSQL..."
                className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white focus:border-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            <TokenField
              label="Priority Keywords"
              hint="Steers topic radar discovery and CrewAI content research toward these search intents."
              values={keywords}
              onChange={setKeywords}
            />

            <TokenField
              label="Blacklist Themes"
              hint="Hard-blocked subjects; topics or drafts touching these are automatically quarantined."
              values={blacklist}
              onChange={setBlacklist}
            />

            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => void onSaveStrategy()}
                disabled={savingStrategy}
                className="touch-target flex items-center gap-2 rounded-md border border-alert bg-alert px-5 font-bold text-alert-foreground transition shadow-md hover:brightness-110 disabled:opacity-50"
              >
                <Save aria-hidden className="size-5" />
                {savingStrategy ? "Committing Revisions…" : "Commit Strategy Revision"}
              </button>
              <p className="flex items-center gap-2 text-xs text-zinc-400">
                <ShieldCheck aria-hidden className="size-4 text-emerald-400" />
                Persisted in PostgreSQL 16 state engine
              </p>
            </div>
          </section>

          <section
            aria-labelledby="payload"
            className="panel p-5 border border-zinc-800 bg-zinc-950 rounded-xl space-y-3"
          >
            <h2 id="payload" className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="size-4 text-emerald-400" /> State Engine Payload
            </h2>
            <p className="text-xs text-zinc-400">
              Deterministic JSON synced into PostgreSQL{" "}
              <code className="text-emerald-400 font-mono">operational_strategy</code> table.
            </p>
            <pre className="font-mono text-xs overflow-x-auto rounded-md border border-zinc-800 bg-zinc-900/80 p-3.5 text-emerald-300/90 leading-relaxed max-h-[500px]">
              {JSON.stringify(outgoingPayload, null, 2)}
            </pre>
          </section>
        </div>
      )}

      {/* Create New AI Staff Member Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-400" />
                Create New AI Staff Member
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-zinc-400">
                    Short Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kai, Rowan, Quinn"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-zinc-400">
                    Routing Model
                  </label>
                  <select
                    value={newStaffModel}
                    onChange={(e) => setNewStaffModel(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="premium-writer-llm">premium-writer-llm (Claude 3.5)</option>
                    <option value="cheap-llm">cheap-llm (Perplexity Sonar)</option>
                    <option value="live-research-llm">live-research-llm (Sonar-Pro)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">
                  Full Role Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kai Lindqvist - Nordic & Avalanche Safety Analyst"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">
                  Editorial Goal
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="What is this AI specialist tasked with producing?"
                  value={newStaffGoal}
                  onChange={(e) => setNewStaffGoal(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-zinc-400">
                  Backstory & Voice Guidelines
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe their background, tone of voice, terminology, and what they despise (e.g. marketing clichés)."
                  value={newStaffBackstory}
                  onChange={(e) => setNewStaffBackstory(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-1.5 rounded-md border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {creatingStaff ? "Creating Staff…" : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
