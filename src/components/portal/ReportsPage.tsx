import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  BellRing,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareWarning,
  Printer,
  Save,
  Send,
  Sparkles,
  Star,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addDays,
  monthLabel,
  monthStart,
  relativeTime,
  todayISO,
  weekLabel,
  weekStart,
} from "@/lib/portal/dates";
import { errorMessage } from "@/lib/portal/errors";
import {
  canReadMonthly,
  canReviewReport,
  canWriteMonthly,
  inQuality,
  isCommitteeHead,
  isLeadership,
} from "@/lib/portal/permissions";
import {
  useDirectory,
  useMonthlyOverview,
  useMonthlyReports,
  useReportActions,
  useReports,
} from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type {
  CommitteeReport,
  MemberEvaluation,
  MonthlyFields,
  ReportFields,
  ReportStatus,
} from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { celebrate } from "./Achievements";
import {
  Avatar,
  Chip,
  EASE,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Panel,
  Segmented,
  fmt,
  titleOf,
} from "./ui";

export type ReportsTab = "mine" | "board" | "monthly";

const STATUS: Record<
  ReportStatus | "none",
  { label: string; tone: "gold" | "ok" | "dim" | "bad" | "soft" }
> = {
  none: { label: "ما انرسل", tone: "dim" },
  draft: { label: "مسودة", tone: "soft" },
  submitted: { label: "بانتظار المراجعة", tone: "gold" },
  reviewed: { label: "تمت المراجعة", tone: "ok" },
  returned: { label: "رجع للتعديل", tone: "bad" },
};

const sent = (r?: CommitteeReport | null) => r?.status === "submitted" || r?.status === "reviewed";
/** Due by the end of the week's Saturday (Riyadh). */
const late = (r: CommitteeReport) =>
  !!r.submitted_at && r.submitted_at.slice(0, 10) > addDays(r.week_start, 6);

