import { createFileRoute } from "@tanstack/react-router";
import { CSuiteBoardroom } from "@/components/CSuiteBoardroom";

export const Route = createFileRoute("/boardroom")({
  head: () => ({
    meta: [
      { title: "C-Suite Boardroom & Social Syndication — Vital4Living Operations" },
      {
        name: "description",
        content:
          "Executive C-Suite Boardroom dais and live omni-channel social media syndication streams managed by Nyx Salinger (Director of Social Media).",
      },
      {
        property: "og:title",
        content: "C-Suite Boardroom & Social Syndication — Vital4Living Operations",
      },
      {
        property: "og:description",
        content:
          "Real-time social media syndication streams across Pinterest, Meta, Instagram, X/Threads, LinkedIn and dynamic boardroom widgets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoardroomRoute,
});

function BoardroomRoute() {
  return <CSuiteBoardroom />;
}
