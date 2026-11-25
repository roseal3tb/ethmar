import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Inbox, ListChecks, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { todayISO, weekday } from "@/lib/portal/dates";
import {
  canCreateTasks,
  canClaim,
  isCommitteeHead,
  isLeadership,
  myAssignment,
  seatsLeft,
} from "@/lib/portal/permissions";
import { useDirectory, useTasks } from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import {
  audienceLabel,
  groupTasks,
  inScope,
  inView,
  isReviewer,
  isUrgent,
  myState,
  pendingReviews,
  type Scope,
  type TaskView,
} from "@/lib/portal/task-view";
import type { Task } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { CreateTaskButton } from "./CreateTaskDialog";
import { TaskDetail } from "./TaskDetail";
import {
  Chip,
  EASE,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Segmented,
  hoursLabel,
  seatsLabel,
} from "./ui";

export function TasksPage({
  taskId,
  view: viewParam,
}: {
  taskId?: string | undefined;
  view?: TaskView | undefined;
}) {
  const me = useMe();
  const tasks = useTasks();
  const { dir } = useDirectory();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const today = todayISO();
  const reviewer = isReviewer(me);
  const [scope, setScope] = useState<Scope>("all");
  const [committeeFilter, setCommitteeFilter] = useState<string>("all");

  const all = useMemo(() => tasks.data ?? [], [tasks.data]);
  const counts = useMemo(() => {
    const c = { open: 0, mine: 0, review: 0, all: all.length };
    for (const t of all) {
      if (canClaim(me, t, today)) c.open++;
      const a = myAssignment(me, t);
      if (a && a.status !== "approved" && t.status === "active") c.mine++;
      c.review += pendingReviews(me, t, dir).length;
    }
    return c;
  }, [all, me, dir, today]);

  const view: TaskView = viewParam ?? (counts.mine > 0 ? "mine" : "open");
  const setView = (v: TaskView) =>
    navigate({ to: "/portal/tasks", search: { view: v, task: taskId }, replace: true });
  const select = (id: string | undefined) =>
    navigate({ to: "/portal/tasks", search: { view: viewParam, task: id }, replace: !isMobile });

  const filtered = useMemo(
    () =>
      all.filter(
        (t) =>
          inView(view, me, t, dir, today) &&
          inScope(scope, t) &&
          (committeeFilter === "all" ||
            (committeeFilter === "leaders"
              ? t.audience === "leaders"
              : t.committee_id === committeeFilter)),
      ),
    [all, view, me, dir, today, scope, committeeFilter],
  );
  const groups = useMemo(() => groupTasks(filtered, me, today), [filtered, me, today]);
  const selected =
    all.find((t) => t.id === taskId) ?? (!isMobile ? groups[0]?.tasks[0] : undefined);

  if (tasks.isError) return <ErrorState onRetry={() => tasks.refetch()} />;
  if (!tasks.data || !dir) return <PageSkeleton />;

  const myCommittee = dir.committee(me.committee_id);
  const myTeams = me.committee_id ? dir.teamsOf(me.committee_id) : [];
  const showTeamFilter = isCommitteeHead(me) && myTeams.length > 0 && view !== "open";
  const views = [
    { value: "mine" as const, label: "مهامي", count: counts.mine },
    { value: "open" as const, label: "المتاحة", count: counts.open },
    ...(reviewer
      ? [{ value: "review" as const, label: "بانتظار اعتمادي", count: counts.review }]
      : []),
    {
      value: "all" as const,
      label: isLeadership(me) ? "كل المهام" : isCommitteeHead(me) ? "كل مهام اللجنة" : "الكل",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={ListChecks}
        title={isLeadership(me) ? "المهام" : myCommittee ? `مهام ${myCommittee.title}` : "المهام"}
        subtitle="اسحب المهمة، سلّمها، وتنحسب ساعاتها أول ما تنعتمد"
        actions={
          canCreateTasks(me) ? (
            <CreateTaskButton
              onCreated={(id) =>
                navigate({ to: "/portal/tasks", search: { view: "all", task: id } })
              }
            />
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented id="task-view" value={view} onChange={setView} options={views} />
        </div>
        <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {showTeamFilter && (
            <Segmented
              id="task-scope"
              size="sm"
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "الكل" },
                { value: "committee", label: "جماعية" },
                ...myTeams.map((t) => ({
                  value: `team:${t.id}` as Scope,
                  label: t.name.replace(/^فريق /, ""),
                })),
                { value: "people", label: "أشخاص" },
              ]}
            />
          )}
          {isLeadership(me) && (
            <select
              className="p-input h-10 min-h-10 w-auto py-1 text-sm"
              value={committeeFilter}
              onChange={(e) => setCommitteeFilter(e.target.value)}
              aria-label="تصفية حسب اللجنة"
            >
              <option value="all">كل اللجان</option>
              <option value="leaders">مهام القادة</option>
              {dir.committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-label="قائمة المهام" className="p-card p-3 sm:p-4">
          {groups.length === 0 ? (
            <Empty view={view} />
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between px-2 pb-2 pt-1">
                    <h2
                      className={cn(
                        "text-sm font-bold",
                        g.id === "late" ? "text-[var(--p-bad)]" : "text-[var(--p-dim)]",
                      )}
                    >
                      {g.label}
                    </h2>
                    <span className="text-xs text-[var(--p-dim)]">{g.tasks.length}</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {g.tasks.map((t, i) => (
                      <motion.li
                        key={t.id}
                        layout="position"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 8) * 0.035 }}
                      >
                        <TaskRow
                          task={t}
                          active={selected?.id === t.id}
                          onSelect={() => select(t.id)}
                        />
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {!isMobile && (
          <div className="sticky top-24">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <TaskDetail task={selected} />
                </motion.div>
              ) : (
                <motion.div
                  key="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-card"
                >
                  <EmptyState icon={ClipboardList} title="اختر مهمة" body="تفاصيلها بتظهر هنا." />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {isMobile && (
        <Sheet open={!!taskId && !!selected} onOpenChange={(o) => !o && select(undefined)}>
          <SheetContent
            side="bottom"
            className="max-h-[90vh] overflow-y-auto rounded-t-[28px] border-[var(--p-line-strong)] bg-[#08291f] px-5 pb-10 pt-14"
          >
            <SheetTitle className="sr-only">تفاصيل المهمة</SheetTitle>
            <span
              aria-hidden="true"
              className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--p-line-strong)]"
            />
            {selected && <TaskDetail task={selected} compact />}
          </SheetContent>
        </Sheet>
      )}

      <Celebration tasks={all} />
    </div>
  );
}

function TaskRow({
  task,
  active,
  onSelect,
}: {
  task: Task;
  active: boolean;
  onSelect: () => void;
}) {
  const me = useMe();
  const { dir } = useDirectory();
  const today = todayISO();
  const state = myState(me, task);
  const pending = pendingReviews(me, task, dir).length;
  const left = seatsLeft(task);
  const late =
    task.due_date < today &&
    task.status === "active" &&
    state !== "approved" &&
    state !== "submitted";

  const chip =
    pending > 0 ? (
      <Chip tone="gold">{pending} للاعتماد</Chip>
    ) : state === "returned" ? (
      <Chip tone="bad">رجعت لك</Chip>
    ) : state === "submitted" ? (
      <Chip tone="warn">بانتظار الاعتماد</Chip>
    ) : state === "approved" ? (
      <Chip tone="gold">اعتُمدت</Chip>
    ) : state === "claimed" ? (
      late ? (
        <Chip tone="bad">متأخرة</Chip>
      ) : (
        <Chip tone="ok">لك</Chip>
      )
    ) : task.status !== "active" ? (
      <Chip tone="dim">{task.status === "closed" ? "مغلقة" : "ملغاة"}</Chip>
    ) : task.mode === "open" ? (
      left > 0 ? (
        <Chip tone="soft">{seatsLabel(left)}</Chip>
      ) : (
        <Chip tone="dim">مكتملة</Chip>
      )
    ) : (
      <Chip tone="dim">مسندة</Chip>
    );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-start transition-colors",
        active
          ? "border-[var(--p-line-strong)] bg-[rgb(200_222_211/0.07)]"
          : "border-transparent hover:bg-[rgb(200_222_211/0.04)]",
      )}
    >
      {active && (
        <motion.span
          layoutId="task-active"
          className="absolute inset-y-3 start-0 w-[3px] rounded-full bg-[var(--p-gold)]"
        />
      )}
      <span
        className={cn(
          "grid w-12 shrink-0 place-items-center rounded-xl py-1.5",
          isUrgent(task, today) && task.status === "active"
            ? "bg-[rgb(242_165_142/0.1)] text-[var(--p-bad)]"
            : "bg-[rgb(200_222_211/0.05)]",
        )}
      >
        <b className="font-display text-lg leading-none">{Number(task.due_date.slice(8))}</b>
        <span className="mt-0.5 text-[10px] text-[var(--p-dim)]">{weekday(task.due_date)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px]">{task.title}</b>
        <span className="mt-1 flex items-center gap-2 text-xs text-[var(--p-dim)]">
          <span className="truncate">{audienceLabel(task, dir)}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{hoursLabel(task.hours)}</span>
        </span>
      </span>
      <span className="shrink-0">{chip}</span>
    </button>
  );
}

function Empty({ view }: { view: TaskView }) {
  const copy: Record<TaskView, [string, string]> = {
    open: ["ما فيه مهام متاحة الحين", "أول ما تنزل مهمة جديدة يوصلك إشعار."],
    mine: ["ما عندك مهام", "شوف المهام المتاحة واسحب اللي يناسبك."],
    review: ["ما فيه شي بانتظار اعتمادك", "كل التسليمات تمت مراجعتها 👌"],
    all: ["ما فيه مهام", "ما نزلت مهام بعد."],
  };
  return (
    <EmptyState
      icon={view === "review" ? Inbox : ClipboardList}
      title={copy[view][0]}
      body={copy[view][1]}
    />
  );
}

const SEEN_KEY = "ethmar-celebrated";
function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Once per approval: a calm celebration when the member opens the tasks page after their work is approved. */
function Celebration({ tasks }: { tasks: Task[] }) {
  const me = useMe();
  const { dir } = useDirectory();
  const [shown, setShown] = useState<{
    key: string;
    task: Task;
    note: string | null;
    by: string | undefined;
  } | null>(null);

  useEffect(() => {
    if (shown) return;
    const seen = new Set(readSeen());
    const weekAgo = Date.now() - 7 * 86400000;
    for (const t of tasks) {
      const a = myAssignment(me, t);
      const key = `${me.id}:${t.id}`;
      if (
        a?.status === "approved" &&
        a.reviewed_at &&
        new Date(a.reviewed_at).getTime() > weekAgo &&
        !seen.has(key)
      ) {
        setShown({ key, task: t, note: a.review_note, by: dir?.member(a.reviewed_by)?.full_name });
        break;
      }
    }
  }, [tasks, me, dir, shown]);

  // Remembered only once dismissed, so a re-render or remount never swallows it.
  const close = () => {
    if (shown) {
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...readSeen(), shown.key].slice(-200)));
      } catch {
        // storage unavailable: it may show again next time, which is harmless
      }
    }
    setShown(null);
  };

  return (
    <Dialog open={!!shown} onOpenChange={(o) => !o && close()}>
      <DialogContent className="overflow-hidden rounded-3xl border-[rgb(198_164_92/0.3)] bg-[#08291f] text-center sm:max-w-sm">
        <DialogTitle className="sr-only">اعتُمدت مهمتك</DialogTitle>
        {shown && (
          <div className="relative flex flex-col items-center gap-3 pt-4">
            <Burst />
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="relative grid size-20 place-items-center rounded-full bg-[rgb(198_164_92/0.16)] text-[var(--p-gold-soft)]"
            >
              <Sparkles className="size-9" />
            </motion.span>
            <h2 className="relative font-display text-2xl font-extrabold">اعتُمدت مهمتك</h2>
            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
              className="relative rounded-full bg-[rgb(198_164_92/0.14)] px-4 py-1.5 font-bold text-[var(--p-gold-soft)]"
            >
              انضافت {hoursLabel(shown.task.hours)} لحسابك
            </motion.p>
            <p className="relative text-sm text-[var(--p-soft)]">{shown.task.title}</p>
            {shown.note && (
              <div className="p-well relative w-full p-4 text-start">
                <b className="text-sm">{shown.by ?? "القائد"}</b>
                <p className="mt-1 text-sm leading-7 text-[var(--p-soft)]">«{shown.note}»</p>
              </div>
            )}
            <button type="button" className="p-btn relative mt-2 w-full" onClick={close}>
              يعطيك العافية
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Burst() {
  const dots = Array.from({ length: 14 });
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-14 left-1/2 size-0">
      {dots.map((_, i) => {
        const angle = (i / dots.length) * Math.PI * 2;
        const r = 70 + (i % 3) * 18;
        return (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ background: i % 3 === 0 ? "#C6A45C" : i % 3 === 1 ? "#8FD9B3" : "#C8DED3" }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: Math.cos(angle) * r,
              y: Math.sin(angle) * r,
              opacity: [0, 1, 0],
              scale: 1,
            }}
            transition={{ duration: 1.6, ease: EASE, delay: 0.15 + (i % 4) * 0.04 }}
          />
        );
      })}
    </div>
  );
}