export function ReportsPage({
  tab,
  week,
  committee,
  month,
}: {
  tab?: ReportsTab | undefined;
  week?: string | undefined;
  committee?: string | undefined;
  month?: string | undefined;
}) {
  const me = useMe();
  const navigate = useNavigate();
  const head = isCommitteeHead(me) && !!me.committee_id;
  const quality = inQuality(me) || isLeadership(me);
  const monthly = canReadMonthly(me);
  const tabs = [
    ...(head ? [{ value: "mine" as const, label: "تقرير لجنتي" }] : []),
    ...(quality ? [{ value: "board" as const, label: "متابعة اللجان" }] : []),
    ...(monthly ? [{ value: "monthly" as const, label: "التقرير الشهري" }] : []),
  ];
  // A quality member opening a link about another committee lands on the board.
  const fallback: ReportsTab =
    committee && committee !== me.committee_id && quality ? "board" : (tabs[0]?.value ?? "mine");
  const current = tabs.find((t) => t.value === tab)?.value ?? fallback;
  const thisWeek = weekStart(todayISO());
  const selectedWeek = week && weekStart(week) === week ? week : thisWeek;
  const go = (patch: Record<string, string | undefined>) =>
    void navigate({
      to: "/portal/reports",
      search: (s: Record<string, unknown>) => ({ ...s, ...patch }),
      replace: true,
    });

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ClipboardCheck}
        title="التقارير"
        subtitle={
          current === "monthly"
            ? "تقرير لجنة الجودة الشهري لقيادة المبادرة"
            : "التقارير والتقييمات الأسبوعية من قادة اللجان للجنة الجودة"
        }
      />
      {tabs.length > 1 && (
        <Segmented
          id="reports-tabs"
          className="max-w-full overflow-x-auto"
          value={current}
          onChange={(t) => go({ tab: t, c: undefined })}
          options={tabs}
        />
      )}
      {current !== "monthly" && (
        <WeekPicker value={selectedWeek} onChange={(w) => go({ week: w })} />
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current + selectedWeek}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {current === "mine" && me.committee_id && (
            <MyReport committeeId={me.committee_id} week={selectedWeek} />
          )}
          {current === "board" && (
            <Board week={selectedWeek} open={committee} onOpen={(c) => go({ c })} />
          )}
          {current === "monthly" && (
            <Monthly month={month ?? monthStart(todayISO())} onMonth={(m) => go({ month: m })} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── shared bits ───────────────────────── */

function WeekPicker({ value, onChange }: { value: string; onChange: (w: string) => void }) {
  const thisWeek = weekStart(todayISO());
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(thisWeek, -7 * i));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [value]);
  return (
    <div
      ref={ref}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
      role="group"
      aria-label="الأسبوع"
    >
      {weeks.map((w, i) => {
        const on = w === value;
        return (
          <button
            key={w}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(w)}
            className={cn(
              "shrink-0 rounded-2xl border px-3.5 py-2 text-start transition-colors",
              on
                ? "border-transparent bg-[var(--p-soft)] text-[var(--p-bg)]"
                : "border-[var(--p-line-strong)] text-[var(--p-soft)] active:bg-[rgb(200_222_211/0.08)]",
            )}
          >
            <b className="block text-[13px]">
              {i === 0 ? "هذا الأسبوع" : i === 1 ? "الأسبوع الماضي" : `قبل ${i} أسابيع`}
            </b>
            <span className={cn("text-[11px]", on ? "opacity-80" : "text-[var(--p-dim)]")}>
              {weekLabel(w)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Stars({
  value,
  onChange,
  size = "md",
  label,
}: {
  value: number | null;
  onChange?: ((v: number | null) => void) | undefined;
  size?: "sm" | "md";
  label: string;
}) {
  const icon = size === "sm" ? "size-[18px]" : "size-7";
  return (
    <div className="flex items-center" role={onChange ? "radiogroup" : "img"} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value != null && value >= n;
        const body = (
          <Star
            className={cn(
              icon,
              "transition-[color,transform] duration-200",
              on ? "fill-[var(--p-gold)] text-[var(--p-gold)]" : "text-[var(--p-line-strong)]",
            )}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} من 5`}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "grid place-items-center active:scale-90",
              size === "sm" ? "size-8" : "size-11",
            )}
          >
            {body}
          </button>
        ) : (
          <span key={n} className="px-px">
            {body}
          </span>
        );
      })}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <b className="text-sm">
          {label}
          {required && <span className="ms-1 text-[var(--p-bad)]">*</span>}
        </b>
        {hint && <span className="text-[11px] text-[var(--p-dim)]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ───────────────────────── committee head: my report ───────────────────────── */

const EMPTY: ReportFields = {
  done: "",
  next_plan: "",
  challenges: "",
  support: "",
  link: "",
  self_score: null,
};

function MyReport({ committeeId, week }: { committeeId: string; week: string }) {
  const me = useMe();
  const { dir } = useDirectory();
  const prevWeek = addDays(week, -7);
  const q = useReports(prevWeek, week);
  const { save } = useReportActions();
  const report =
    q.data?.find((r) => r.committee_id === committeeId && r.week_start === week) ?? null;
  const previous = q.data?.find((r) => r.committee_id === committeeId && r.week_start === prevWeek);
  const locked = sent(report);
  const people = useMemo(
    () =>
      (dir?.membersOf(committeeId) ?? [])
        .filter((m) => m.id !== me.id)
        .sort(
          (a, b) =>
            Number(a.role === "member") - Number(b.role === "member") ||
            a.full_name.localeCompare(b.full_name, "ar"),
        ),
    [dir, committeeId, me.id],
  );
  const [fields, setFields] = useState<ReportFields>(EMPTY);
  const [evals, setEvals] = useState<Record<string, MemberEvaluation>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const dirty = useRef(false);
  const loadedFor = useRef<string | null>(null);

  // Load the saved report once per week shown.
  useEffect(() => {
    if (q.isLoading || loadedFor.current === week) return;
    loadedFor.current = week;
    dirty.current = false;
    setFields(report ? pick(report) : EMPTY);
    setEvals(Object.fromEntries((report?.evaluations ?? []).map((e) => [e.member_id, e])));
  }, [q.isLoading, report, week]);

  const evalList = (): MemberEvaluation[] =>
    people
      .map((m) => evals[m.id])
      .filter(
        (e): e is MemberEvaluation => !!e && (e.score != null || e.standout || !!e.note.trim()),
      );

  // Autosave the draft a moment after typing stops.
  useEffect(() => {
    if (locked || !dirty.current) return;
    const t = setTimeout(() => {
      save.mutate(
        { committeeId, week, fields, evaluations: evalList(), submit: false },
        { onSuccess: () => setSavedAt(Date.now()) },
      );
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, evals, locked]);

  const set = (patch: Partial<ReportFields>) => {
    dirty.current = true;
    setFields((f) => ({ ...f, ...patch }));
  };
  const setEval = (id: string, patch: Partial<MemberEvaluation>) => {
    dirty.current = true;
    setEvals((x) => ({
      ...x,
      [id]: { member_id: id, score: null, standout: false, note: "", ...x[id], ...patch },
    }));
  };
  const scored = people.filter((m) => evals[m.id]?.score != null).length;
  const linkBad = !!fields.link.trim() && !/^https?:\/\/\S+$/i.test(fields.link.trim());

  async function submit() {
    setTried(true);
    if (fields.done.trim().length < 3 || linkBad) {
      toast.error(linkBad ? "الرابط لازم يبدأ بـ https://" : "اكتب وش أنجزتوا قبل الإرسال");
      return;
    }
    try {
      await save.mutateAsync({ committeeId, week, fields, evaluations: evalList(), submit: true });
      dirty.current = false;
      celebrate();
      toast.success("وصل التقرير للجنة الجودة", { description: "بيوصلك إشعار أول ما يراجعونه" });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (q.isLoading) return <PageSkeleton />;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  const status: ReportStatus | "none" = report?.status ?? "none";
  const deadline = addDays(week, 6);
  const daysLeft = Math.round((new Date(deadline + "T23:59:59").getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <StatusBanner report={report} daysLeft={daysLeft} />

      <Panel
        title="تقرير الأسبوع"
        action={<Chip tone={STATUS[status].tone}>{STATUS[status].label}</Chip>}
      >
        <fieldset disabled={locked} className="space-y-4 disabled:opacity-80">
          <Field label="وش أنجزتوا هالأسبوع؟" required hint="أهم الإنجازات بالأرقام إذا تقدر">
            <textarea
              className="p-input min-h-28 resize-y"
              value={fields.done}
              maxLength={4000}
              aria-invalid={tried && fields.done.trim().length < 3}
              onChange={(e) => set({ done: e.target.value })}
              placeholder="مثال: نفذنا ورشتين حضرها 60 طالب، وصممنا 4 منشورات"
            />
          </Field>
          <Field label="خطة الأسبوع الجاي">
            <textarea
              className="p-input min-h-20 resize-y"
              value={fields.next_plan}
              maxLength={4000}
              onChange={(e) => set({ next_plan: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="التحديات">
              <textarea
                className="p-input min-h-20 resize-y"
                value={fields.challenges}
                maxLength={4000}
                onChange={(e) => set({ challenges: e.target.value })}
              />
            </Field>
            <Field label="تحتاجون دعم في؟">
              <textarea
                className="p-input min-h-20 resize-y"
                value={fields.support}
                maxLength={4000}
                onChange={(e) => set({ support: e.target.value })}
              />
            </Field>
          </div>
          <Field label="رابط (اختياري)" hint="ملف، صور، عرض">
            <input
              className="p-input"
              dir="ltr"
              inputMode="url"
              placeholder="https://"
              value={fields.link}
              maxLength={500}
              aria-invalid={linkBad}
              onChange={(e) => set({ link: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--p-line)] px-3 py-2">
            <b className="text-sm">كيف تقيّمون أسبوعكم؟</b>
            <Stars
              label="تقييم اللجنة لأسبوعها"
              value={fields.self_score}
              onChange={locked ? undefined : (v) => set({ self_score: v })}
            />
          </div>
        </fieldset>
      </Panel>

      <Panel
        title={
          <h2 className="font-display text-lg font-bold">
            تقييم الأعضاء{" "}
            <span className="text-sm font-normal text-[var(--p-dim)]">
              ({scored} من {people.length})
            </span>
          </h2>
        }
        action={
          !locked && previous?.evaluations.length ? (
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-bold text-[var(--p-gold-soft)]"
              onClick={() => {
                dirty.current = true;
                setEvals(
                  Object.fromEntries(
                    previous.evaluations
                      .filter((e) => people.some((m) => m.id === e.member_id))
                      .map((e) => [e.member_id, { ...e, note: "" }]),
                  ),
                );
                toast("نسخت تقييمات الأسبوع الماضي، عدّل اللي تغيّر");
              }}
            >
              <Copy className="size-3.5" /> انسخ الأسبوع الماضي
            </button>
          ) : undefined
        }
      >
        <p className="mb-3 text-xs leading-6 text-[var(--p-dim)]">
          قيّم التزام كل عضو وجودة شغله هالأسبوع. النجمة الذهبية تعني «متميز». التقييمات تشوفها لجنة
          الجودة وقيادة المبادرة فقط
        </p>
        {people.length === 0 ? (
          <p className="p-well px-4 py-6 text-center text-sm text-[var(--p-dim)]">
            ما فيه أعضاء في اللجنة
          </p>
        ) : (
          <ul className="divide-y divide-[var(--p-line)]">
            {people.map((m) => {
              const e = evals[m.id];
              return (
                <EvalRow
                  key={m.id}
                  name={m.full_name}
                  sub={dir?.team(m.team_id)?.name ?? titleOf(m)}
                  value={e}
                  locked={locked}
                  onChange={(patch) => setEval(m.id, patch)}
                />
              );
            })}
          </ul>
        )}
      </Panel>

      {!locked && (
        <div className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-[var(--p-line-strong)] bg-[#0b3228] p-2 shadow-[0_14px_40px_-12px_rgb(0_0_0/0.7)] lg:static lg:mx-0 lg:max-w-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <span className="min-w-0 flex-1 truncate px-2 text-xs text-[var(--p-dim)]">
            {save.isPending
              ? "جاري الحفظ…"
              : savedAt
                ? "انحفظت المسودة"
                : report
                  ? `آخر حفظ ${relativeTime(report.updated_at)}`
                  : "يتحفظ تلقائيًا"}
          </span>
          <button
            type="button"
            className="p-btn-ghost hidden h-11 lg:inline-flex"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { committeeId, week, fields, evaluations: evalList(), submit: false },
                {
                  onSuccess: () => {
                    setSavedAt(Date.now());
                    toast.success("انحفظت المسودة");
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                },
              )
            }
          >
            <Save className="size-4" /> حفظ مسودة
          </button>
          <button
            type="button"
            className="p-btn h-11 shrink-0"
            onClick={submit}
            disabled={save.isPending}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            أرسل للجودة
          </button>
        </div>
      )}
    </div>
  );
}

function pick(r: CommitteeReport): ReportFields {
  return {
    done: r.done,
    next_plan: r.next_plan,
    challenges: r.challenges,
    support: r.support,
    link: r.link,
    self_score: r.self_score,
  };
}

function StatusBanner({ report, daysLeft }: { report: CommitteeReport | null; daysLeft: number }) {
  const { dir } = useDirectory();
  if (report?.status === "returned")
    return (
      <Banner tone="bad" icon={MessageSquareWarning} title="رجّعت لجنة الجودة التقرير للتعديل">
        «{report.quality_note}» · {dir?.member(report.reviewed_by)?.full_name ?? ""}
      </Banner>
    );
  if (report?.status === "reviewed")
    return (
      <Banner tone="ok" icon={CheckCircle2} title="راجعت لجنة الجودة تقريركم">
        <span className="inline-flex items-center gap-2">
          <Stars size="sm" value={report.quality_score} label="تقييم الجودة" />
          {report.quality_note && <span>«{report.quality_note}»</span>}
        </span>
      </Banner>
    );
  if (report?.status === "submitted")
    return (
      <Banner tone="gold" icon={Send} title="انرسل التقرير">
        {report.submitted_at
          ? `أرسلته ${relativeTime(report.submitted_at)}، بانتظار مراجعة لجنة الجودة`
          : ""}
      </Banner>
    );
  if (daysLeft < 0)
    return (
      <Banner tone="bad" icon={AlarmClock} title="فات موعد هذا التقرير">
        تقدر ترسله الحين، بس بيظهر للجودة إنه متأخر
      </Banner>
    );
  return (
    <Banner
      tone="soft"
      icon={AlarmClock}
      title={
        daysLeft === 0
          ? "آخر يوم لإرسال التقرير اليوم"
          : daysLeft === 1
            ? "باقي يوم على موعد التقرير"
            : daysLeft === 2
              ? "باقي يومين على موعد التقرير"
              : `باقي ${daysLeft} ${daysLeft < 11 ? "أيام" : "يوم"} على موعد التقرير`
      }
    >
      الموعد نهاية يوم السبت · المسودة تنحفظ تلقائيًا وأنت تكتب
    </Banner>
  );
}

function Banner({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "ok" | "bad" | "gold" | "soft";
  icon: typeof Check;
  title: string;
  children: ReactNode;
}) {
  const c = {
    ok: "border-[rgb(143_217_179/0.3)] bg-[rgb(143_217_179/0.07)] text-[var(--p-ok)]",
    bad: "border-[rgb(242_165_142/0.3)] bg-[rgb(242_165_142/0.07)] text-[var(--p-bad)]",
    gold: "border-[rgb(198_164_92/0.3)] bg-[rgb(198_164_92/0.07)] text-[var(--p-gold-soft)]",
    soft: "border-[var(--p-line)] bg-[rgb(200_222_211/0.04)] text-[var(--p-soft)]",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", c)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 text-sm">
        <b className="block text-[var(--p-text)]">{title}</b>
        <span className="text-[13px] leading-6 text-[var(--p-soft)]">{children}</span>
      </div>
    </motion.div>
  );
}

function EvalRow({
  name,
  sub,
  value,
  locked,
  onChange,
}: {
  name: string;
  sub: string;
  value: MemberEvaluation | undefined;
  locked: boolean;
  onChange: (patch: Partial<MemberEvaluation>) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(!!value?.note);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Avatar name={name} size={34} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-sm">{name}</b>
          <span className="block truncate text-[11px] text-[var(--p-dim)]">{sub}</span>
        </span>
        <div className="flex w-full items-center justify-between gap-1 sm:w-auto">
          <Stars
            size="sm"
            label={`تقييم ${name}`}
            value={value?.score ?? null}
            onChange={locked ? undefined : (v) => onChange({ score: v })}
          />
          <div className="flex items-center">
            <button
              type="button"
              disabled={locked}
              aria-pressed={!!value?.standout}
              aria-label={`${name} متميز هالأسبوع`}
              onClick={() => onChange({ standout: !value?.standout })}
              className={cn(
                "grid size-9 place-items-center rounded-xl transition-colors active:scale-90",
                value?.standout
                  ? "bg-[rgb(198_164_92/0.16)] text-[var(--p-gold)]"
                  : "text-[var(--p-dim)]",
              )}
            >
              <Sparkles className="size-4" />
            </button>
            {!locked && (
              <button
                type="button"
                onClick={() => setNoteOpen((v) => !v)}
                aria-label={`ملاحظة عن ${name}`}
                aria-expanded={noteOpen}
                className={cn(
                  "grid size-9 place-items-center rounded-xl text-[var(--p-dim)] active:scale-90",
                  noteOpen && "text-[var(--p-text)]",
                )}
              >
                <FileText className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {(noteOpen || (locked && value?.note)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {locked ? (
              <p className="mt-2 rounded-xl bg-[rgb(200_222_211/0.05)] px-3 py-2 text-[13px] leading-6 text-[var(--p-soft)]">
                {value?.note}
              </p>
            ) : (
              <input
                className="p-input mt-2 h-10 text-sm"
                placeholder="ملاحظة قصيرة (اختياري)"
                maxLength={500}
                value={value?.note ?? ""}
                onChange={(e) => onChange({ note: e.target.value })}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/* ───────────────────────── quality: weekly board ───────────────────────── */

function Board({
  week,
  open,
  onOpen,
}: {
  week: string;
  open?: string | undefined;
  onOpen: (committee: string | undefined) => void;
}) {
  const me = useMe();
  const { dir } = useDirectory();
  const q = useReports(week, week);
  const { remind } = useReportActions();
  if (q.isLoading || !dir) return <PageSkeleton />;
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  const byCommittee = new Map((q.data ?? []).map((r) => [r.committee_id, r]));
  const committees = dir.committees;
  const sentN = committees.filter((c) => sent(byCommittee.get(c.id))).length;
  const waiting = committees.filter((c) => byCommittee.get(c.id)?.status === "submitted").length;
  const reviewed = committees.filter((c) => byCommittee.get(c.id)?.status === "reviewed").length;
  const missing = committees.length - sentN;
  const openReport = open ? byCommittee.get(open) : undefined;
  const isPast = addDays(week, 6) < todayISO();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "وصلت", v: `${sentN}/${committees.length}`, tone: "text-[var(--p-text)]" },
          { k: "تنتظر مراجعتك", v: waiting, tone: "text-[var(--p-gold-soft)]" },
          { k: "تمت مراجعتها", v: reviewed, tone: "text-[var(--p-ok)]" },
        ].map((x, i) => (
          <motion.div
            key={x.k}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-card px-3 py-3 text-center"
          >
            <b className={cn("block font-display text-2xl font-extrabold", x.tone)}>{x.v}</b>
            <span className="text-[11px] text-[var(--p-dim)]">{x.k}</span>
          </motion.div>
        ))}
      </div>
      {missing > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--p-line)] px-4 py-3">
          <CircleDashed className="size-5 shrink-0 text-[var(--p-dim)]" />
          <span className="min-w-0 flex-1 text-sm">
            {missing} {missing > 2 && missing < 11 ? "لجان" : "لجنة"} ما أرسلت{" "}
            {isPast ? "وفات الموعد" : "للحين"}
          </span>
          <button
            type="button"
            className="p-btn-ghost h-10 shrink-0"
            disabled={remind.isPending}
            onClick={() =>
              remind.mutate(week, {
                onSuccess: (n) =>
                  toast.success(n ? `ذكّرت ${n} من قادة اللجان` : "كل اللجان أرسلت"),
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          >
            <BellRing className="size-4" /> ذكّرهم
          </button>
        </div>
      )}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {committees.map((c, i) => {
          const r = byCommittee.get(c.id);
          const st: ReportStatus | "none" = r?.status ?? "none";
          const canOpen = !!r && r.status !== "draft";
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, ease: EASE }}
            >
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => onOpen(c.id)}
                className="p-card flex w-full items-center gap-3 p-4 text-start disabled:cursor-default"
              >
                <span
                  className="h-10 w-1.5 shrink-0 rounded-full"
                  style={{ background: c.accent }}
                />
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{c.title}</b>
                  <span className="block truncate text-xs text-[var(--p-dim)]">
                    {r && sent(r)
                      ? `${dir.member(r.author_id)?.full_name ?? ""} · ${relativeTime(r.submitted_at!)}${late(r) ? " · متأخر" : ""}`
                      : r?.status === "returned"
                        ? "رجع لهم للتعديل"
                        : r?.status === "draft"
                          ? "يكتبون التقرير"
                          : "ما بدأوا"}
                  </span>
                </span>
                {r?.status === "reviewed" ? (
                  <Stars size="sm" value={r.quality_score} label="تقييم الجودة" />
                ) : (
                  <Chip tone={STATUS[st].tone}>{STATUS[st].label}</Chip>
                )}
                {canOpen && <ChevronLeft className="size-4 shrink-0 text-[var(--p-dim)]" />}
              </button>
            </motion.li>
          );
        })}
      </ul>
      <ReportSheet
        report={openReport && openReport.status !== "draft" ? openReport : undefined}
        canReview={!!openReport && canReviewReport(me, openReport)}
        onClose={() => onOpen(undefined)}
      />
    </div>
  );
}

function ReportSheet({
  report,
  canReview,
  onClose,
}: {
  report: CommitteeReport | undefined;
  canReview: boolean;
  onClose: () => void;
}) {
  const { dir } = useDirectory();
  const { review } = useReportActions();
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    setScore(report?.quality_score ?? null);
    setNote(report?.status === "reviewed" ? report.quality_note : "");
    setReturning(false);
  }, [report?.id, report?.quality_score, report?.quality_note, report?.status]);
  const c = dir?.committee(report?.committee_id);
  const evals = (report?.evaluations ?? []).filter((e) => e.score != null || e.standout || e.note);
  const avg = evals.filter((e) => e.score != null);

  async function act(action: "review" | "return") {
    if (!report) return;
    try {
      await review.mutateAsync({
        id: report.id,
        action,
        score: action === "review" ? score : null,
        note,
      });
      toast.success(
        action === "review" ? "انحفظت المراجعة ووصل إشعار للجنة" : "رجع التقرير لهم مع ملاحظتك",
      );
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-2xl">
        {report && (
          <div className="space-y-5">
            <DialogHeader className="text-start sm:text-start">
              <DialogTitle className="font-display text-xl">{c?.title ?? "تقرير"}</DialogTitle>
              <DialogDescription className="text-[var(--p-soft)]">
                {weekLabel(report.week_start)} · {dir?.member(report.author_id)?.full_name ?? ""}
                {report.submitted_at ? ` · ${relativeTime(report.submitted_at)}` : ""}
                {late(report) ? " · متأخر" : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--p-line)] px-3 py-2">
              <span className="text-sm text-[var(--p-soft)]">تقييمهم لأسبوعهم</span>
              <Stars size="sm" value={report.self_score} label="تقييم اللجنة لأسبوعها" />
            </div>
            {(
              [
                ["الإنجازات", report.done],
                ["خطة الأسبوع الجاي", report.next_plan],
                ["التحديات", report.challenges],
                ["يحتاجون دعم في", report.support],
              ] as const
            ).map(([k, v]) =>
              v ? (
                <section key={k}>
                  <h3 className="mb-1 text-xs font-bold text-[var(--p-gold-soft)]">{k}</h3>
                  <p className="whitespace-pre-line text-sm leading-7" dir="auto">
                    {v}
                  </p>
                </section>
              ) : null,
            )}
            {report.link && (
              <a
                href={report.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--p-gold-soft)] hover:underline"
                dir="ltr"
              >
                <ExternalLink className="size-4" />{" "}
                {report.link.replace(/^https?:\/\//, "").slice(0, 40)}
              </a>
            )}
            <section>
              <h3 className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--p-gold-soft)]">
                <span>تقييم الأعضاء ({avg.length})</span>
                {avg.length > 0 && (
                  <span className="text-[var(--p-soft)]">
                    المتوسط {(avg.reduce((a, e) => a + (e.score ?? 0), 0) / avg.length).toFixed(1)}
                  </span>
                )}
              </h3>
              {evals.length === 0 ? (
                <p className="text-sm text-[var(--p-dim)]">ما قيّموا الأعضاء هالأسبوع</p>
              ) : (
                <ul className="divide-y divide-[var(--p-line)] rounded-2xl border border-[var(--p-line)]">
                  {evals
                    .slice()
                    .sort(
                      (a, b) =>
                        Number(b.standout) - Number(a.standout) || (b.score ?? 0) - (a.score ?? 0),
                    )
                    .map((e) => (
                      <li key={e.member_id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {dir?.member(e.member_id)?.full_name ?? "عضو"}
                          {e.standout && (
                            <Sparkles className="ms-1 inline size-3.5 text-[var(--p-gold)]" />
                          )}
                        </span>
                        <Stars size="sm" value={e.score} label="التقييم" />
                        {e.note && (
                          <p className="w-full text-xs leading-5 text-[var(--p-dim)]">{e.note}</p>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>

            {canReview && (
              <section className="space-y-3 rounded-2xl border border-[rgb(198_164_92/0.3)] p-4">
                <div className="flex items-center justify-between">
                  <b className="text-sm">{returning ? "ترجيع للتعديل" : "مراجعة لجنة الجودة"}</b>
                  {!returning && (
                    <Stars value={score} onChange={setScore} label="تقييم الجودة للتقرير" />
                  )}
                </div>
                <textarea
                  className="p-input min-h-20 resize-y"
                  placeholder={returning ? "وش المطلوب يعدلونه؟" : "ملاحظة للجنة (اختياري)"}
                  value={note}
                  maxLength={1500}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                  {returning ? (
                    <>
                      <button
                        type="button"
                        className="p-btn flex-1"
                        disabled={review.isPending || note.trim().length < 3}
                        onClick={() => act("return")}
                      >
                        <Undo2 className="size-4" /> رجّعه لهم
                      </button>
                      <button
                        type="button"
                        className="p-btn-ghost h-11"
                        onClick={() => setReturning(false)}
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="p-btn flex-1"
                        disabled={review.isPending || score == null}
                        onClick={() => act("review")}
                      >
                        {review.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {report.status === "reviewed" ? "حدّث المراجعة" : "اعتمد المراجعة"}
                      </button>
                      <button
                        type="button"
                        className="p-btn-ghost h-11"
                        onClick={() => setReturning(true)}
                      >
                        <Undo2 className="size-4" /> للتعديل
                      </button>
                    </>
                  )}
                </div>
              </section>
            )}
            {!canReview && report.status === "reviewed" && (
              <div className="rounded-2xl border border-[rgb(143_217_179/0.3)] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <b>مراجعة الجودة</b>
                  <Stars size="sm" value={report.quality_score} label="تقييم الجودة" />
                </div>
                {report.quality_note && (
                  <p className="mt-1 text-[var(--p-soft)]">{report.quality_note}</p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── monthly ───────────────────────── */

const MONTHLY_EMPTY: MonthlyFields = {
  summary: "",
  highlights: "",
  issues: "",
  recommendations: "",
  committee_notes: {},
};

function Monthly({ month, onMonth }: { month: string; onMonth: (m: string) => void }) {
  const me = useMe();
  const { dir } = useDirectory();
  const writer = canWriteMonthly(me);
  const list = useMonthlyReports(true);
  const overview = useMonthlyOverview(month, inQuality(me) || isLeadership(me));
  const { saveMonthly } = useReportActions();
  const report = list.data?.find((r) => r.month === month);
  const [f, setF] = useState<MonthlyFields>(MONTHLY_EMPTY);
  const [edit, setEdit] = useState(false);
  useEffect(() => {
    setF(report ? { ...report } : MONTHLY_EMPTY);
    setEdit(!report || report.status === "draft");
  }, [report?.id, report?.updated_at, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const rows = overview.data ?? [];
  const totals = {
    sent: rows.reduce((a, r) => a + r.sent, 0),
    expected: rows.reduce((a, r) => a + r.weeks, 0),
    onTime: rows.reduce((a, r) => a + r.on_time, 0),
    hours: rows.reduce((a, r) => a + r.hours, 0),
  };

  async function persist(publish: boolean) {
    try {
      await saveMonthly.mutateAsync({ month, fields: f, publish });
      if (publish) {
        celebrate();
        toast.success("نُشر التقرير ووصل لقيادة المبادرة");
        setEdit(false);
      } else toast.success("انحفظت المسودة");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const draftFill = () => {
    // A starting draft from the numbers, for the quality heads to rewrite.
    const best = [...rows]
      .filter((r) => r.quality_avg != null)
      .sort((a, b) => (b.quality_avg ?? 0) - (a.quality_avg ?? 0))[0];
    const lateC = rows
      .filter((r) => r.sent < r.weeks)
      .map((r) => dir?.committee(r.committee_id)?.name ?? r.committee_id);
    setF((x) => ({
      ...x,
      summary:
        x.summary ||
        `وصلنا ${totals.sent} تقرير أسبوعي من ${totals.expected} متوقع، ${totals.onTime} منها في الموعد. مجموع ساعات الأعضاء ${fmt(totals.hours)} ساعة`,
      highlights:
        x.highlights ||
        (best
          ? `أعلى تقييم جودة: ${dir?.committee(best.committee_id)?.name} (${best.quality_avg})`
          : ""),
      issues: x.issues || (lateC.length ? `تقارير ناقصة من: ${lateC.join("، ")}` : ""),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {months.map((m) => {
          const r = list.data?.find((x) => x.month === m);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={m === month}
              onClick={() => onMonth(m)}
              className={cn(
                "shrink-0 rounded-2xl border px-3.5 py-2 text-start transition-colors",
                m === month
                  ? "border-transparent bg-[var(--p-soft)] text-[var(--p-bg)]"
                  : "border-[var(--p-line-strong)] text-[var(--p-soft)]",
              )}
            >
              <b className="block text-[13px]">{monthLabel(m)}</b>
              <span className="text-[11px] opacity-75">
                {r ? (r.status === "published" ? "منشور" : "مسودة") : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {overview.isLoading ? (
        <PageSkeleton />
      ) : overview.isError ? (
        <ErrorState onRetry={() => void overview.refetch()} />
      ) : (
        <Panel title="أرقام الشهر">
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { k: "تقرير وصل", v: `${totals.sent}/${totals.expected}` },
              { k: "في الموعد", v: totals.onTime },
              { k: "ساعة تطوعية", v: fmt(totals.hours) },
            ].map((x) => (
              <div key={x.k} className="p-well px-2 py-3 text-center">
                <b className="block font-display text-xl font-extrabold text-[var(--p-gold-soft)]">
                  {x.v}
                </b>
                <span className="text-[11px] text-[var(--p-dim)]">{x.k}</span>
              </div>
            ))}
          </div>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-[11px] text-[var(--p-dim)]">
                <tr>
                  <th className="px-2 py-2 text-start font-bold">اللجنة</th>
                  <th className="px-2 py-2 text-center font-bold">التقارير</th>
                  <th className="px-2 py-2 text-center font-bold">تقييم الجودة</th>
                  <th className="px-2 py-2 text-center font-bold">تقييم الأعضاء</th>
                  <th className="px-2 py-2 text-center font-bold">الساعات</th>
                  <th className="px-2 py-2 text-center font-bold">متميزون</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = dir?.committee(r.committee_id);
                  return (
                    <tr key={r.committee_id} className="border-t border-[var(--p-line)]">
                      <td className="px-2 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ background: c?.accent }} />
                          {c?.name ?? r.committee_id}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2.5 text-center",
                          r.sent < r.weeks && "text-[var(--p-bad)]",
                        )}
                      >
                        {r.sent}/{r.weeks}
                      </td>
                      <td className="px-2 py-2.5 text-center">{r.quality_avg ?? "–"}</td>
                      <td className="px-2 py-2.5 text-center">{r.members_avg ?? "–"}</td>
                      <td className="px-2 py-2.5 text-center">{fmt(r.hours)}</td>
                      <td className="px-2 py-2.5 text-center">{r.standouts.length || "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {list.isLoading ? null : !writer && !report ? (
        <EmptyState
          icon={FileText}
          title="ما نُشر تقرير هذا الشهر للحين"
          body="أول ما تنشره لجنة الجودة بيوصلك إشعار"
        />
      ) : edit && writer ? (
        <Panel
          title="التقرير"
          action={
            <button
              type="button"
              className="text-xs font-bold text-[var(--p-gold-soft)]"
              onClick={draftFill}
            >
              <Sparkles className="me-1 inline size-3.5" /> ابدأ من الأرقام
            </button>
          }
        >
          <div className="space-y-4">
            {(
              [
                ["summary", "الملخص العام", true],
                ["highlights", "أبرز الإنجازات", false],
                ["issues", "الملاحظات والتحديات", false],
                ["recommendations", "التوصيات لقيادة المبادرة", false],
              ] as const
            ).map(([k, label, req]) => (
              <Field key={k} label={label} required={req}>
                <textarea
                  className="p-input min-h-24 resize-y"
                  value={f[k]}
                  maxLength={6000}
                  onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
                />
              </Field>
            ))}
            <details className="rounded-2xl border border-[var(--p-line)] p-3">
              <summary className="cursor-pointer text-sm font-bold">
                ملاحظة لكل لجنة (اختياري)
              </summary>
              <div className="mt-3 space-y-3">
                {dir?.committees.map((c) => (
                  <Field key={c.id} label={c.name}>
                    <input
                      className="p-input h-10"
                      value={f.committee_notes[c.id] ?? ""}
                      maxLength={1000}
                      onChange={(e) =>
                        setF((x) => ({
                          ...x,
                          committee_notes: { ...x.committee_notes, [c.id]: e.target.value },
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
            </details>
            <div className="flex flex-wrap gap-2">
              {report?.status !== "published" && (
                <button
                  type="button"
                  className="p-btn-ghost h-11"
                  disabled={saveMonthly.isPending}
                  onClick={() => persist(false)}
                >
                  <Save className="size-4" /> حفظ مسودة
                </button>
              )}
              <button
                type="button"
                className="p-btn flex-1"
                disabled={saveMonthly.isPending || f.summary.trim().length < 10}
                onClick={() => persist(true)}
              >
                {saveMonthly.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {report?.status === "published" ? "حدّث المنشور" : "انشر لقيادة المبادرة"}
              </button>
            </div>
          </div>
        </Panel>
      ) : report ? (
        <Panel
          title={
            <h2 className="font-display text-lg font-bold">تقرير {monthLabel(report.month)}</h2>
          }
          action={
            <div className="flex gap-1">
              {writer && (
                <button
                  type="button"
                  className="p-btn-ghost h-9 text-sm"
                  onClick={() => setEdit(true)}
                >
                  تعديل
                </button>
              )}
              <button
                type="button"
                className="p-btn-ghost h-9 text-sm"
                onClick={() => window.print()}
                aria-label="طباعة"
              >
                <Printer className="size-4" />
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <p className="text-xs text-[var(--p-dim)]">
              {report.status === "published" && report.published_at
                ? `نُشر ${relativeTime(report.published_at)}`
                : "مسودة"}{" "}
              · {dir?.member(report.author_id)?.full_name ?? ""}
            </p>
            {(
              [
                ["الملخص العام", report.summary],
                ["أبرز الإنجازات", report.highlights],
                ["الملاحظات والتحديات", report.issues],
                ["التوصيات", report.recommendations],
              ] as const
            ).map(([k, v]) =>
              v ? (
                <section key={k}>
                  <h3 className="mb-1 text-sm font-bold text-[var(--p-gold-soft)]">{k}</h3>
                  <p className="whitespace-pre-line leading-8" dir="auto">
                    {v}
                  </p>
                </section>
              ) : null,
            )}
            {Object.entries(report.committee_notes).some(([, v]) => v) && (
              <section>
                <h3 className="mb-2 text-sm font-bold text-[var(--p-gold-soft)]">ملاحظات اللجان</h3>
                <ul className="space-y-2">
                  {Object.entries(report.committee_notes)
                    .filter(([, v]) => v)
                    .map(([id, v]) => (
                      <li key={id} className="p-well px-3 py-2 text-sm">
                        <b>{dir?.committee(id)?.name ?? id}:</b> {v}
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
