import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarRange,
  Check,
  ChevronLeft,
  ClipboardList,
  Crown,
  FolderKanban,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Rocket,
  Target,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import ambassadors from "@/assets/proj-ambassadors.jpg";
import fintech from "@/assets/proj-fintech.jpg";
import impact from "@/assets/proj-impact.jpg";
import sessions from "@/assets/proj-sessions.jpg";
import visits from "@/assets/proj-visits.jpg";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dueLabel, relativeTime, shortDate, todayISO } from "@/lib/portal/dates";
import { errorMessage } from "@/lib/portal/errors";
import { canManageProject, canRunProjects } from "@/lib/portal/permissions";
import {
  useDirectory,
  useProjectActions,
  useProjects,
  useSurveys,
  useTasks,
} from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type { Project, ProjectFields, ProjectStage } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { CreateTaskButton } from "./CreateTaskDialog";
import { MemberPicker } from "./MemberPicker";
import {
  Avatar,
  Chip,
  EASE,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Panel,
  Rise,
  hoursLabel,
  itemVariants,
  listVariants,
} from "./ui";

const COVERS: Record<string, string> = { ambassadors, fintech, impact, sessions, visits };

export const STAGES: { id: ProjectStage; label: string; hint: string }[] = [
  { id: "planning", label: "تخطيط", hint: "نحدد الفكرة والهدف والفريق" },
  { id: "prep", label: "تجهيز", hint: "نجهز المحتوى والشركاء والموارد" },
  { id: "execution", label: "تنفيذ", hint: "المشروع شغال على أرض الواقع" },
  { id: "review", label: "تقييم", hint: "نقيس الأثر ونجمع الدروس" },
  { id: "done", label: "مكتمل", hint: "انتهى المشروع ووثّقنا نتائجه" },
];
const stageIndex = (s: ProjectStage) => STAGES.findIndex((x) => x.id === s);
const stageLabel = (s: ProjectStage) => STAGES[stageIndex(s)]?.label ?? s;

const BRIEF: { key: keyof ProjectFields; label: string; icon: typeof Target }[] = [
  { key: "situation", label: "الوضع الحالي", icon: MapPin },
  { key: "problem", label: "المشكلة", icon: ClipboardList },
  { key: "goal", label: "الهدف", icon: Target },
  { key: "success", label: "كيف نعرف إننا نجحنا؟", icon: Rocket },
];

/* ───────────────────────── list ───────────────────────── */

