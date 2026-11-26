import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Download,
  EyeOff,
  GripVertical,
  Loader2,
  Lock,
  Plus,
  Send,
  Star,
  Trash2,
  Unlock,
  Vote,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { relativeTime, shortDate } from "@/lib/portal/dates";
import { errorMessage } from "@/lib/portal/errors";
import {
  canCreateSurveys,
  canManageProject,
  hasCap,
  headsCommittee,
  inSurveyAudience,
} from "@/lib/portal/permissions";
import {
  useDirectory,
  useProjects,
  useSurveyActions,
  useSurveyResults,
  useSurveys,
} from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type {
  Answers,
  NewSurvey,
  QuestionType,
  SurveyAudience,
  SurveyListItem,
  SurveyQuestion,
} from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { celebrate } from "./Achievements";
import { PSelect } from "./PSelect";
import {
  Chip,
  EASE,
  EmptyState,
  ErrorState,
  Meter,
  PageHeader,
  PageSkeleton,
  Panel,
  Rise,
  Segmented,
  fmt,
  itemVariants,
  listVariants,
} from "./ui";

const TYPES: { id: QuestionType; label: string }[] = [
  { id: "single", label: "اختيار واحد" },
  { id: "multi", label: "اختيارات متعددة" },
  { id: "rating", label: "تقييم من ٥" },
  { id: "short", label: "إجابة قصيرة" },
  { id: "long", label: "إجابة طويلة" },
];

const isOpen = (s: SurveyListItem) =>
  s.status === "open" && (!s.deadline || new Date(s.deadline).getTime() > Date.now());

function audienceText(
  s: Pick<SurveyListItem, "audience" | "committee_id" | "project_id">,
  names: {
    committee: (id: string | null) => string | undefined;
    project: (id: string | null) => string | undefined;
  },
) {
  if (s.audience === "all") return "لكل الأعضاء";
  if (s.audience === "leaders") return "للقادة";
  if (s.audience === "committee") return names.committee(s.committee_id) ?? "للجنة";
  return names.project(s.project_id) ? `مشروع ${names.project(s.project_id)}` : "لفريق مشروع";
}

function useNames() {
  const { dir } = useDirectory();
  const { data: projects } = useProjects();
  return {
    committee: (id: string | null) => dir?.committee(id)?.title,
    project: (id: string | null) => projects?.find((p) => p.id === id)?.name,
  };
}

/* ───────────────────────── list ───────────────────────── */

type Tab = "todo" | "done" | "manage";

export function SurveysPage() {
  const me = useMe();
  const surveys = useSurveys();
  const names = useNames();
  const [builder, setBuilder] = useState(false);
  const list = surveys.data ?? [];
  const todo = list.filter((s) => isOpen(s) && !s.mine?.submitted_at && inSurveyAudience(me, s));
  const done = list.filter((s) => s.mine?.submitted_at);
  const managed = list.filter((s) => s.can_manage);
  const [tab, setTab] = useState<Tab>("todo");

  if (surveys.isLoading) return <PageSkeleton />;
  if (surveys.isError) return <ErrorState onRetry={() => void surveys.refetch()} />;

  const shown = tab === "todo" ? todo : tab === "done" ? done : managed;
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Vote}
        title="الاستبيانات"
        subtitle="رأيك يصنع الفرق في إثمار"
        actions={
          canCreateSurveys(me) && (
            <button type="button" className="p-btn" onClick={() => setBuilder(true)}>
              <Plus className="size-4" /> استبيان جديد
            </button>
          )
        }
      />
      <Segmented<Tab>
        id="survey-tabs"
        value={tab}
        onChange={setTab}
        options={[
          { value: "todo", label: `تنتظرك${todo.length ? ` (${todo.length})` : ""}` },
          { value: "done", label: "جاوبتها" },
          ...(managed.length
            ? [{ value: "manage" as const, label: `أديرها (${managed.length})` }]
            : []),
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState
          icon={tab === "todo" ? CheckCircle2 : ClipboardList}
          title={
            tab === "todo"
              ? "ما فيه استبيانات تنتظرك"
              : tab === "done"
                ? "ما جاوبت أي استبيان للحين"
                : "ما عندك استبيانات"
          }
          body={tab === "todo" ? "أول ما ينزل استبيان يخصك بيوصلك إشعار" : undefined}
        />
      ) : (
        <motion.ul
          key={tab}
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="grid gap-3 md:grid-cols-2"
        >
          {shown.map((s) => (
            <motion.li key={s.id} variants={itemVariants}>
              <SurveyCard s={s} audience={audienceText(s, names)} managing={tab === "manage"} />
            </motion.li>
          ))}
        </motion.ul>
      )}
      <SurveyBuilder open={builder} onOpenChange={setBuilder} />
    </div>
  );
}

