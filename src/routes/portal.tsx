import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Wordmark } from "@/components/site/Wordmark";
import { LoginScreen } from "@/components/portal/LoginScreen";
import { PortalShell } from "@/components/portal/PortalShell";
import { useDemoAuth } from "@/lib/demo-auth";

// Members portal (demo). Layout route: shows the login screen until a demo member signs in,
// then renders the portal shell with the active child page (حسابي، لوحة الصدارة، المجتمع، المهام، اللابات).
export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "بوابة الأعضاء | مبادرة إثمار" },
      { name: "description", content: "بوابة أعضاء مبادرة إثمار — نسخة تجريبية." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "بوابة الأعضاء | مبادرة إثمار" },
      { property: "og:description", content: "بوابة أعضاء مبادرة إثمار — نسخة تجريبية." },
    ],
  }),
  component: PortalRoute,
});

function PortalRoute() {
  const { ready, member } = useDemoAuth();

  // Session is restored on the client only; show a neutral loading state meanwhile (and during SSR).
  if (!ready) {
    return (
      <div
        className="bg-hero grain flex min-h-screen flex-col items-center justify-center gap-6 text-ivory"
        role="status"
        aria-live="polite"
      >
        <Wordmark size="lg" affiliation={false} />
        <span className="flex items-center gap-2 text-sm text-mint/80">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل البوابة…
        </span>
      </div>
    );
  }

  if (!member) return <LoginScreen />;

  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  );
}
