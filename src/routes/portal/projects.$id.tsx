import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailPage } from "@/components/portal/ProjectsPage";

export const Route = createFileRoute("/portal/projects/$id")({
  head: () => ({ meta: [{ title: "مشروع | بوابة أعضاء إثمار" }] }),
  component: ProjectRoute,
});

function ProjectRoute() {
  const { id } = Route.useParams();
  return <ProjectDetailPage id={id} />;
}