function SurveyCard({
  s,
  audience,
  managing,
}: {
  s: SurveyListItem;
  audience: string;
  managing: boolean;
}) {
  const open = isOpen(s);
  const pct = s.audience_size ? ((s.submitted ?? 0) / s.audience_size) * 100 : 0;
  return (
    <Link
      to="/portal/surveys/$id"
      params={{ id: s.id }}
      className="p-card group flex h-full flex-col gap-3 p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[rgb(198_164_92/0.35)]"
    >
      <div className="flex flex-wrap gap-1.5">
        <Chip tone={open ? "gold" : "dim"}>{open ? "مفتوح" : "مغلق"}</Chip>
        <Chip tone="dim">{audience}</Chip>
        {s.anonymous && (
          <Chip tone="soft">
            <EyeOff className="size-3" /> بدون أسماء
          </Chip>
        )}
        {s.mine?.submitted_at && (
          <Chip tone="ok">
            <Check className="size-3" /> جاوبت
          </Chip>
        )}
      </div>
      <div>
        <h2 className="font-display text-lg font-extrabold">{s.title}</h2>
        {s.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--p-soft)]">
            {s.description}
          </p>
        )}
      </div>
      <div className="mt-auto space-y-2">
        {managing && s.audience_size !== null && (
          <>
            <div className="flex justify-between text-xs text-[var(--p-dim)]">
              <span>
                {fmt(s.submitted ?? 0)} من {fmt(s.audience_size)} جاوبوا
              </span>
              <span>{Math.round(pct)}٪</span>
            </div>
            <Meter value={pct} />
          </>
        )}
        <div className="flex items-center justify-between text-xs text-[var(--p-dim)]">
          <span>
            {s.questions.length}{" "}
            {s.questions.length > 2 && s.questions.length < 11 ? "أسئلة" : "سؤال"}
            {s.deadline ? ` · ينتهي ${shortDate(s.deadline.slice(0, 10))}` : ""}
          </span>
          <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

/* ───────────────────────── builder ───────────────────────── */

const newId = () => Math.random().toString(36).slice(2, 9);
const blankQ = (type: QuestionType = "single"): SurveyQuestion => ({
  id: newId(),
  type,
  title: "",
  required: true,
  ...(type === "single" || type === "multi" ? { options: ["", ""] } : {}),
});

