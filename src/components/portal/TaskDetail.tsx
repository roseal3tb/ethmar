import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  Check,
  CircleCheck,
  Clock3,
  ExternalLink,
  Hand,
  Loader2,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Send,
  Undo2,
  UsersRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dueLabel, relativeTime, shortDate, todayISO, weekday } from "@/lib/portal/dates";
import { errorMessage } from "@/lib/portal/errors";
import {
  canClaim,
  canManageTask,
  canReview,
  myAssignment,
  seatsLeft,
} from "@/lib/portal/permissions";
import {
  useClaim,
  useDirectory,
  useReview,
  useSetTaskStatus,
  useSubmit,
  useUnclaim,
} from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import { audienceLabel, myState } from "@/lib/portal/task-view";
import type { Assignment, Task } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { Avatar, Chip, EASE, hoursLabel, seatsLabel } from "./ui";

const DIALOG = "rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-md";

export function TaskDetail({ task, compact }: { task: Task; compact?: boolean | undefined }) {
  const me = useMe();
  const { dir } = useDirectory();
  const today = todayISO();
  const mine = myAssignment(me, task);
  const state = myState(me, task);
  const creator = dir?.member(task.created_by);
  const [confirm, setConfirm] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const claim = useClaim();
  const unclaim = useUnclaim();
  const setStatus = useSetTaskStatus();
  const left = seatsLeft(task);
  const late = task.due_date < today && task.status === "active";

  async function doClaim() {
    setConfirm(false);
    try {
      await claim.mutateAsync(task.id);
      toast.success("المهمة صارت لك", {
        description: `بالتوفيق، الموعد ${weekday(task.due_date)} ${shortDate(task.due_date)}`,
        duration: 6000,
        action: {
          label: "تراجع",
          onClick: () =>
            unclaim.mutate(task.id, {
              onSuccess: () => toast("رجعت المهمة للقائمة"),
              onError: (e) => toast.error(errorMessage(e)),
            }),
        },
      });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <article
      className={cn("flex flex-col gap-5", !compact && "p-card p-6")}
      aria-labelledby={`t-${task.id}`}
    >
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="dim">{audienceLabel(task, dir)}</Chip>
            <Chip tone="gold">
              <Clock3 className="size-3" /> {hoursLabel(task.hours)}
            </Chip>
            {task.status === "closed" && <Chip tone="dim">مغلقة</Chip>}
            {task.status === "cancelled" && <Chip tone="bad">ملغاة</Chip>}
          </div>
          <h2
            id={`t-${task.id}`}
            className="font-display text-xl font-extrabold leading-snug sm:text-[22px]"
          >
            {task.title}
          </h2>
          <p className="text-[13px] text-[var(--p-dim)]">
            {creator ? `من ${creator.full_name}` : ""}
            {dir?.committee(task.committee_id)
              ? ` · ${dir.committee(task.committee_id)!.title}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div
            className={cn(
              "grid w-16 place-items-center rounded-2xl border px-2 py-2 text-center",
              late
                ? "border-[rgb(242_165_142/0.35)] text-[var(--p-bad)]"
                : "border-[var(--p-line-strong)]",
            )}
          >
            <b className="font-display text-2xl leading-none">{Number(task.due_date.slice(8))}</b>
            <span className="mt-1 text-[11px] text-[var(--p-dim)]">{weekday(task.due_date)}</span>
          </div>
          {canManageTask(me, task) && task.status === "active" && (
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger
                className="grid size-8 place-items-center rounded-lg text-[var(--p-dim)] hover:bg-[rgb(200_222_211/0.07)] hover:text-[var(--p-text)]"
                aria-label="خيارات المهمة"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-[var(--p-line-strong)]">
                <DropdownMenuItem
                  onClick={() =>
                    setStatus.mutate(
                      { taskId: task.id, status: "closed" },
                      {
                        onSuccess: () => toast("أُغلقت المهمة، ما تقبل سحب جديد"),
                        onError: (e) => toast.error(errorMessage(e)),
                      },
                    )
                  }
                >
                  <Lock className="size-4" /> إغلاق المهمة
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-[var(--p-bad)]"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban className="size-4" /> إلغاء المهمة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2 text-sm text-[var(--p-soft)]">
        <Clock3 className="size-4 text-[var(--p-dim)]" />
        التسليم {dueLabel(task.due_date, today)} · {weekday(task.due_date)}{" "}
        {shortDate(task.due_date)}
      </div>

      <AnimatePresence>
        {state === "returned" && mine?.review_note && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-[rgb(240_182_122/0.3)] bg-[rgb(240_182_122/0.08)] p-4"
          >
            <b className="flex items-center gap-2 text-sm text-[#F0B67A]">
              <RotateCcw className="size-4" />{" "}
              {dir?.member(mine.reviewed_by)?.full_name ?? "القائد"} رجّعها لك
            </b>
            <p className="mt-1.5 text-sm leading-7">«{mine.review_note}»</p>
          </motion.div>
        )}
      </AnimatePresence>

      <ReviewList task={task} />

      {task.description && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[var(--p-dim)]">وش المطلوب؟</h3>
          <p className="whitespace-pre-line leading-8">{task.description}</p>
        </section>
      )}

      {mine && <Progress a={mine} />}

      <People task={task} left={left} />

      {/* primary action */}
      <div className="flex flex-col gap-2">
        {state === "none" && canClaim(me, task, today) && (
          <button
            type="button"
            className="p-btn w-full"
            onClick={() => setConfirm(true)}
            disabled={claim.isPending}
          >
            {claim.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Hand className="size-4" />
            )}
            اسحب المهمة
          </button>
        )}
        {state === "none" && !canClaim(me, task, today) && task.mode === "open" && left === 0 && (
          <p className="p-well px-4 py-3 text-center text-sm text-[var(--p-dim)]">اكتملت المقاعد</p>
        )}
        {(state === "claimed" || state === "returned") && task.status !== "cancelled" && (
          <button type="button" className="p-btn w-full" onClick={() => setSubmitOpen(true)}>
            <Send className="size-4" /> {state === "returned" ? "أعد التسليم" : "سلّم المهمة"}
          </button>
        )}
        {state === "claimed" && !mine?.assigned_by && (
          <button
            type="button"
            className="text-sm text-[var(--p-dim)] hover:text-[var(--p-text)]"
            onClick={() =>
              unclaim.mutate(task.id, {
                onSuccess: () => toast("تراجعت عن المهمة"),
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          >
            <Undo2 className="me-1 inline size-3.5" /> تراجع عن السحب
          </button>
        )}
        {state === "submitted" && (
          <p className="p-well flex items-center justify-center gap-2 px-4 py-3 text-sm text-[var(--p-warn)]">
            <Clock3 className="size-4" /> سلّمتها، بانتظار الاعتماد
          </p>
        )}
        {state === "approved" && (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-[rgb(198_164_92/0.12)] px-4 py-3 text-sm font-bold text-[var(--p-gold-soft)]">
            <CircleCheck className="size-4" /> اعتُمدت وانضافت {hoursLabel(task.hours)} لحسابك
          </p>
        )}
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className={DIALOG}>
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle className="font-display text-xl">تسحب المهمة؟</AlertDialogTitle>
            <AlertDialogDescription className="leading-7 text-[var(--p-soft)]">
              «{task.title}» بتصير مسؤوليتك، ونحتاجها قبل {weekday(task.due_date)}{" "}
              {shortDate(task.due_date)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction className="p-btn" onClick={doClaim}>
              أكيد، اسحبها
            </AlertDialogAction>
            <AlertDialogCancel className="p-btn-ghost mt-0 h-11 bg-transparent">
              لا، تراجع
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className={DIALOG}>
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle className="font-display text-xl">تلغي المهمة؟</AlertDialogTitle>
            <AlertDialogDescription className="leading-7 text-[var(--p-soft)]">
              «{task.title}» بتنتقل للمهام المغلقة
              {task.assignments.some((a) => a.status !== "approved")
                ? "، واللي شغالين عليها ما يقدرون يسلّمونها"
                : ""}
              . الساعات المعتمدة تبقى لأصحابها. إذا تبي توقف السحب بس، اختر «إغلاق المهمة».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              className="p-btn bg-[var(--p-bad)] text-[#2a0d06] hover:bg-[var(--p-bad)]"
              onClick={() =>
                setStatus.mutate(
                  { taskId: task.id, status: "cancelled" },
                  {
                    onSuccess: () => toast("أُلغيت المهمة"),
                    onError: (e) => toast.error(errorMessage(e)),
                  },
                )
              }
            >
              ألغِ المهمة
            </AlertDialogAction>
            <AlertDialogCancel className="p-btn-ghost mt-0 h-11 bg-transparent">
              لا، خلها
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubmitDialog task={task} open={submitOpen} onOpenChange={setSubmitOpen} initial={mine} />
    </article>
  );
}

function Progress({ a }: { a: Assignment }) {
  const steps = [
    { key: "claimed", label: a.assigned_by ? "أُسندت لك" : "سحبتها", when: a.claimed_at },
    {
      key: "submitted",
      label: a.status === "returned" ? "رجعت للتعديل" : "سلّمتها",
      when: a.submitted_at,
    },
    { key: "approved", label: "اعتُمدت", when: a.status === "approved" ? a.reviewed_at : null },
  ];
  const reached =
    a.status === "approved" ? 3 : a.status === "submitted" ? 2 : a.status === "returned" ? 2 : 1;
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="تقدّمك في المهمة">
      {steps.map((s, i) => {
        const done = i < reached;
        const warn = s.key === "submitted" && a.status === "returned";
        return (
          <li key={s.key} className="flex flex-col gap-2">
            <div className="h-1 overflow-hidden rounded-full bg-[rgb(200_222_211/0.1)]">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: warn ? "#F0B67A" : i === 2 ? "var(--p-gold)" : "var(--p-ok)",
                  transformOrigin: "right",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: done ? 1 : 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.12 }}
              />
            </div>
            <span
              className={cn(
                "text-xs",
                done ? "font-bold text-[var(--p-text)]" : "text-[var(--p-dim)]",
              )}
            >
              {s.label}
            </span>
            {done && s.when && (
              <span className="-mt-1.5 text-[11px] text-[var(--p-dim)]">
                {relativeTime(s.when)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const STATUS_TEXT: Record<
  Assignment["status"],
  { text: string; tone: "ok" | "warn" | "bad" | "gold" }
> = {
  claimed: { text: "يشتغل عليها", tone: "ok" },
  submitted: { text: "سلّمها", tone: "warn" },
  returned: { text: "رجعت له", tone: "bad" },
  approved: { text: "اعتُمدت", tone: "gold" },
};

function People({ task, left }: { task: Task; left: number }) {
  const me = useMe();
  const { dir } = useDirectory();
  if (task.assignments.length === 0 && task.mode !== "open") return null;
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--p-dim)]">
          <UsersRound className="size-4" /> {task.mode === "open" ? "اللي سحبوها" : "المسندة لهم"}
        </h3>
        {task.mode === "open" && task.seats != null && (
          <span className="text-xs text-[var(--p-dim)]">
            {task.assignments.length} من {seatsLabel(task.seats)}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {task.assignments.map((a) => {
          const m = dir?.member(a.member_id);
          const st = STATUS_TEXT[a.status];
          return (
            <li key={a.member_id} className="p-well flex items-center gap-3 px-3 py-2.5">
              <Avatar name={m?.full_name ?? "؟"} size={34} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">
                  {m?.full_name ?? "عضو"}
                  {a.member_id === me.id && (
                    <span className="ms-1.5 text-xs font-normal text-[var(--p-gold-soft)]">
                      (أنت)
                    </span>
                  )}
                </b>
                <span className="text-xs text-[var(--p-dim)]">
                  {dir?.team(m?.team_id)?.name ?? dir?.committee(m?.committee_id)?.name}
                </span>
              </span>
              <Chip tone={st.tone}>{st.text}</Chip>
            </li>
          );
        })}
        {task.status === "active" &&
          Array.from({ length: Math.min(left, 3) }).map((_, i) => (
            <li
              key={`seat-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--p-line-strong)] px-3 py-2.5 text-sm text-[var(--p-dim)]"
            >
              <span className="grid size-[34px] place-items-center rounded-full border border-dashed border-[var(--p-line-strong)]">
                +
              </span>
              مقعد فاضي{i === 0 && canClaim(me, task, todayISO()) ? "، ممكن يكون لك" : ""}
            </li>
          ))}
        {left > 3 && (
          <li className="text-xs text-[var(--p-dim)]">وفيه {seatsLabel(left - 3)} زيادة</li>
        )}
      </ul>
    </section>
  );
}

