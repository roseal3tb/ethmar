import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/portal/HomePage";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "حسابي | بوابة أعضاء إثمار" }] }),
  component: HomePage,
});
