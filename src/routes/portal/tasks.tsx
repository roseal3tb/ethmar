import { createFileRoute } from "@tanstack/react-router";
import { TasksPage } from "@/components/portal/TasksPage";

export const Route = createFileRoute("/portal/tasks")({
  head: () => ({ meta: [{ title: "المهام | بوابة أعضاء إثمار" }] }),
  component: TasksPage,
});
