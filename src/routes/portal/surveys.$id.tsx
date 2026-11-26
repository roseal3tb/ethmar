import { createFileRoute } from "@tanstack/react-router";
import { SurveyPage } from "@/components/portal/SurveysPage";

export const Route = createFileRoute("/portal/surveys/$id")({
  head: () => ({ meta: [{ title: "استبيان | بوابة أعضاء إثمار" }] }),
  component: SurveyRoute,
});

function SurveyRoute() {
  const { id } = Route.useParams();
  return <SurveyPage id={id} />;
}
