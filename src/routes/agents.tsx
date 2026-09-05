import { createFileRoute } from "@tanstack/react-router";
import { AgentControlCenter } from "@/components/AgentControlCenter";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agent Control Center — Vital4Living Operations" },
      {
        name: "description",
        content: "Multi-agent fleet orchestration, daily token governance, and circuit breaker protection.",
      },
      { property: "og:title", content: "Agent Control Center — Vital4Living Operations" },
      {
        property: "og:description",
        content: "Real-time monitor of Sierra, Dex, Wren agents with daily token meters and manual trigger runs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentControlCenterRoute,
});

function AgentControlCenterRoute() {
  return <AgentControlCenter />;
}