export function ProjectsPage() {
  const me = useMe();
  const projects = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  if (projects.isLoading) return <PageSkeleton />;
  if (projects.isError) return <ErrorState onRetry={() => void projects.refetch()} />;
  const list = projects.data ?? [];
  const mine = new Set(me.project_ids);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="المشاريع"
        subtitle="مشاريع إثمار ومرحلة كل مشروع وفريقه"
        actions={
          canRunProjects(me) && (
            <button type="button" className="p-btn" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> مشروع جديد
            </button>
          )
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={FolderKanban} title="ما فيه مشاريع للحين" />
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[...list]
            .sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)) || a.sort - b.sort)
            .map((p) => (
              <motion.li key={p.id} variants={itemVariants}>
                <ProjectCard p={p} mine={mine.has(p.id)} />
              </motion.li>
            ))}
        </motion.ul>
      )}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ProjectCard({ p, mine }: { p: Project; mine: boolean }) {
  const { dir } = useDirectory();
  const cover = COVERS[p.slug];
  const idx = stageIndex(p.stage);
  return (
    <Link
      to="/portal/projects/$id"
      params={{ id: p.id }}
      className="p-card group flex h-full flex-col overflow-hidden transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[rgb(198_164_92/0.35)]"
    >
      <div className="relative h-36 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="size-full bg-[radial-gradient(circle_at_30%_20%,#1c5a43,#08291f)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08291f] via-[#08291f]/40 to-transparent" />
        <div className="absolute top-3 start-3 flex gap-1.5">
          <Chip tone={p.stage === "done" ? "ok" : p.stage === "execution" ? "gold" : "soft"}>
            {stageLabel(p.stage)}
          </Chip>
          {mine && <Chip tone="gold">فريقي</Chip>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 pt-1">
        <div>
          <h2 className="font-display text-lg font-extrabold">{p.name}</h2>
          {p.tagline && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--p-soft)]">{p.tagline}</p>
          )}
        </div>
        <StageBar index={idx} compact />
        <div className="mt-auto flex items-center justify-between">
          <div className="flex -space-x-2 space-x-reverse">
            {p.members.slice(0, 5).map((x) => (
              <div key={x.member_id} className="rounded-full ring-2 ring-[#08291f]">
                <Avatar name={dir?.member(x.member_id)?.full_name ?? "؟"} size={28} />
              </div>
            ))}
            {p.members.length > 5 && (
              <span className="grid size-7 place-items-center rounded-full bg-[rgb(200_222_211/0.1)] text-[10px] font-bold ring-2 ring-[#08291f]">
                +{p.members.length - 5}
              </span>
            )}
          </div>
          <ChevronLeft className="size-5 text-[var(--p-dim)] transition-transform group-hover:-translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

/** Five-step stage indicator; fills with a spring. */
function StageBar({ index, compact }: { index: number; compact?: boolean }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`المرحلة ${index + 1} من ${STAGES.length}`}
    >
      {STAGES.map((s, i) => (
        <div key={s.id} className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(200_222_211/0.1)]">
            <motion.div
              className="h-full rounded-full bg-[var(--p-gold)]"
              style={{ transformOrigin: "right" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: i <= index ? 1 : 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.08 }}
            />
          </div>
          {!compact && (
            <span
              className={cn(
                "mt-1.5 block text-center text-[11px] font-bold",
                i === index
                  ? "text-[var(--p-gold-soft)]"
                  : i < index
                    ? "text-[var(--p-soft)]"
                    : "text-[var(--p-dim)]",
              )}
            >
              {s.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { create } = useProjectActions();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    try {
      await create.mutateAsync({ name: name.trim(), tagline: tagline.trim() });
      toast.success("انضاف المشروع", { description: "كمّل الموجز والفريق من صفحته" });
      setName("");
      setTagline("");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader className="text-start sm:text-start">
            <DialogTitle className="font-display text-xl">مشروع جديد</DialogTitle>
            <DialogDescription className="text-[var(--p-soft)]">
              يبدأ بمرحلة التخطيط
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-[var(--p-soft)]">الاسم</span>
            <input
              className="p-input"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-[var(--p-soft)]">سطر يعرّف بالمشروع</span>
            <input
              className="p-input"
              value={tagline}
              maxLength={160}
              onChange={(e) => setTagline(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="p-btn w-full"
            disabled={create.isPending || name.trim().length < 2}
          >
            {create.isPending && <Loader2 className="size-4 animate-spin" />} إنشاء
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── detail ───────────────────────── */

export function ProjectDetailPage({ id }: { id: string }) {
  const me = useMe();
  const { dir } = useDirectory();
  const projects = useProjects();
  const tasks = useTasks();
  const surveys = useSurveys();
  const [editOpen, setEditOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const p = projects.data?.find((x) => x.id === id);
  const today = todayISO();
  const ptasks = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((t) => t.project_id === id && t.status !== "cancelled")
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [tasks.data, id],
  );

  if (projects.isLoading) return <PageSkeleton />;
  if (projects.isError) return <ErrorState onRetry={() => void projects.refetch()} />;
  if (!p)
    return (
      <EmptyState
        icon={FolderKanban}
        title="ما لقينا المشروع"
        action={
          <Link to="/portal/projects" className="p-btn-ghost h-11">
            كل المشاريع
          </Link>
        }
      />
    );

  const manage = canManageProject(me, p.id);
  const idx = stageIndex(p.stage);
  const leads = p.members.filter((x) => x.is_lead);
  const crew = p.members.filter((x) => !x.is_lead);
  const cover = COVERS[p.slug];
  const psurveys = (surveys.data ?? []).filter((s) => s.project_id === p.id);

  return (
    <div className="space-y-6">
      <Link
        to="/portal/projects"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--p-dim)] hover:text-[var(--p-text)]"
      >
        <ArrowRight className="size-4" /> المشاريع
      </Link>

      <Rise>
        <section className="p-card relative overflow-hidden">
          <div className="absolute inset-0">
            {cover && <img src={cover} alt="" className="size-full object-cover opacity-30" />}
            <div className="absolute inset-0 bg-gradient-to-l from-[#08291f] via-[#08291f]/85 to-[#08291f]/60" />
          </div>
          <div className="relative space-y-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Chip tone="gold">{stageLabel(p.stage)}</Chip>
                <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{p.name}</h1>
                {p.tagline && (
                  <p className="max-w-2xl leading-8 text-[var(--p-soft)]">{p.tagline}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--p-dim)]">
                  {(p.starts_on || p.ends_on) && (
                    <span className="flex items-center gap-1.5">
                      <CalendarRange className="size-4" />
                      {p.starts_on ? shortDate(p.starts_on) : "؟"} ←{" "}
                      {p.ends_on ? shortDate(p.ends_on) : "؟"}
                    </span>
                  )}
                  {p.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" /> {p.location}
                    </span>
                  )}
                </div>
              </div>
              {manage && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="p-btn-ghost h-10"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="size-4" /> الموجز
                  </button>
                  <button type="button" className="p-btn h-10" onClick={() => setStageOpen(true)}>
                    <Rocket className="size-4" /> المرحلة
                  </button>
                </div>
              )}
            </div>
            <StageBar index={idx} />
          </div>
        </section>
      </Rise>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Rise delay={0.05}>
            <Panel title="موجز المشروع">
              <div className="grid gap-3 sm:grid-cols-2">
                {BRIEF.map((b, i) => {
                  const v = p[b.key] as string;
                  return (
                    <motion.div
                      key={b.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, ease: EASE }}
                      className="p-well p-4"
                    >
                      <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--p-gold-soft)]">
                        <b.icon className="size-4" /> {b.label}
                      </h3>
                      <p
                        className={cn(
                          "mt-2 whitespace-pre-line text-sm leading-7",
                          !v && "text-[var(--p-dim)]",
                        )}
                      >
                        {v || (manage ? "لسى ما انكتب، اضغط «الموجز» وأضفه" : "لسى ما انكتب")}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </Panel>
          </Rise>

          <Rise delay={0.1}>
            <Panel
              title="مهام المشروع"
              action={manage && <CreateTaskButton projectId={p.id} className="h-10" />}
            >
              {ptasks.length === 0 ? (
                <p className="p-well px-4 py-6 text-center text-sm text-[var(--p-dim)]">
                  ما فيه مهام للمشروع للحين
                </p>
              ) : (
                <ul className="space-y-2">
                  {ptasks.map((t) => {
                    const done = t.assignments.filter((a) => a.status === "approved").length;
                    return (
                      <li key={t.id}>
                        <Link
                          to="/portal/tasks"
                          search={{ task: t.id }}
                          className="p-well group flex items-center gap-3 px-4 py-3 transition-colors hover:border-[rgb(198_164_92/0.35)]"
                        >
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-xl",
                              t.status === "active"
                                ? "bg-[rgb(198_164_92/0.12)] text-[var(--p-gold-soft)]"
                                : "bg-[rgb(200_222_211/0.06)] text-[var(--p-dim)]",
                            )}
                          >
                            {t.status === "active" ? (
                              <ClipboardList className="size-4" />
                            ) : (
                              <Check className="size-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-sm">{t.title}</b>
                            <span className="text-xs text-[var(--p-dim)]">
                              {hoursLabel(t.hours)} ·{" "}
                              {t.status === "active" ? dueLabel(t.due_date, today) : "مغلقة"} ·{" "}
                              {done} معتمدة
                            </span>
                          </span>
                          <ChevronLeft className="size-4 text-[var(--p-dim)] transition-transform group-hover:-translate-x-1" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </Rise>

          {psurveys.length > 0 && (
            <Rise delay={0.14}>
              <Panel title="استبيانات المشروع">
                <ul className="space-y-2">
                  {psurveys.map((s) => (
                    <li key={s.id}>
                      <Link
                        to="/portal/surveys/$id"
                        params={{ id: s.id }}
                        className="p-well flex items-center gap-3 px-4 py-3 hover:border-[rgb(198_164_92/0.35)]"
                      >
                        <b className="flex-1 text-sm">{s.title}</b>
                        <Chip
                          tone={s.mine?.submitted_at ? "ok" : s.status === "open" ? "gold" : "dim"}
                        >
                          {s.mine?.submitted_at ? "جاوبت" : s.status === "open" ? "مفتوح" : "مغلق"}
                        </Chip>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            </Rise>
          )}
        </div>

        <div className="space-y-6">
          <Rise delay={0.08}>
            <Panel
              title={`الفريق (${p.members.length})`}
              action={
                manage && (
                  <button
                    type="button"
                    className="p-btn-ghost h-9 text-sm"
                    onClick={() => setTeamOpen(true)}
                  >
                    <UsersRound className="size-4" /> تعديل
                  </button>
                )
              }
            >
              {p.members.length === 0 && (
                <p className="text-sm text-[var(--p-dim)]">ما انضاف أحد للفريق</p>
              )}
              <ul className="space-y-1.5">
                {[...leads, ...crew].map((x, i) => {
                  const m = dir?.member(x.member_id);
                  return (
                    <motion.li
                      key={x.member_id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                      className="flex items-center gap-3 rounded-xl px-2 py-1.5"
                    >
                      <Avatar
                        name={m?.full_name ?? "؟"}
                        size={34}
                        ring={x.is_lead ? "var(--p-gold)" : undefined}
                      />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{m?.full_name ?? "عضو"}</b>
                        <span className="text-xs text-[var(--p-dim)]">
                          {dir?.committee(m?.committee_id ?? null)?.name ?? ""}
                        </span>
                      </span>
                      {x.is_lead && (
                        <Chip tone="gold">
                          <Crown className="size-3" /> قائد
                        </Chip>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </Panel>
          </Rise>

          <Rise delay={0.12}>
            <Panel title="مسيرة المشروع">
              <ol className="relative space-y-4 border-s border-[var(--p-line-strong)] ps-5">
                {[...p.log].reverse().map((l, i) => (
                  <motion.li
                    key={l.changed_at + l.stage}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="relative"
                  >
                    <span
                      className={cn(
                        "absolute -start-[27px] top-1 size-3 rounded-full ring-4 ring-[#08291f]",
                        i === 0 ? "bg-[var(--p-gold)]" : "bg-[var(--p-line-strong)]",
                      )}
                    />
                    <b className="text-sm">{stageLabel(l.stage)}</b>
                    <span className="ms-2 text-xs text-[var(--p-dim)]">
                      {relativeTime(l.changed_at)}
                      {l.changed_by ? ` · ${dir?.member(l.changed_by)?.full_name ?? ""}` : ""}
                    </span>
                    {l.note && (
                      <p className="mt-1 text-sm leading-6 text-[var(--p-soft)]">{l.note}</p>
                    )}
                  </motion.li>
                ))}
                {p.log.length === 0 && (
                  <li className="text-sm text-[var(--p-dim)]">بدأ بمرحلة التخطيط</li>
                )}
              </ol>
            </Panel>
          </Rise>
        </div>
      </div>

      {manage && (
        <>
          <EditBriefDialog p={p} open={editOpen} onOpenChange={setEditOpen} />
          <StageDialog p={p} open={stageOpen} onOpenChange={setStageOpen} />
          <TeamDialog p={p} open={teamOpen} onOpenChange={setTeamOpen} />
        </>
      )}
    </div>
  );
}

const DIALOG =
  "max-h-[92vh] overflow-y-auto rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-xl";

function EditBriefDialog({
  p,
  open,
  onOpenChange,
}: {
  p: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { update } = useProjectActions();
  const me = useMe();
  const [f, setF] = useState<Required<ProjectFields>>({
    name: p.name,
    tagline: p.tagline,
    situation: p.situation,
    problem: p.problem,
    goal: p.goal,
    success: p.success,
    location: p.location,
    starts_on: p.starts_on,
    ends_on: p.ends_on,
  });
  const set = (k: keyof ProjectFields, v: string | null) => setF((x) => ({ ...x, [k]: v }));
  const badDates = !!f.starts_on && !!f.ends_on && f.ends_on < f.starts_on;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (badDates || f.name.trim().length < 2) return;
    try {
      const fields: ProjectFields = { ...f };
      if (!canRunProjects(me)) delete fields.name;
      await update.mutateAsync({ id: p.id, fields });
      toast.success("حُفظ الموجز");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG}>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader className="text-start sm:text-start">
            <DialogTitle className="font-display text-xl">موجز المشروع</DialogTitle>
            <DialogDescription className="text-[var(--p-soft)]">
              يشوفه كل أعضاء البوابة
            </DialogDescription>
          </DialogHeader>
          {canRunProjects(me) && (
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[var(--p-soft)]">الاسم</span>
              <input
                className="p-input"
                value={f.name}
                maxLength={80}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
          )}
          <label className="block space-y-2">
            <span className="text-sm font-bold text-[var(--p-soft)]">سطر تعريفي</span>
            <input
              className="p-input"
              value={f.tagline}
              maxLength={160}
              onChange={(e) => set("tagline", e.target.value)}
            />
          </label>
          {BRIEF.map((b) => (
            <label key={b.key} className="block space-y-2">
              <span className="text-sm font-bold text-[var(--p-soft)]">{b.label}</span>
              <textarea
                className="p-input min-h-20 resize-y"
                value={(f[b.key] as string) ?? ""}
                maxLength={1500}
                onChange={(e) => set(b.key, e.target.value)}
              />
            </label>
          ))}
          <label className="block space-y-2">
            <span className="text-sm font-bold text-[var(--p-soft)]">المكان</span>
            <input
              className="p-input"
              value={f.location}
              maxLength={120}
              onChange={(e) => set("location", e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[var(--p-soft)]">البداية</span>
              <input
                type="date"
                dir="ltr"
                className="p-input"
                value={f.starts_on ?? ""}
                onChange={(e) => set("starts_on", e.target.value || null)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-[var(--p-soft)]">النهاية</span>
              <input
                type="date"
                dir="ltr"
                className="p-input"
                value={f.ends_on ?? ""}
                onChange={(e) => set("ends_on", e.target.value || null)}
                aria-invalid={badDates}
              />
            </label>
          </div>
          {badDates && <p className="text-xs text-[var(--p-bad)]">النهاية لازم تكون بعد البداية</p>}
          <button type="submit" className="p-btn w-full" disabled={update.isPending || badDates}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />} حفظ
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StageDialog({
  p,
  open,
  onOpenChange,
}: {
  p: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { stage } = useProjectActions();
  const cur = stageIndex(p.stage);
  const [to, setTo] = useState<ProjectStage>(STAGES[Math.min(cur + 1, STAGES.length - 1)]!.id);
  const [note, setNote] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (to === p.stage) return;
    try {
      await stage.mutateAsync({ id: p.id, stage: to, note: note.trim() });
      toast.success(`انتقل المشروع لمرحلة ${stageLabel(to)}`, { description: "وصل إشعار للفريق" });
      setNote("");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG}>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader className="text-start sm:text-start">
            <DialogTitle className="font-display text-xl">مرحلة المشروع</DialogTitle>
            <DialogDescription className="text-[var(--p-soft)]">
              الحالية: {stageLabel(p.stage)}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {STAGES.map((s, i) => {
              const active = to === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={s.id === p.stage}
                    onClick={() => setTo(s.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors disabled:opacity-50",
                      active
                        ? "border-[var(--p-gold)] bg-[rgb(198_164_92/0.08)]"
                        : "border-[var(--p-line-strong)] hover:bg-[rgb(200_222_211/0.05)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold",
                        i <= cur
                          ? "bg-[var(--p-gold)] text-[#1d1606]"
                          : "bg-[rgb(200_222_211/0.08)] text-[var(--p-soft)]",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>
                      <b className="block text-sm">
                        {s.label}
                        {s.id === p.stage ? " · الحالية" : ""}
                      </b>
                      <span className="text-xs text-[var(--p-dim)]">{s.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <textarea
            className="p-input min-h-20 resize-y"
            placeholder="ملاحظة للفريق (اختياري): وش تم؟ وش الجاي؟"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="submit"
            className="p-btn w-full"
            disabled={stage.isPending || to === p.stage}
          >
            {stage.isPending && <Loader2 className="size-4 animate-spin" />} انقل لـ{stageLabel(to)}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamDialog({
  p,
  open,
  onOpenChange,
}: {
  p: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const me = useMe();
  const { team } = useProjectActions();
  const superManager = canRunProjects(me);
  const [members, setMembers] = useState(p.members.map((x) => x.member_id));
  const [leads, setLeads] = useState(p.members.filter((x) => x.is_lead).map((x) => x.member_id));
  async function save() {
    try {
      await team.mutateAsync({ id: p.id, members, leads: superManager ? leads : null });
      toast.success("حُفظ الفريق");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG}>
        <DialogHeader className="text-start sm:text-start">
          <DialogTitle className="font-display text-xl">فريق {p.name}</DialogTitle>
          <DialogDescription className="text-[var(--p-soft)]">
            {members.length} عضو
            {superManager ? " · التاج يخلي العضو قائد للمشروع" : " · القادة يحددهم مسؤول المشاريع"}
          </DialogDescription>
        </DialogHeader>
        <MemberPicker
          value={members}
          onChange={(ids) => {
            // A lead set from above can't be removed by a project lead.
            const keep = superManager
              ? []
              : p.members.filter((x) => x.is_lead).map((x) => x.member_id);
            setMembers([...new Set([...ids, ...keep])]);
          }}
          leads={superManager ? leads : undefined}
          onLeadsChange={superManager ? setLeads : undefined}
        />
        <AnimatePresence>
          <button type="button" className="p-btn w-full" onClick={save} disabled={team.isPending}>
            {team.isPending && <Loader2 className="size-4 animate-spin" />} حفظ الفريق
          </button>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
