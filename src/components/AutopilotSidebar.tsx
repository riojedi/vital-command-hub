import { useState } from "react";
import { PanelRightClose, PanelRightOpen, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { updateConfig } from "@/lib/bridge.functions";
import { vitalApi } from "@/lib/vitalApi";
import mark from "@/assets/autopilot-mark.png";
import { cn } from "@/lib/utils";

type CommandParameters = {
  priority_keywords: string[];
  blacklist_themes: string[];
  active_guidelines: string;
};

type Command = {
  action: "system_config_update" | "filesystem_mutation";
  target_table: string;
  parameters: CommandParameters;
  authorization_context: "admin_verified";
};

type ToolState = "input-available" | "output-available" | "output-error" | "output-denied";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tool?: {
    command: Command;
    state: ToolState;
    output?: unknown;
    errorText?: string;
  } | undefined;
};

/** Deterministic NL -> bridge payload transformation. */
function buildCommand(input: string): Command {
  const keywordMatch = input.match(/keywords?\s*[:-]\s*([^.;]+)/i);
  const blacklistMatch = input.match(/(?:blacklist|avoid|exclude|drop)\s*[:-]?\s*([^.;]+)/i);
  const filesystemIntent = /adsense|theme|template|config.production|ghost\s+config/i.test(input);
  const split = (value: string) =>
    value
      .split(/,| and /i)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);

  return {
    action: filesystemIntent ? "filesystem_mutation" : "system_config_update",
    target_table: filesystemIntent ? "ghost_theme_config" : "operational_strategy",
    parameters: {
      priority_keywords: keywordMatch?.[1] ? split(keywordMatch[1]) : [],
      blacklist_themes: blacklistMatch?.[1] ? split(blacklistMatch[1]) : [],
      active_guidelines: input.trim(),
    },
    authorization_context: "admin_verified",
  };
}

const SUGGESTIONS = [
  "Trigger production run",
  "Make Sierra more opinionated. Keywords: Mondo sizing, boot volume",
  "Avoid: sponsored roundups, affiliate listicles",
];

export function AutopilotSidebar() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const qc = useQueryClient();

  async function dispatch(raw: string) {
    const value = raw.trim();
    if (!value || busy) return;
    setText("");
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setMessages((m) => [...m, { id: userId, role: "user", text: value }]);
    setBusy(true);

    try {
      const result = await vitalApi.sendAutopilotCommand(value);
      setBusy(false);

      const msgText = result.message || "Command executed successfully.";
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: msgText,
      };

      if (result.action === "update_strategy" || result.action === "trigger_run") {
        assistantMsg.tool = {
          command: {
            action: "system_config_update",
            target_table: result.action === "trigger_run" ? "editorial_queue" : "operational_strategy",
            parameters: {
              active_guidelines: value,
              priority_keywords: result.data?.priority_keywords || [],
              blacklist_themes: result.data?.blacklist_themes || [],
            },
            authorization_context: "admin_verified",
          },
          state: "output-available",
          output: result.data,
        };
      }

      setMessages((m) => [...m, assistantMsg]);

      if (result.action === "trigger_run") {
        toast.success(`Autopilot: Production run initiated for topic #${result.task_id || "active"}`);
        void qc.invalidateQueries({ queryKey: ["queue"] });
        void qc.invalidateQueries({ queryKey: ["telemetry"] });
        void qc.invalidateQueries({ queryKey: ["analytics"] });
      } else if (result.action === "update_strategy") {
        toast.success("Autopilot: Operational strategy updated in state engine.");
        void qc.invalidateQueries({ queryKey: ["strategy"] });
      } else {
        toast.info("Autopilot instruction executed.");
      }
    } catch (err: any) {
      setBusy(false);
      setMessages((m) => [
        ...m,
        {
          id: assistantId,
          role: "assistant",
          text: `Autopilot Command Error: ${err.message || "Could not reach backend bridge."}`,
        },
      ]);
      toast.error(err.message || "Failed to execute autopilot command");
    }
  }

  return (
    <>
      {/* 🚀 Sleek floating button to slide out the Sidebar on all screen sizes */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full border border-orange-500/30 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-orange-500 shadow-2xl hover:bg-slate-900 hover:border-orange-500 transition-all duration-200"
        >
          <PanelRightOpen className="size-4 animate-pulse" />
          Autopilot
        </button>
      )}

      {/* 📐 Collapsible Drawer snapping exactly to the right */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 w-80 md:w-[360px] h-screen bg-slate-950 border-l border-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-900 p-4 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <img src={mark} alt="" loading="lazy" width={32} height={32} className="size-7 rounded-md" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">Autopilot</h2>
              <p className="text-[10px] uppercase tracking-wider text-orange-500 font-semibold flex items-center gap-1">
                <ShieldCheck className="size-3" /> admin_verified
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Collapse assistant"
            className="p-1.5 rounded-md hover:bg-slate-900 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <PanelRightClose className="size-4" />
          </button>
        </header>

        <Conversation className="flex-1 bg-slate-950/20">
          <ConversationContent className="gap-4 p-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-900 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-400">
                  Natural-language control over writing guidelines and site configuration on the VPS.
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                    Suggested Commands
                  </span>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void dispatch(s)}
                      className="w-full text-left text-xs bg-slate-900 hover:bg-slate-900/80 border border-slate-900 hover:border-slate-800 p-2.5 rounded-lg text-slate-300 hover:text-slate-100 transition-all line-clamp-2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  <MessageResponse className="text-xs text-slate-300">{m.text}</MessageResponse>
                  {m.tool ? (
                    <Tool defaultOpen={false} className="mt-2 mb-0 border-slate-900 bg-slate-900/40">
                      <ToolHeader
                        type={`tool-${m.tool.command.action}`}
                        state={m.tool.state}
                        title={m.tool.command.action}
                        className="text-xs py-1"
                      />
                      <ToolContent className="text-xs p-2">
                        <ToolInput input={m.tool.command} />
                        <ToolOutput output={m.tool.output ?? null} errorText={m.tool.errorText} />
                      </ToolContent>
                    </Tool>
                  ) : null}
                </MessageContent>
              </Message>
            ))}

            {busy ? <Shimmer className="text-xs text-slate-400">Applying strategy…</Shimmer> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-slate-900 p-3 bg-slate-950/50">
          <PromptInput
            onSubmit={(_, event) => {
              event.preventDefault();
              void dispatch(text);
            }}
          >
            <PromptInputTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Issue a system command…"
              className="text-xs min-h-[40px] bg-slate-900 border-slate-900 focus:border-slate-800 rounded-lg py-2"
            />
            <PromptInputFooter className="justify-end pt-1">
              <PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={!text.trim()} className="size-7" />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </aside>
    </>
  );
}