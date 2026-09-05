import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up & Request Access — Vital4Living Autopilot" },
    ],
  }),
  component: SignUpRedirect,
});

function SignUpRedirect() {
  useEffect(() => {
    window.location.replace("/login?tab=signup");
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
      Redirecting to Access Request form...
    </div>
  );
}
