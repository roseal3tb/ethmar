import { createFileRoute } from "@tanstack/react-router";
import { NoAccess } from "@/components/portal/NoAccess";
import { ReportsPage, type ReportsTab } from "@/components/portal/ReportsPage";
import { canSeeReports } from "@/lib/portal/permissions";
import { useMe } from "@/lib/portal/session";

const TABS: ReportsTab[] = ["mine", "board", "monthly"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

type Search = {
  tab?: ReportsTab | undefined;
  week?: string | undefined;
  c?: string | undefined;
  month?: string | undefined;
};

export const Route = createFileRoute("/portal/reports")({
  head: () => ({ meta: [{ title: "التقارير | بوابة أعضاء إثمار" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: TABS.includes(s["tab"] as ReportsTab) ? (s["tab"] as ReportsTab) : undefined,
    week: DAY.test(String(s["week"] ?? "")) ? String(s["week"]) : undefined,
    c: str(s["c"]),
    month: DAY.test(String(s["month"] ?? "")) ? String(s["month"]) : undefined,
  }),
  component: ReportsRoute,
});

function ReportsRoute() {
  const me = useMe();
  const { tab, week, c, month } = Route.useSearch();
  return canSeeReports(me) ? (
    <ReportsPage tab={tab} week={week} committee={c} month={month} />
  ) : (
    <NoAccess />
  );
}
