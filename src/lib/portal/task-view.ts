// Pure helpers for presenting tasks (grouping, labels). Kept separate so they can be unit-tested.
import { addDays, daysBetween } from "./dates";
import {
  canClaim,
  canReview,
  isCommitteeHead,
  isLeadership,
  isTeamHead,
  myAssignment,
} from "./permissions";
import type { Directory } from "./queries";
import type { Member, Task } from "./types";

export type TaskView = "open" | "mine" | "review" | "all";
export type Scope = "all" | "committee" | "people" | "leaders" | `team:${string}`;

export function audienceLabel(t: Task, dir: Directory | null): string {
  if (t.audience === "leaders") return "لقادة اللجان";
  if (t.audience === "committee") {
    const c = dir?.committee(t.committee_id);
    return c && dir!.teamsOf(c.id).length ? "جماعية · كل الفرق" : "للجنة كاملة";
  }
  if (t.audience === "team") return dir?.team(t.team_id)?.name ?? "فريق";
  return "مسندة لأشخاص";
}

export const isReviewer = (me: Member) => isLeadership(me) || isCommitteeHead(me) || isTeamHead(me);

export function pendingReviews(me: Member, t: Task, dir: Directory | null) {
  return t.assignments.filter(
    (a) => a.status === "submitted" && canReview(me, t, dir?.member(a.member_id)),
  );
}

export function inView(
  view: TaskView,
  me: Member,
  t: Task,
  dir: Directory | null,
  today: string,
): boolean {
  if (view === "open") return canClaim(me, t, today);
  if (view === "mine") return !!myAssignment(me, t);
  if (view === "review") return pendingReviews(me, t, dir).length > 0;
  return true;
}

export function inScope(scope: Scope, t: Task): boolean {
  if (scope === "all") return true;
  if (scope.startsWith("team:")) return t.audience === "team" && t.team_id === scope.slice(5);
  return t.audience === scope;
}

/** Saudi week: Sunday → Saturday. */
export function weekEnd(today: string): string {
  const dow = new Date(today + "T00:00:00").getDay(); // 0 = Sunday
  return addDays(today, 6 - dow);
}

export type Group = { id: string; label: string; hint?: string; tasks: Task[] };

export function groupTasks(tasks: Task[], me: Member, today: string): Group[] {
  const end = weekEnd(today);
  const nextEnd = addDays(end, 7);
  const g = {
    late: [] as Task[],
    week: [] as Task[],
    next: [] as Task[],
    later: [] as Task[],
    done: [] as Task[],
  };
  for (const t of tasks) {
    const mine = myAssignment(me, t);
    // A closed task stops new claims only: if I still hold it, it stays in my timeline.
    const stillMine = !!mine && mine.status !== "approved";
    const finished =
      t.status === "cancelled" ||
      (t.status === "closed" && !stillMine) ||
      mine?.status === "approved";
    if (finished) g.done.push(t);
    else if (t.due_date < today) g.late.push(t);
    else if (t.due_date <= end) g.week.push(t);
    else if (t.due_date <= nextEnd) g.next.push(t);
    else g.later.push(t);
  }
  const by = (a: Task, b: Task) =>
    a.due_date.localeCompare(b.due_date) || a.title.localeCompare(b.title, "ar");
  const groups: Group[] = [
    { id: "late", label: "فات موعدها", tasks: g.late.sort(by) },
    { id: "week", label: "هذا الأسبوع", tasks: g.week.sort(by) },
    { id: "next", label: "الأسبوع الجاي", tasks: g.next.sort(by) },
    { id: "later", label: "لاحقًا", tasks: g.later.sort(by) },
    {
      id: "done",
      label: "مكتملة ومغلقة",
      tasks: g.done.sort((a, b) => b.due_date.localeCompare(a.due_date)),
    },
  ];
  return groups.filter((x) => x.tasks.length);
}

export type MyState = "none" | "claimed" | "submitted" | "returned" | "approved";
export function myState(me: Member, t: Task): MyState {
  return myAssignment(me, t)?.status ?? "none";
}

export function isUrgent(t: Task, today: string) {
  const d = daysBetween(today, t.due_date);
  return d >= 0 && d <= 1;
}
