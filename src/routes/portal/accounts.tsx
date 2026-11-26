import { createFileRoute } from "@tanstack/react-router";
import { AdminPage, type AdminTab } from "@/components/portal/AdminPage";
import { NoAccess } from "@/components/portal/NoAccess";
import { canManageAccounts } from "@/lib/portal/permissions";
import { useMe } from "@/lib/portal/session";

const TABS: AdminTab[] = ["accounts", "hours", "semesters", "members"];

export const Route = createFileRoute("/portal/accounts")({
  head: () => ({ meta: [{ title: "الإدارة | بوابة أعضاء إثمار" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: AdminTab | undefined } => ({
    tab: TABS.includes(s["tab"] as AdminTab) ? (s["tab"] as AdminTab) : undefined,
  }),
  component: AccountsRoute,
});

function AccountsRoute() {
  const me = useMe();
  const { tab } = Route.useSearch();
  return canManageAccounts(me) ? <AdminPage tab={tab} /> : <NoAccess />;
}
