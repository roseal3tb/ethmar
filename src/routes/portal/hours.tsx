import { createFileRoute } from "@tanstack/react-router";
import { HoursPage } from "@/components/portal/HoursPage";

export const Route = createFileRoute("/portal/hours")({
  head: () => ({ meta: [{ title: "ساعاتي | بوابة أعضاء إثمار" }] }),
  component: HoursPage,
});
