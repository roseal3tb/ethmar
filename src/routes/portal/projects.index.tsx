import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "@/components/portal/ProjectsPage";

export const Route = createFileRoute("/portal/projects/")({
  head: () => ({ meta: [{ title: "المشاريع | بوابة أعضاء إثمار" }] }),
  component: ProjectsPage,
});
