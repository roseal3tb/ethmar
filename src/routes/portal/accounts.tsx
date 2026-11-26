import { createFileRoute } from "@tanstack/react-router";
import { AccountsPage } from "@/components/portal/AccountsPage";
import { NoAccess } from "@/components/portal/NoAccess";
import { canManageAccounts } from "@/lib/portal/permissions";
import { useMe } from "@/lib/portal/session";

export const Route = createFileRoute("/portal/accounts")({
  head: () => ({ meta: [{ title: "حسابات الأعضاء | بوابة أعضاء إثمار" }] }),
  component: AccountsRoute,
});

function AccountsRoute() {
  const me = useMe();
  return canManageAccounts(me) ? <AccountsPage /> : <NoAccess />;
}
