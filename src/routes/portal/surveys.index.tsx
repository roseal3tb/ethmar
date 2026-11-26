import { createFileRoute } from "@tanstack/react-router";
import { SurveysPage } from "@/components/portal/SurveysPage";

export const Route = createFileRoute("/portal/surveys/")({
  head: () => ({ meta: [{ title: "الاستبيانات | بوابة أعضاء إثمار" }] }),
  component: SurveysPage,
});
