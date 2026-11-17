import { createFileRoute } from "@tanstack/react-router";
import { LabsPage } from "@/components/portal/LabsPage";

export const Route = createFileRoute("/portal/labs")({
  head: () => ({ meta: [{ title: "اللابات | بوابة أعضاء إثمار" }] }),
  component: LabsPage,
});
