import { useState } from "react";
import { Bot, ChevronRight, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { updateConfig } from "@/lib/bridge.functions";
import { cn } from "@/lib/utils";

type Command = {
  action: "system_config_update" | "manual_review_required";
  target_table: string;
  parameters: {
    priority_keywords: string[];
    blacklist_themes: string[];
    active_guidelines: string;
  };
  authorization_context: "admin_verified";
};

type Message = { role: "user" | "assistant"; text: string; command?: Command };

/** Converts natural language intent into the deterministic bridge payload. */
function buildCommand(input: string): Command {
  const keywordMatch = input.match(/keywords?\s*[:\-]\s*([^.;]+)/i);
  const blacklistMatch = input.match(/(?:blacklist|avoid|exclude)\s*[:\-]?\s*([^.;]+)/i);
  const filesystemIntent = /adsense|theme|template|config\.production|ghost\s+config/i.test(input);

  const split = (value: string) =>
    value
      .split(/,| and /i)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);

  return {
    action: filesystemIntent ? "manual_review_required" : "system_config_update",
    target_table: "operational_strategy",
    parameters: {
      priority_keywords: keywordMatch ? split(keywordMatch[1]!) : [],
      blacklist_themes: blacklistMatch ? split(blacklistMatch[1]!) : [],
      active_guidelines: input.trim(),
    },
    authorization_context: "admin_verified",
  };
}

export function AutopilotSidebar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: 'Autopilot ready. Try: "Make Sierra more opinionated. Keywords: Mondo sizing, boot volume."',
    },
  ]);

  const applyConfig = useServerFn(updateConfig);

  async function submit() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    const command = buildCommand(text);
    setMessages((m) => [...m, { role: "user", text }]);

    if (command.action === "manual_review_required") {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Filesystem intent detected (Ghost template / AdSense block). This requires the VPS script hook and human confirmation before execution.",
          command,
        },
      ]);
      return;
    }

    setPending(true);
    setMessages((m) => [
      ...m,
      { role: "assistant", text: "Dispatching PATCH /config to the VPS bridge…", command },
    ]);

    const result = await applyConfig({ data: command.parameters });
    setPending(false);

    if (result.ok) {
      toast.success("Operational strategy updated");
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "operational_strategy updated. New guidelines are live." },
      ]);
    } else {
      toast.error(result.error);
      setMessages((m) => [...m, { role: "assistant", text: `Failed: ${result.error}` }]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="touch-target fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-md border border-border-strong bg-card px-4 font-semibold shadow-panel lg:hidden"
      >
        <Bot aria-hidden className="size-5 text-alert" />
        Autopilot
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-sidebar transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Autopilot AI Assistant"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-lg">
            <Bot aria-hidden className="size-5 text-alert" />
            Autopilot Assistant
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="touch-target flex items-center justify-center rounded-md border border-border lg:hidden"
            aria-label="Collapse assistant"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border p-3 text-sm",
                m.role === "user"
                  ? "border-border-strong bg-secondary"
                  : "border-border bg-background",
              )}
            >
              <p className="label-caps mb-1">{m.role === "user" ? "Operator" : "Autopilot"}</p>
              <p className="leading-snug">{m.text}</p>
              {m.command ? (
                <pre className="numeric mt-2 overflow-x-auto rounded-sm border border-border p-2 text-xs text-muted-foreground">
                  {JSON.stringify(m.command, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>

        <form
          className="space-y-2 border-t border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="label-caps flex items-center gap-1">
            <ShieldCheck aria-hidden className="size-4" /> admin_verified
          </p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Issue a system command…"
              className="touch-target flex-1 rounded-md border border-input bg-background px-3 outline-none focus-visible:border-ring"
              aria-label="Autopilot command"
            />
            <button
              type="submit"
              disabled={pending}
              className="touch-target flex items-center justify-center rounded-md border border-alert bg-alert px-4 font-bold text-alert-foreground disabled:opacity-50"
              aria-label="Send command"
            >
              <Send aria-hidden className="size-5" />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