function SurveyBuilder({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const me = useMe();
  const { dir } = useDirectory();
  const { data: projects = [] } = useProjects();
  const { create } = useSurveyActions();
  const navigate = useNavigate();
  const anyCap = hasCap(me, "surveys");
  const myProjects = projects.filter((p) => canManageProject(me, p.id));
  const audiences: { value: SurveyAudience; label: string }[] = [
    ...(anyCap
      ? [
          { value: "all" as const, label: "كل الأعضاء" },
          { value: "leaders" as const, label: "القادة" },
        ]
      : []),
    ...(anyCap || me.committee_id ? [{ value: "committee" as const, label: "لجنة" }] : []),
    ...(myProjects.length ? [{ value: "project" as const, label: "فريق مشروع" }] : []),
  ];
  const committees = (dir?.committees ?? []).filter((c) => anyCap || headsCommittee(me, c.id));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<SurveyAudience>(audiences[0]?.value ?? "committee");
  const [committee, setCommittee] = useState(me.committee_id ?? committees[0]?.id ?? "");
  const [project, setProject] = useState(myProjects[0]?.id ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [qs, setQs] = useState<SurveyQuestion[]>([blankQ()]);
  const [tried, setTried] = useState(false);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (title.trim().length < 3) p.push("اكتب عنوان للاستبيان");
    if (!qs.length) p.push("أضف سؤال واحد على الأقل");
    qs.forEach((q, i) => {
      if (!q.title.trim()) p.push(`السؤال ${i + 1} بدون نص`);
      if (
        (q.type === "single" || q.type === "multi") &&
        (q.options ?? []).filter((o) => o.trim()).length < 2
      )
        p.push(`السؤال ${i + 1} يحتاج خيارين على الأقل`);
    });
    if (audience === "committee" && !committee) p.push("اختر اللجنة");
    if (audience === "project" && !project) p.push("اختر المشروع");
    return p;
  }, [title, qs, audience, committee, project]);

  const patch = (id: string, f: Partial<SurveyQuestion>) =>
    setQs((xs) => xs.map((q) => (q.id === id ? { ...q, ...f } : q)));

  async function submit() {
    setTried(true);
    if (problems.length) return;
    const body: NewSurvey = {
      title: title.trim(),
      description: description.trim(),
      audience,
      committee_id: audience === "committee" ? committee : null,
      project_id: audience === "project" ? project : null,
      anonymous,
      deadline: deadline ? new Date(deadline + "T23:59:00").toISOString() : null,
      questions: qs.map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title.trim(),
        required: !!q.required,
        ...(q.type === "single" || q.type === "multi"
          ? { options: (q.options ?? []).map((o) => o.trim()).filter(Boolean) }
          : {}),
      })),
    };
    try {
      const id = await create.mutateAsync(body);
      toast.success("نُشر الاستبيان", { description: "وصل إشعار للمعنيين" });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setQs([blankQ()]);
      setTried(false);
      void navigate({ to: "/portal/surveys/$id", params: { id } });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-2xl">
        <DialogHeader className="text-start sm:text-start">
          <DialogTitle className="font-display text-xl">استبيان جديد</DialogTitle>
          <DialogDescription className="text-[var(--p-soft)]">
            اسحب الأسئلة من المقبض لترتيبها
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            className="p-input text-lg font-bold"
            placeholder="عنوان الاستبيان"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="p-input min-h-16 resize-y"
            placeholder="وصف قصير (اختياري)"
            value={description}
            maxLength={600}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <PSelect
              label="لمن"
              value={audience}
              onChange={(v) => setAudience(v as SurveyAudience)}
              options={audiences}
            />
            {audience === "committee" && (
              <PSelect
                label="اللجنة"
                value={committee}
                onChange={setCommittee}
                options={committees.map((c) => ({ value: c.id, label: c.title }))}
              />
            )}
            {audience === "project" && (
              <PSelect
                label="المشروع"
                value={project}
                onChange={setProject}
                options={myProjects.map((p) => ({ value: p.id, label: p.name }))}
              />
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--p-line)] p-3 text-sm">
              <span>
                <b className="block">بدون أسماء</b>
                <span className="text-xs text-[var(--p-dim)]">النتائج ما تبيّن مين جاوب وش</span>
              </span>
              <input
                type="checkbox"
                className="size-5 accent-[var(--p-gold)]"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
            </label>
            <label className="block space-y-1 rounded-2xl border border-[var(--p-line)] p-3 text-sm">
              <b className="block">آخر موعد (اختياري)</b>
              <input
                type="date"
                dir="ltr"
                className="p-input h-9"
                value={deadline}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
          </div>

          <Reorder.Group axis="y" values={qs} onReorder={setQs} className="space-y-3">
            <AnimatePresence initial={false}>
              {qs.map((q, i) => (
                <Reorder.Item
                  key={q.id}
                  value={q}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="rounded-2xl border border-[var(--p-line-strong)] bg-[rgb(200_222_211/0.03)] p-3"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical
                      className="mt-3 size-4 shrink-0 cursor-grab text-[var(--p-dim)] active:cursor-grabbing"
                      aria-label="اسحب للترتيب"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          className="p-input flex-1"
                          placeholder={`السؤال ${i + 1}`}
                          value={q.title}
                          maxLength={300}
                          onChange={(e) => patch(q.id, { title: e.target.value })}
                          aria-invalid={tried && !q.title.trim()}
                        />
                        <div className="w-40 shrink-0">
                          <PSelect
                            label="نوع السؤال"
                            value={q.type}
                            onChange={(v) => {
                              const t = v as QuestionType;
                              patch(q.id, {
                                type: t,
                                options:
                                  t === "single" || t === "multi"
                                    ? q.options?.length
                                      ? q.options
                                      : ["", ""]
                                    : undefined,
                              });
                            }}
                            options={TYPES.map((t) => ({ value: t.id, label: t.label }))}
                          />
                        </div>
                      </div>
                      {(q.type === "single" || q.type === "multi") && (
                        <div className="space-y-1.5">
                          {(q.options ?? []).map((o, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "size-4 shrink-0 border border-[var(--p-line-strong)]",
                                  q.type === "single" ? "rounded-full" : "rounded",
                                )}
                              />
                              <input
                                className="p-input h-9 flex-1"
                                placeholder={`خيار ${oi + 1}`}
                                value={o}
                                maxLength={120}
                                onChange={(e) =>
                                  patch(q.id, {
                                    options: q.options!.map((x, xi) =>
                                      xi === oi ? e.target.value : x,
                                    ),
                                  })
                                }
                              />
                              {(q.options ?? []).length > 2 && (
                                <button
                                  type="button"
                                  className="text-[var(--p-dim)] hover:text-[var(--p-bad)]"
                                  onClick={() =>
                                    patch(q.id, {
                                      options: q.options!.filter((_, xi) => xi !== oi),
                                    })
                                  }
                                  aria-label="حذف الخيار"
                                >
                                  <X className="size-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          {(q.options ?? []).length < 12 && (
                            <button
                              type="button"
                              className="text-xs font-bold text-[var(--p-gold-soft)] hover:underline"
                              onClick={() => patch(q.id, { options: [...(q.options ?? []), ""] })}
                            >
                              + خيار
                            </button>
                          )}
                        </div>
                      )}
                      {q.type === "rating" && (
                        <div className="flex gap-1 text-[var(--p-dim)]">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className="size-5" />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--p-soft)]">
                          <input
                            type="checkbox"
                            className="accent-[var(--p-gold)]"
                            checked={!!q.required}
                            onChange={(e) => patch(q.id, { required: e.target.checked })}
                          />
                          إجباري
                        </label>
                        {qs.length > 1 && (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-[var(--p-dim)] hover:text-[var(--p-bad)]"
                            onClick={() => setQs((xs) => xs.filter((x) => x.id !== q.id))}
                          >
                            <Trash2 className="size-3.5" /> حذف
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
          {qs.length < 30 && (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--p-line-strong)] py-3 text-sm font-bold text-[var(--p-soft)] hover:border-[var(--p-gold)] hover:text-[var(--p-text)]"
              onClick={() => setQs((xs) => [...xs, blankQ()])}
            >
              <Plus className="size-4" /> سؤال
            </button>
          )}
          {tried && problems.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-[rgb(242_165_142/0.08)] p-3 text-xs text-[var(--p-bad)]">
              {problems.slice(0, 4).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="p-btn w-full"
            onClick={submit}
            disabled={create.isPending}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}{" "}
            نشر الاستبيان
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── single survey ───────────────────────── */

export function SurveyPage({ id }: { id: string }) {
  const me = useMe();
  const surveys = useSurveys();
  const names = useNames();
  const s = surveys.data?.find((x) => x.id === id);
  const [view, setView] = useState<"answer" | "results">("answer");
  const member = !!s && inSurveyAudience(me, s);
  useEffect(() => {
    if (s?.can_manage) setView("results");
  }, [s?.can_manage]);

  if (surveys.isLoading) return <PageSkeleton />;
  if (surveys.isError) return <ErrorState onRetry={() => void surveys.refetch()} />;
  if (!s)
    return (
      <EmptyState
        icon={Vote}
        title="ما لقينا الاستبيان"
        body="يمكن انحذف، أو ما هو موجه لك"
        action={
          <Link to="/portal/surveys" className="p-btn-ghost h-11">
            كل الاستبيانات
          </Link>
        }
      />
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/portal/surveys"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--p-dim)] hover:text-[var(--p-text)]"
      >
        <ArrowRight className="size-4" /> الاستبيانات
      </Link>
      <Rise>
        <header className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone={isOpen(s) ? "gold" : "dim"}>{isOpen(s) ? "مفتوح" : "مغلق"}</Chip>
            <Chip tone="dim">{audienceText(s, names)}</Chip>
            {s.anonymous && (
              <Chip tone="soft">
                <EyeOff className="size-3" /> بدون أسماء
              </Chip>
            )}
            {s.deadline && <Chip tone="dim">ينتهي {shortDate(s.deadline.slice(0, 10))}</Chip>}
          </div>
          <h1 className="font-display text-3xl font-extrabold">{s.title}</h1>
          {s.description && <p className="leading-8 text-[var(--p-soft)]">{s.description}</p>}
        </header>
      </Rise>
      {s.can_manage && (
        <Segmented
          id="survey-view"
          value={view}
          onChange={setView}
          options={[
            { value: "results", label: "النتائج" },
            { value: "answer", label: member ? "إجابتي" : "معاينة" },
          ]}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {view === "results" && s.can_manage ? (
            <Results s={s} />
          ) : (
            <Fill s={s} preview={!member} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function emptyAnswer(a: Answers[string] | undefined) {
  return (
    a === undefined ||
    a === null ||
    a === "" ||
    (Array.isArray(a) && a.length === 0) ||
    (typeof a === "string" && !a.trim())
  );
}

function Fill({ s, preview }: { s: SurveyListItem; preview: boolean }) {
  const { save } = useSurveyActions();
  const submitted = !!s.mine?.submitted_at;
  const locked = preview || submitted || !isOpen(s);
  const [answers, setAnswers] = useState<Answers>(s.mine?.answers ?? {});
  const [tried, setTried] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dirty = useRef(false);
  const answered = s.questions.filter((q) => !emptyAnswer(answers[q.id])).length;

  // Autosave a draft a moment after the member stops typing.
  useEffect(() => {
    if (locked || !dirty.current) return;
    const t = setTimeout(() => {
      save.mutate(
        { id: s.id, answers, submit: false },
        { onSuccess: () => setSavedAt(Date.now()) },
      );
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, locked, s.id]);

  const set = (qid: string, v: Answers[string]) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [qid]: v }));
  };

  async function submit() {
    setTried(true);
    const missing = s.questions.filter((q) => q.required && emptyAnswer(answers[q.id]));
    if (missing.length) {
      toast.error(
        `باقي ${missing.length} ${missing.length === 1 ? "سؤال إجباري" : "أسئلة إجبارية"}`,
      );
      document
        .getElementById(`q-${missing[0]!.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      await save.mutateAsync({ id: s.id, answers, submit: true });
      celebrate();
      toast.success("شكرًا لك! وصلت إجابتك");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (submitted && !preview)
    return (
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="p-card space-y-3 p-8 text-center"
      >
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="mx-auto grid size-16 place-items-center rounded-full bg-[rgb(143_217_179/0.14)] text-[var(--p-ok)]"
        >
          <Check className="size-8" />
        </motion.span>
        <h2 className="font-display text-2xl font-extrabold">وصلت إجابتك</h2>
        <p className="text-sm text-[var(--p-soft)]">
          جاوبت {relativeTime(s.mine!.submitted_at!)}. شكرًا إنك شاركتنا رأيك
        </p>
      </motion.div>
    );

  return (
    <div className="space-y-4">
      {!locked && (
        <div className="sticky top-[72px] z-10 rounded-2xl border border-[var(--p-line)] bg-[#08291f]/90 px-4 py-3 backdrop-blur">
          <div className="mb-1.5 flex justify-between text-xs text-[var(--p-dim)]">
            <span>
              جاوبت {answered} من {s.questions.length}
            </span>
            <AnimatePresence mode="wait">
              <motion.span key={savedAt ?? 0} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {save.isPending ? "جاري الحفظ…" : savedAt ? "انحفظت مسودتك" : ""}
              </motion.span>
            </AnimatePresence>
          </div>
          <Meter value={(answered / Math.max(1, s.questions.length)) * 100} />
        </div>
      )}
      {preview && (
        <p className="p-well px-4 py-3 text-center text-sm text-[var(--p-dim)]">
          هذي معاينة: الاستبيان مو موجه لك
        </p>
      )}
      {!preview && !isOpen(s) && (
        <p className="p-well flex items-center justify-center gap-2 px-4 py-3 text-sm text-[var(--p-dim)]">
          <Lock className="size-4" /> الاستبيان مغلق
        </p>
      )}
      {s.questions.map((q, i) => {
        const v = answers[q.id];
        const bad = tried && q.required && emptyAnswer(v);
        return (
          <motion.section
            key={q.id}
            id={`q-${q.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, ease: EASE }}
            className={cn("p-card space-y-3 p-5", bad && "border-[rgb(242_165_142/0.5)]")}
          >
            <h3 className="font-bold leading-7">
              <span className="me-2 text-[var(--p-gold-soft)]">{i + 1}.</span>
              {q.title}
              {q.required && <span className="ms-1 text-[var(--p-bad)]">*</span>}
            </h3>
            {q.type === "short" && (
              <input
                className="p-input"
                disabled={locked}
                value={(v as string) ?? ""}
                maxLength={300}
                onChange={(e) => set(q.id, e.target.value)}
              />
            )}
            {q.type === "long" && (
              <textarea
                className="p-input min-h-28 resize-y"
                disabled={locked}
                value={(v as string) ?? ""}
                maxLength={2000}
                onChange={(e) => set(q.id, e.target.value)}
              />
            )}
            {(q.type === "single" || q.type === "multi") && (
              <div className="grid gap-2">
                {(q.options ?? []).map((o) => {
                  const on = q.type === "single" ? v === o : Array.isArray(v) && v.includes(o);
                  return (
                    <motion.button
                      key={o}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      disabled={locked}
                      onClick={() => {
                        if (q.type === "single") set(q.id, on ? "" : o);
                        else {
                          const arr = Array.isArray(v) ? (v as string[]) : [];
                          set(q.id, on ? arr.filter((x) => x !== o) : [...arr, o]);
                        }
                      }}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-start text-sm transition-colors disabled:cursor-default",
                        on
                          ? "border-[var(--p-gold)] bg-[rgb(198_164_92/0.1)]"
                          : "border-[var(--p-line-strong)] hover:bg-[rgb(200_222_211/0.05)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center border",
                          q.type === "single" ? "rounded-full" : "rounded-md",
                          on
                            ? "border-transparent bg-[var(--p-gold)] text-[#1d1606]"
                            : "border-[var(--p-line-strong)]",
                        )}
                      >
                        {on && <Check className="size-3.5" />}
                      </span>
                      {o}
                    </motion.button>
                  );
                })}
              </div>
            )}
            {q.type === "rating" && (
              <div className="flex gap-1.5" role="radiogroup" aria-label={q.title}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = typeof v === "number" && v >= n;
                  return (
                    <motion.button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={v === n}
                      aria-label={`${n} من ٥`}
                      disabled={locked}
                      whileHover={locked ? {} : { scale: 1.15, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => set(q.id, n)}
                      className="p-1"
                    >
                      <Star
                        className={cn(
                          "size-8 transition-colors",
                          on
                            ? "fill-[var(--p-gold)] text-[var(--p-gold)]"
                            : "text-[var(--p-line-strong)]",
                        )}
                      />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.section>
        );
      })}
      {!locked && (
        <button type="button" className="p-btn w-full" onClick={submit} disabled={save.isPending}>
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}{" "}
          أرسل إجاباتي
        </button>
      )}
    </div>
  );
}

function Results({ s }: { s: SurveyListItem }) {
  const res = useSurveyResults(s.id, true);
  const { status, remove, remind } = useSurveyActions();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const responses = res.data?.responses ?? [];
  const total = res.data?.audience ?? 0;

  function exportCsv() {
    const head = [
      ...(s.anonymous ? [] : ["الاسم", "اللجنة", "وقت الإجابة"]),
      ...s.questions.map((q) => q.title),
    ];
    const cell = (x: unknown) => {
      const t = Array.isArray(x) ? x.join(" | ") : x == null ? "" : String(x);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const rows = responses.map((r) => [
      ...(s.anonymous ? [] : [r.name, r.committee, r.submitted_at]),
      ...s.questions.map((q) => r.answers[q.id]),
    ]);
    const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${s.title.slice(0, 40)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (res.isLoading) return <PageSkeleton />;
  if (res.isError) return <ErrorState onRetry={() => void res.refetch()} />;
  const pct = total ? (responses.length / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <b className="font-display text-3xl font-extrabold text-[var(--p-gold-soft)]">
              {fmt(responses.length)}
            </b>
            <span className="ms-2 text-sm text-[var(--p-dim)]">من {fmt(total)} جاوبوا</span>
            <Meter value={pct} className="mt-2" />
          </div>
          <div className="flex flex-wrap gap-2">
            {isOpen(s) && (
              <button
                type="button"
                className="p-btn-ghost h-10"
                disabled={remind.isPending}
                onClick={() =>
                  remind.mutate(s.id, {
                    onSuccess: (n) => toast.success(n ? `ذكّرت ${n} ما جاوبوا` : "الكل جاوب"),
                    onError: (e) => toast.error(errorMessage(e)),
                  })
                }
              >
                <BellRing className="size-4" /> ذكّر
              </button>
            )}
            <button
              type="button"
              className="p-btn-ghost h-10"
              onClick={exportCsv}
              disabled={!responses.length}
            >
              <Download className="size-4" /> CSV
            </button>
            <button
              type="button"
              className="p-btn-ghost h-10"
              onClick={() =>
                status.mutate(
                  { id: s.id, status: s.status === "open" ? "closed" : "open" },
                  {
                    onSuccess: () =>
                      toast(s.status === "open" ? "أُغلق الاستبيان" : "انفتح الاستبيان"),
                    onError: (e) => toast.error(errorMessage(e)),
                  },
                )
              }
            >
              {s.status === "open" ? <Lock className="size-4" /> : <Unlock className="size-4" />}
              {s.status === "open" ? "إغلاق" : "فتح"}
            </button>
            <button
              type="button"
              className="p-btn-ghost h-10 text-[var(--p-bad)]"
              onClick={() => setConfirmDelete(true)}
              aria-label="حذف الاستبيان"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </Panel>

      {s.questions.map((q, i) => (
        <QuestionResult key={q.id} index={i} q={q} responses={responses} anonymous={s.anonymous} />
      ))}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[#08291f]">
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle className="font-display text-xl">تحذف الاستبيان؟</AlertDialogTitle>
            <AlertDialogDescription className="leading-7 text-[var(--p-soft)]">
              بتنحذف معه كل الإجابات ({fmt(responses.length)}) وما يمديك ترجعها
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              className="p-btn bg-[var(--p-bad)] text-[#2a0d06] hover:bg-[var(--p-bad)]"
              onClick={() =>
                remove.mutate(s.id, {
                  onSuccess: () => {
                    toast("انحذف الاستبيان");
                    void navigate({ to: "/portal/surveys" });
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              احذف
            </AlertDialogAction>
            <AlertDialogCancel className="p-btn-ghost mt-0 h-11 bg-transparent">
              لا
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function QuestionResult({
  q,
  index,
  responses,
  anonymous,
}: {
  q: SurveyQuestion;
  index: number;
  responses: { name: string | null; answers: Answers }[];
  anonymous: boolean;
}) {
  const values = responses.map((r) => r.answers[q.id]).filter((v) => !emptyAnswer(v));
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05, ease: EASE }}
      className="p-card space-y-4 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold leading-7">
          <span className="me-2 text-[var(--p-gold-soft)]">{index + 1}.</span>
          {q.title}
        </h3>
        <span className="shrink-0 text-xs text-[var(--p-dim)]">{fmt(values.length)} إجابة</span>
      </div>
      {(q.type === "single" || q.type === "multi") && (
        <ul className="space-y-2.5">
          {(q.options ?? [])
            .map((o) => ({
              o,
              n: values.filter((v) => (Array.isArray(v) ? v.includes(o) : v === o)).length,
            }))
            .sort((a, b) => b.n - a.n)
            .map(({ o, n }, i) => {
              const pct = values.length ? (n / values.length) * 100 : 0;
              return (
                <li key={o}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span>{o}</span>
                    <span className="text-[var(--p-dim)]">
                      {fmt(n)} · {Math.round(pct)}٪
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[rgb(200_222_211/0.08)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: i === 0 && n > 0 ? "var(--p-gold)" : "var(--p-soft)",
                        transformOrigin: "right",
                      }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.06 }}
                    />
                  </div>
                </li>
              );
            })}
        </ul>
      )}
      {q.type === "rating" && <RatingResult values={values as number[]} />}
      {(q.type === "short" || q.type === "long") && (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {values.length === 0 && <li className="text-sm text-[var(--p-dim)]">ما فيه إجابات</li>}
          {responses
            .filter((r) => !emptyAnswer(r.answers[q.id]))
            .map((r, i) => (
              <li key={i} className="p-well px-4 py-3 text-sm leading-7">
                <p className="whitespace-pre-line" dir="auto">
                  {String(r.answers[q.id])}
                </p>
                {!anonymous && r.name && (
                  <span className="mt-1 block text-xs text-[var(--p-dim)]">{r.name}</span>
                )}
              </li>
            ))}
        </ul>
      )}
    </motion.section>
  );
}

function RatingResult({ values }: { values: number[] }) {
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => values.filter((v) => v === n).length));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="text-center">
        <b className="font-display text-4xl font-extrabold text-[var(--p-gold-soft)]">
          {avg ? avg.toFixed(1) : "–"}
        </b>
        <div className="mt-1 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "size-4",
                avg >= n - 0.25
                  ? "fill-[var(--p-gold)] text-[var(--p-gold)]"
                  : "text-[var(--p-line-strong)]",
              )}
            />
          ))}
        </div>
      </div>
      <div className="flex h-24 flex-1 items-end gap-2">
        {[1, 2, 3, 4, 5].map((n, i) => {
          const c = values.filter((v) => v === n).length;
          return (
            <div key={n} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] text-[var(--p-dim)]">{c}</span>
              <motion.div
                className="w-full rounded-t-lg bg-[var(--p-gold)]"
                style={{
                  transformOrigin: "bottom",
                  height: `${(c / max) * 64 + 4}px`,
                  opacity: 0.35 + (n / 5) * 0.65,
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.07 }}
              />
              <span className="text-xs">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
