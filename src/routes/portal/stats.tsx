import { createFileRoute } from "@tanstack/react-router";
import { NoAccess } from "@/components/portal/NoAccess";
import { StatsPage } from "@/components/portal/StatsPage";
import { canSeeStats } from "@/lib/portal/permissions";
import { useMe } from "@/lib/portal/session";

export const Route = createFileRoute("/portal/stats")({
  head: () => ({ meta: [{ title: "الإحصائيات | بوابة أعضاء إثمار" }] }),
  component: StatsRoute,
});

function StatsRoute() {
  const me = useMe();
  return canSeeStats(me) ? <StatsPage /> : <NoAccess />;
}
