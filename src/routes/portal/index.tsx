import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/components/portal/AccountPage";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "حسابي | بوابة أعضاء إثمار" }] }),
  component: AccountPage,
});
