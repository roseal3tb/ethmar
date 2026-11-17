import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Inbox,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { committeeName, type Task, type TaskStatus } from "@/data/demo";
import { useDemoAuth } from "@/lib/demo-auth";
import { cn } from "@/lib/utils";
import {
  CommitteeChip,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatusBadge,
  dueLabel,
  formatDate,
  formatShortDate,
  statusMeta,
} from "./shared";

const filters: { id: TaskStatus; empty: string; icon: typeof Inbox }[] = [
  { id: "new", empty: "لا توجد مهام جديدة حاليًا، ستظهر هنا المهام المسندة إليك", icon: Inbox },
  { id: "active", empty: "لا توجد مهام نشطة، ابدأ مهمة جديدة لتظهر هنا", icon: PlayCircle },
  { id: "done", empty: "لم تُكمل أي مهمة بعد في هذه القائمة", icon: CheckCircle2 },
];

export function TasksPage() {
  const { tasks, setTaskStatus } = useDemoAuth();
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<TaskStatus>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tasks.find((t) => t.id === selectedId) ?? null;
  const visible = tasks
    .filter((t) => t.status === filter)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const f = filters.find((x) => x.id === filter)!;

  const start = (t: Task) => {
    setTaskStatus(t.id, "active");
    toast.success("بدأت المهمة", { description: t.title });
  };

  return (
    <div>
      <PageHeader title="المهام" text="تابع مهامك، وحدّث نسبة الإنجاز وحالة كل مهمة" />

      <div
        role="tablist"
        aria-label="تصفية المهام"
        className="grid grid-cols-3 gap-2 rounded-3xl border border-border bg-card p-1.5 shadow-card sm:inline-grid sm:min-w-[26rem]"
      >
        {filters.map((x) => {
          const count = tasks.filter((t) => t.status === x.id).length;
          const on = filter === x.id;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="tasks-panel"
              onClick={() => setFilter(x.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors duration-300",
                on
                  ? "text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              {on && (
                <motion.span
                  layoutId={reduce ? undefined : "tasks-tab"}
                  className="absolute inset-0 rounded-2xl bg-primary shadow"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <span className="relative">{statusMeta[x.id].label}</span>
              <span
                className={cn(
                  "relative min-w-6 rounded-full px-1.5 text-xs transition-colors",
                  on ? "bg-ivory/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        الساعات الموثقة تُعتمد بشكل منفصل، وإكمال المهمة لا يوثّق الساعات تلقائيًا
      </p>

      <div id="tasks-panel" role="tabpanel" className="mt-6">
        {visible.length === 0 ? (
          <EmptyState
            icon={f.icon}
            title={`لا توجد مهام ${statusMeta[filter].label}`}
            text={f.empty}
          />
        ) : (
          <motion.ul layout={!reduce} className="grid gap-4 md:grid-cols-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((t, i) => {
                const due = dueLabel(t.dueAt, t.status);
                return (
                  <motion.li
                    key={t.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
                    }}
                    exit={
                      reduce
                        ? undefined
                        : { opacity: 0, scale: 0.96, transition: { duration: 0.2 } }
                    }
                    className="group relative flex flex-col rounded-3xl border border-border/70 bg-card p-5 shadow-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CommitteeChip id={t.committee} />
                      <StatusBadge status={t.status} />
                    </div>
                    <h3 className="mt-3 font-display text-lg font-extrabold leading-snug text-primary">
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className="text-start after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none"
                      >
                        {t.title}
                      </button>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <ProgressBar value={t.progress} label={`تقدم ${t.title}`} />
                      <span
                        className="w-10 shrink-0 text-end text-xs font-bold text-primary"
                        dir="ltr"
                      >
                        {t.progress}%
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatShortDate(t.dueAt)} ·{" "}
                        <span
                          className={cn(
                            due.tone === "danger" && "font-bold text-destructive",
                            due.tone === "warn" && "font-bold text-[oklch(0.5_0.1_65)]",
                          )}
                        >
                          {due.text}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        <b className="text-foreground">{t.verifiedHours}</b>/{t.estHours} ساعة موثقة
                      </span>
                    </div>
                    {t.status === "new" && (
                      <Button
                        size="sm"
                        variant="brand"
                        className="relative z-10 mt-4 self-start"
                        onClick={() => start(t)}
                      >
                        <PlayCircle /> بدء المهمة
                      </Button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <TaskDialog task={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function TaskDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { setTaskStatus, setTaskProgress } = useDemoAuth();
  const [draft, setDraft] = useState(0);
  useEffect(() => {
    if (task) setDraft(task.progress);
  }, [task]);

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-h-[92vh] max-w-xl gap-0 overflow-y-auto rounded-[1.75rem] p-0"
      >
        {task && (
          <>
            <div className="bg-emerald-soft grain relative rounded-t-[1.75rem] p-6 pe-12 text-ivory sm:p-7 sm:pe-14">
              <div className="relative flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ivory/15 px-2.5 py-0.5 text-xs">
                  لجنة {committeeName(task.committee)}
                </span>
                <StatusBadge status={task.status} />
              </div>
              <DialogTitle className="relative mt-3 font-display text-2xl font-black leading-snug">
                {task.title}
              </DialogTitle>
              <DialogDescription className="relative mt-2 text-ivory/80">
                {task.description}
              </DialogDescription>
            </div>

            <div className="space-y-6 p-6 sm:p-7">
              <dl className="grid grid-cols-2 gap-3">
                <Detail
                  icon={CalendarPlus}
                  label="تاريخ الإسناد"
                  value={formatDate(task.assignedAt)}
                />
                <Detail
                  icon={CalendarClock}
                  label="تاريخ الاستحقاق"
                  value={formatDate(task.dueAt)}
                  sub={dueLabel(task.dueAt, task.status).text}
                />
                <Detail icon={Timer} label="الساعات التقديرية" value={`${task.estHours} ساعة`} />
                <Detail
                  icon={ShieldCheck}
                  label="الساعات الموثقة"
                  value={`${task.verifiedHours} ساعة`}
                  highlight
                />
              </dl>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label htmlFor="task-progress" className="text-sm font-bold text-foreground/85">
                    نسبة الإنجاز
                  </label>
                  <span className="font-display text-xl font-black text-primary" dir="ltr">
                    {draft}%
                  </span>
                </div>
                <Slider
                  id="task-progress"
                  dir="rtl"
                  min={0}
                  max={100}
                  step={5}
                  value={[draft]}
                  onValueChange={(v) => setDraft(v[0] ?? 0)}
                  aria-label="نسبة الإنجاز"
                  className="py-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {[25, 50, 75, 100].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDraft(v)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-bold transition",
                          draft === v
                            ? "border-primary bg-secondary text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                        dir="ltr"
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={draft === task.progress}
                    onClick={() => {
                      setTaskProgress(task.id, draft);
                      toast.success("تم تحديث نسبة الإنجاز", {
                        description:
                          draft >= 100
                            ? "اكتملت المهمة — توثيق الساعات يتم بشكل منفصل"
                            : `${task.title}: ${draft}%`,
                      });
                    }}
                  >
                    حفظ التقدم
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl bg-sage p-4 text-xs leading-relaxed text-foreground/75">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                نسبة الإنجاز وحالة المهمة يحدّثها العضو، أما الساعات الموثقة فتعتمد بشكل مستقل ولا
                تتغير عند إكمال المهمة
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                {task.status === "new" && (
                  <Button
                    variant="brand"
                    onClick={() => {
                      setTaskStatus(task.id, "active");
                      toast.success("بدأت المهمة", { description: task.title });
                    }}
                  >
                    <PlayCircle /> بدء المهمة
                  </Button>
                )}
                {task.status === "active" && (
                  <Button
                    variant="brand"
                    onClick={() => {
                      setTaskStatus(task.id, "done");
                      toast.success("تم تعليم المهمة كمكتملة", {
                        description: "توثيق الساعات التطوعية يتم بشكل منفصل",
                      });
                    }}
                  >
                    <CheckCircle2 /> تعليم كمكتملة
                  </Button>
                )}
                {task.status === "done" && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setTaskStatus(task.id, "active");
                      toast("أُعيد فتح المهمة", { description: task.title });
                    }}
                  >
                    <RotateCcw /> إعادة فتح المهمة
                  </Button>
                )}
                <Button variant="ghost" className="rounded-full" onClick={onClose}>
                  إغلاق
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5",
        highlight ? "border-primary/25 bg-secondary/50" : "border-border",
      )}
    >
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </dt>
      <dd className="mt-1 text-sm font-bold text-foreground">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