function ReviewList({ task }: { task: Task }) {
  const me = useMe();
  const { dir } = useDirectory();
  const pending = task.assignments.filter(
    (a) => a.status === "submitted" && canReview(me, task, dir?.member(a.member_id)),
  );
  if (!pending.length) return null;
  return (
    <section className="space-y-2.5 rounded-2xl border border-[rgb(198_164_92/0.28)] bg-[rgb(198_164_92/0.06)] p-4">
      <h3 className="font-display text-sm font-bold text-[var(--p-gold-soft)]">
        بانتظار اعتمادك ({pending.length})
      </h3>
      <ul className="flex flex-col gap-3">
        {pending.map((a) => (
          <ReviewItem key={a.member_id} task={task} a={a} />
        ))}
      </ul>
    </section>
  );
}

function ReviewItem({ task, a }: { task: Task; a: Assignment }) {
  const { dir } = useDirectory();
  const review = useReview();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const m = dir?.member(a.member_id);

  async function act(approve: boolean) {
    if (!approve && !note.trim()) {
      toast.error("اكتب ملاحظة توضح المطلوب تعديله");
      return;
    }
    try {
      await review.mutateAsync({ taskId: task.id, memberId: a.member_id, approve, note });
      if (approve) toast.success(`اعتمدت ${hoursLabel(task.hours)} لـ ${m?.full_name ?? "العضو"}`);
      else toast(`رجّعتها لـ ${m?.full_name ?? "العضو"} مع ملاحظتك`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <li className="rounded-xl bg-[#08291f] p-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={m?.full_name ?? "؟"} size={32} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-sm">{m?.full_name}</b>
          <span className="text-xs text-[var(--p-dim)]">
            سلّمها {a.submitted_at ? relativeTime(a.submitted_at) : ""}
          </span>
        </span>
      </div>
      {a.note && <p className="mt-2.5 text-sm leading-7 text-[var(--p-soft)]">«{a.note}»</p>}
      {a.link && (
        <a
          href={a.link}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--p-soft)] underline-offset-4 hover:underline"
          dir="ltr"
        >
          <ExternalLink className="size-3.5" /> {a.link.replace(/^https?:\/\//, "").slice(0, 42)}
        </a>
      )}
      <AnimatePresence initial={false}>
        {returning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <textarea
              className="p-input mt-3 min-h-20 resize-y"
              placeholder="وش المطلوب يتعدّل؟"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
              aria-label="ملاحظة التعديل"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-3 flex flex-wrap gap-2">
        {!returning ? (
          <>
            <button
              type="button"
              className="p-btn-gold min-h-10 flex-1"
              disabled={review.isPending}
              onClick={() => act(true)}
            >
              {review.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}{" "}
              اعتماد
            </button>
            <button type="button" className="p-btn-ghost flex-1" onClick={() => setReturning(true)}>
              <RotateCcw className="size-4" /> رجّعها للتعديل
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="p-btn min-h-10 flex-1"
              disabled={review.isPending}
              onClick={() => act(false)}
            >
              إرسال الملاحظة
            </button>
            <button type="button" className="p-btn-ghost" onClick={() => setReturning(false)}>
              إلغاء
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function SubmitDialog({
  task,
  open,
  onOpenChange,
  initial,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Assignment | undefined;
}) {
  const submit = useSubmit();
  const [note, setNote] = useState(initial?.note ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const linkBad = !!link.trim() && !/^https?:\/\/\S+$/i.test(link.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (linkBad) return;
    try {
      await submit.mutateAsync({ taskId: task.id, note, link });
      onOpenChange(false);
      toast.success("وصلت للاعتماد", { description: "بنعلمك أول ما تنعتمد" });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG}>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader className="text-start sm:text-start">
            <DialogTitle className="font-display text-xl">تسليم المهمة</DialogTitle>
            <DialogDescription className="text-[var(--p-soft)]">
              الخانات اختيارية، اكتب اللي يساعد قائدك يراجع.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-[var(--p-soft)]">ملاحظة</span>
            <textarea
              className="p-input min-h-24 resize-y"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="وش سويت؟ أي شي يحتاج ينتبه له القائد؟"
              maxLength={1000}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-[var(--p-soft)]">رابط الشغل</span>
            <input
              className="p-input"
              dir="ltr"
              inputMode="url"
              placeholder="https://"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              aria-invalid={linkBad}
            />
            {linkBad && (
              <span className="text-xs text-[var(--p-bad)]">الرابط لازم يبدأ بـ https://</span>
            )}
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="p-btn flex-1" disabled={submit.isPending || linkBad}>
              {submit.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}{" "}
              أرسلها للاعتماد
            </button>
            <button type="button" className="p-btn-ghost h-11" onClick={() => onOpenChange(false)}>
              إلغاء
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
