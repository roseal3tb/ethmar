import { createFileRoute } from "@tanstack/react-router";
import { TasksPage } from "@/components/portal/TasksPage";
import type { TaskView } from "@/lib/portal/task-view";

const VIEWS: TaskView[] = ["open", "mine", "review", "all"];

export const Route = createFileRoute("/portal/tasks")({
  head: () => ({ meta: [{ title: "المهام | بوابة أعضاء إثمار" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { task?: string | undefined; view?: TaskView | undefined } => ({
    task: typeof s["task"] === "string" && s["task"] ? s["task"] : undefined,
    view: VIEWS.includes(s["view"] as TaskView) ? (s["view"] as TaskView) : undefined,
  }),
  component: TasksRoute,
});

function TasksRoute() {
  const { task, view } = Route.useSearch();
  return <TasksPage taskId={task} view={view} />;
}
