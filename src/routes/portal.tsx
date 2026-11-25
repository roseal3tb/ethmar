import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  FirstPasswordScreen,
  LoginScreen,
  PortalLoading,
  UnlinkedScreen,
} from "@/components/portal/AuthScreens";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useMounted } from "@/components/portal/ui";
import { PortalSessionProvider, useSession } from "@/lib/portal/session";

// Members portal. The session lives in the browser (Supabase auth), so the gate renders on the client:
// loading → login → first-password change → the portal itself.
export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "بوابة الأعضاء | مبادرة إثمار" },
      {
        name: "description",
        content: "بوابة أعضاء مبادرة إثمار: المهام والساعات التطوعية ولوحة الصدارة",
      },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#031F19" },
      { property: "og:title", content: "بوابة الأعضاء | مبادرة إثمار" },
      { property: "og:description", content: "بوابة أعضاء مبادرة إثمار" },
    ],
  }),
  component: PortalRoute,
});

function PortalRoute() {
  return (
    <PortalSessionProvider>
      <Gate />
    </PortalSessionProvider>
  );
}

function Gate() {
  const mounted = useMounted();
  const { status, me } = useSession();
  const qc = useQueryClient();
  if (!mounted || status === "loading") return <PortalLoading />;
  if (status === "signed-out") return <LoginScreen />;
  if (status === "unlinked" || !me) return <UnlinkedScreen />;
  if (me.must_change_password)
    return (
      <FirstPasswordScreen onDone={() => qc.invalidateQueries({ queryKey: ["portal", "me"] })} />
    );
  return (
    <PortalLayout>
      <Outlet />
    </PortalLayout>
  );
}
