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
  tool?: { command: Command; state: ToolState; output?: unknown; errorText?: string };
};

/** Deterministic NL -> bridge payload transformation. */
function buildCommand(input: string): Command {
  const keywordMatch = input.match(/keywords?\s*[:\-]\s*([^.;]+)/i);
  const blacklistMatch = input.match(/(?:blacklist|avoid|exclude|drop)\s*[:\-]?\s*([^.;]+)/i);
  const filesystemIntent = /adsense|theme|template|config\.production|ghost\s+config/i.test(input);

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
  "Make Sierra more opinionated. Keywords: Mondo sizing, boot volume",
  "Avoid: sponsored roundups, affiliate listicles",
  "Shift the AdSense block below the first gear table",
];

export function AutopilotSidebar() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const applyConfig = useServerFn(updateConfig);
  const qc = useQueryClient();

  async function dispatch(raw: string) {
    const value = raw.trim();
    if (!value || busy) return;
    setText("");
    const command = buildCommand(value);
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();

    setMessages((m) => [...m, { id: userId, role: "user", text: value }]);

    if (command.action === "filesystem_mutation") {
      setMessages((m) => [
        ...m,
        {
          id: assistantId,
          role: "assistant",
          text: "Filesystem intent detected — this rewrites the Ghost CMS template config on the VPS. Held for human confirmation per the emergency-control mandate.",
          tool: {
            command,
            state: "output-denied",
            output: { status: "held", reason: "requires_human_confirmation" },
          },
        },
      ]);
      return;
    }

    setBusy(true);
    setMessages((m) => [
      ...m,
      {
        id: assistantId,
        role: "assistant",
        text: "Dispatching `PATCH /config` to the VPS bridge.",
        tool: { command, state: "input-available" },
      },
    ]);

    const result = await applyConfig({ data: command.parameters });
    setBusy(false);

    setMessages((m) =>
      m.map((msg) =>
        msg.id !== assistantId
          ? msg
          : {
              ...msg,
              text: result.ok
                ? "`operational_strategy` updated — the next agent cycle picks up these guidelines."
                : `Update rejected: ${result.error}`,
              tool: {
                command,
                state: result.ok ? "output-available" : "output-error",
                ...(result.ok ? { output: result.data } : { errorText: result.error }),
              },
            },
      ),
    );

    if (result.ok) {
      toast.success("Operational strategy updated");
      void qc.invalidateQueries({ queryKey: ["strategy"] });
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="touch-target fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-md border border-border-strong bg-card px-4 font-semibold xl:hidden"
      >
        <PanelRightOpen aria-hidden className="size-5 text-alert" />
        Autopilot
      </button>

      <aside
        aria-label="Autopilot AI Assistant"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-sidebar transition-transform duration-200 xl:sticky xl:top-0 xl:z-auto xl:h-screen xl:max-w-none xl:translate-x-0",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border p-4">
          <div className="flex items-center gap-3">
            <img src={mark} alt="" loading="lazy" width={512} height={512} className="size-8" />
            <div>
              <h2 className="text-lg leading-none">Autopilot</h2>
              <p className="label-caps flex items-center gap-1">
                <ShieldCheck aria-hidden className="size-3" /> admin_verified
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Collapse assistant"
            className="touch-target flex items-center justify-center rounded-md border border-border xl:hidden"
          >
            <PanelRightClose aria-hidden className="size-5" />
          </button>
        </header>

        <Conversation className="flex-1">
          <ConversationContent className="gap-5">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Natural-language control over the agent lifecycle. Commands compile to a
                  deterministic bridge payload before execution.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void dispatch(s)}
                    className="w-full rounded-md border border-border p-3 text-left text-sm hover:border-border-strong"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  <MessageResponse>{m.text}</MessageResponse>
                  {m.tool ? (
                    <Tool defaultOpen={false} className="mt-3 mb-0 border-border">
                      <ToolHeader
                        type={`tool-${m.tool.command.action}`}
                        state={m.tool.state}
                        title={m.tool.command.action}
                      />
                      <ToolContent>
                        <ToolInput input={m.tool.command} />
                        <ToolOutput
                          output={m.tool.output ?? null}
                          errorText={m.tool.errorText}
                        />
                      </ToolContent>
                    </Tool>
                  ) : null}
                </MessageContent>
              </Message>
            ))}

            {busy ? <Shimmer>Applying strategy…</Shimmer> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-4">
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
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={!text.trim()} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </aside>
    </>
  );
}
