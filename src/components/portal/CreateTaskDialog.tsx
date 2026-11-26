import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Loader2,
  Plus,
  Search,
  Users,
  UsersRound,
  UserRound,
  UserRoundCheck,
  Crown,
  FolderKanban,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addDays, todayISO } from "@/lib/portal/dates";
import { errorMessage } from "@/lib/portal/errors";
import { COMMITTEE_HEADS, canManageProject, isLeadership } from "@/lib/portal/permissions";
import { useCreateTask, useDirectory, useProjects } from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type { Audience, TaskMode } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { Avatar, titleOf } from "./ui";
import { PSelect } from "./PSelect";

export function CreateTaskButton({
  onCreated,
  projectId,
  className,
}: {
  onCreated?: ((id: string) => void) | undefined;
  projectId?: string | undefined;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={cn("p-btn", className)} onClick={() => setOpen(true)}>
        <Plus className="size-4" /> مهمة جديدة
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-xl">
          {open && (
            <CreateTaskForm
              projectId={projectId}
              onDone={(id) => {
                setOpen(false);
                onCreated?.(id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateTaskForm({
  onDone,
  projectId: fixedProject,
}: {
  onDone: (id: string) => void;
  projectId?: string | undefined;
}) {
  const me = useMe();
  const { dir } = useDirectory();
  const { data: allProjects = [] } = useProjects();
  const myProjects = allProjects.filter((p) => canManageProject(me, p.id));
  const create = useCreateTask();
  const leadership = isLeadership(me);
  // Leadership (president / VPs) create tasks for committee leads; the admin may also act inside any committee.
  const committees = useMemo(() => {
    if (!dir) return [];
    if (me.is_admin) return dir.committees;
    return dir.committees.filter((c) => c.id === me.committee_id);
  }, [dir, me]);
  const canCommittee = committees.length > 0 && (me.is_admin || COMMITTEE_HEADS.includes(me.role));

  const [audience, setAudience] = useState<Audience>(
    fixedProject ? "project" : canCommittee ? "committee" : leadership ? "leaders" : "project",
  );
  const [projectId, setProjectId] = useState<string>(fixedProject ?? "");
  const project = allProjects.find((p) => p.id === (projectId || myProjects[0]?.id));
  const [committeeId, setCommitteeId] = useState<string>(
    me.committee_id && canCommittee ? me.committee_id : (committees[0]?.id ?? ""),
  );
  const teams = dir && committeeId ? dir.teamsOf(committeeId) : [];
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? "");
  const [mode, setMode] = useState<TaskMode>("open");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState(2);
  const [seats, setSeats] = useState(2);
  const [due, setDue] = useState(addDays(todayISO(), 7));
  const [targets, setTargets] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [tried, setTried] = useState(false);

  const effectiveMode: TaskMode = audience === "people" ? "assigned" : mode;
  const eligible = useMemo(() => {
    if (!dir) return [];
    let list = [...dir.members];
    if (audience === "leaders") list = list.filter((m) => COMMITTEE_HEADS.includes(m.role));
    else if (audience === "project") {
      const ids = new Set(project?.members.map((x) => x.member_id) ?? []);
      list = list.filter((m) => ids.has(m.id));
    } else list = list.filter((m) => m.committee_id === committeeId);
    if (audience === "team") list = list.filter((m) => m.team_id === teamId);
    // You can take the task yourself: keep yourself pinned first.
    return list.sort((a, b) => Number(b.id === me.id) - Number(a.id === me.id));
  }, [dir, me.id, audience, committeeId, teamId, project]);
  const pool = useMemo(
    () => (q.trim() ? eligible.filter((m) => m.full_name.includes(q.trim())) : eligible),
    [eligible, q],
  );
  const selfOk = eligible.some((m) => m.id === me.id);
  const selfOn = targets.includes(me.id);
  // Drop picks that no longer fit after switching audience, committee or team.
  const picked = targets.filter((id) => eligible.some((m) => m.id === id));

  const audiences: {
    id: Audience;
    label: string;
    hint: string;
    icon: typeof Users;
    show: boolean;
  }[] = [
    {
      id: "committee",
      label: teams.length ? "جماعية" : "اللجنة كاملة",
      hint: teams.length ? "تظهر لكل فرق اللجنة" : "تظهر لكل أعضاء اللجنة",
      icon: Users,
      show: canCommittee,
    },
    {
      id: "team",
      label: "فريق محدد",
      hint: "ما يشوفها إلا الفريق",
      icon: UsersRound,
      show: canCommittee && teams.length > 0,
    },
    {
      id: "people",
      label: "أشخاص محددين",
      hint: "تُسند مباشرة لهم",
      icon: UserRoundCheck,
      show: canCommittee,
    },
    {
      id: "leaders",
      label: "قادة اللجان",
      hint: "مهمة من قيادة المبادرة",
      icon: Crown,
      show: leadership,
    },
    {
      id: "project",
      label: "فريق مشروع",
      hint: "تظهر لأعضاء المشروع",
      icon: FolderKanban,
      show: myProjects.length > 0,
    },
  ];

  const errors = {
    title: title.trim().length < 3 ? "اكتب عنوانًا واضحًا" : null,
    due: due < todayISO() ? "التاريخ لازم يكون اليوم أو بعده" : null,
    hours: !(hours > 0 && hours <= 100) ? "الساعات بين ٠٫٥ و١٠٠" : null,
    seats:
      effectiveMode === "open" && !(seats >= 1 && seats <= 200) ? "عدد المقاعد غير صحيح" : null,
    targets:
      effectiveMode === "assigned" && picked.length === 0 ? "اختر شخصًا واحدًا على الأقل" : null,
    project: audience === "project" && !project ? "اختر المشروع" : null,
  };
  const valid = Object.values(errors).every((e) => !e);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    try {
      const id = await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        audience,
        committee_id: audience === "leaders" || audience === "project" ? null : committeeId,
        team_id: audience === "team" ? teamId : null,
        project_id: audience === "project" ? (project?.id ?? null) : null,
        mode: effectiveMode,
        seats: effectiveMode === "open" ? seats : null,
        hours,
        due_date: due,
        targets: effectiveMode === "assigned" ? picked : [],
      });
      toast.success("نُشرت المهمة", {
        description:
          effectiveMode !== "assigned"
            ? "وصل إشعار للي يقدرون يسحبونها"
            : picked.length === 1 && picked[0] === me.id
              ? "صارت في مهامك"
              : "وصل إشعار للمسندة لهم",
      });
      onDone(id as string);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const err = (k: keyof typeof errors) =>
    tried && errors[k] ? <span className="text-xs text-[var(--p-bad)]">{errors[k]}</span> : null;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <DialogHeader className="text-start sm:text-start">
        <DialogTitle className="font-display text-xl">مهمة جديدة</DialogTitle>
        <DialogDescription className="text-[var(--p-soft)]">
          حدد لمن تظهر، وكيف تتوزع، وكم ساعة تستحق
        </DialogDescription>
      </DialogHeader>

      {me.is_admin && audience !== "leaders" && audience !== "project" && (
        <div className="space-y-2">
          <span className="block text-sm font-bold text-[var(--p-soft)]">اللجنة</span>
          <PSelect
            label="اللجنة"
            value={committeeId}
            onChange={(v) => {
              setCommitteeId(v);
              setTeamId(dir?.teamsOf(v)[0]?.id ?? "");
              setTargets([]);
              if (audience === "team" && !dir?.teamsOf(v).length) setAudience("committee");
            }}
            options={committees.map((c) => ({ value: c.id, label: c.title }))}
          />
        </div>
      )}

      {fixedProject ? (
        <p className="p-well flex items-center gap-2 px-4 py-3 text-sm">
          <FolderKanban className="size-4 text-[var(--p-gold-soft)]" /> لفريق مشروع{" "}
          <b>{project?.name ?? ""}</b>
        </p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-bold text-[var(--p-soft)]">لمن تظهر؟</legend>
          <div className="grid grid-cols-2 gap-2">
            {audiences
              .filter((a) => a.show)
              .map((a) => {
                const active = audience === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setAudience(a.id);
                      setTargets([]);
                    }}
                    className={cn(
                      "relative flex items-start gap-3 rounded-2xl border p-3 text-start transition-colors",
                      active
                        ? "border-[var(--p-gold)] bg-[rgb(198_164_92/0.08)]"
                        : "border-[var(--p-line-strong)] hover:bg-[rgb(200_222_211/0.05)]",
                    )}
                  >
                    <a.icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        active ? "text-[var(--p-gold-soft)]" : "text-[var(--p-dim)]",
                      )}
                    />
                    <span>
                      <b className="block text-sm">{a.label}</b>
                      <span className="text-xs text-[var(--p-dim)]">{a.hint}</span>
                    </span>
                  </button>
                );
              })}
          </div>
        </fieldset>
      )}

      <AnimatePresence initial={false}>
        {audience === "project" && !fixedProject && myProjects.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <PSelect
              label="المشروع"
              value={project?.id ?? ""}
              onChange={(v) => {
                setProjectId(v);
                setTargets([]);
              }}
              options={myProjects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {audience === "team" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTeamId(t.id);
                    setTargets([]);
                  }}
                  aria-pressed={teamId === t.id}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
                    teamId === t.id
                      ? "border-transparent bg-[var(--p-soft)] text-[var(--p-bg)]"
                      : "border-[var(--p-line-strong)] text-[var(--p-soft)]",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-[var(--p-soft)]">العنوان</span>
        <input
          className="p-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="مثال: تنسيق زيارة تداول السعودية"
          aria-invalid={tried && !!errors.title}
        />
        {err("title")}
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-[var(--p-soft)]">التفاصيل</span>
        <textarea
          className="p-input min-h-24 resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="وش المطلوب بالضبط؟ وش يعتبر تسليم مكتمل؟"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[var(--p-soft)]">موعد التسليم</span>
          <input
            type="date"
            className="p-input"
            dir="ltr"
            min={todayISO()}
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-invalid={tried && !!errors.due}
          />
          {err("due")}
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[var(--p-soft)]">الساعات لكل شخص</span>
          <input
            type="number"
            className="p-input"
            dir="ltr"
            min={0.5}
            max={100}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            aria-invalid={tried && !!errors.hours}
          />
          {err("hours")}
        </label>
      </div>

      {audience !== "people" && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-[var(--p-soft)]">طريقة التوزيع</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["open", "مفتوحة للسحب", "أول من يسحب ياخذ مقعد"],
                ["assigned", "إسناد مباشر", "تختار الأشخاص بنفسك"],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-2xl border p-3 text-start transition-colors",
                  mode === id
                    ? "border-[var(--p-gold)] bg-[rgb(198_164_92/0.08)]"
                    : "border-[var(--p-line-strong)] hover:bg-[rgb(200_222_211/0.05)]",
                )}
              >
                <b className="block text-sm">{label}</b>
                <span className="text-xs text-[var(--p-dim)]">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {effectiveMode === "open" ? (
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[var(--p-soft)]">عدد المقاعد</span>
          <input
            type="number"
            className="p-input"
            dir="ltr"
            min={1}
            max={200}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            aria-invalid={tried && !!errors.seats}
          />
          {err("seats")}
        </label>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--p-soft)]">اختر الأشخاص</span>
            <span className="flex items-center gap-2">
              {selfOk && (
                <button
                  type="button"
                  aria-pressed={selfOn}
                  onClick={() =>
                    setTargets((t) => (selfOn ? t.filter((x) => x !== me.id) : [...t, me.id]))
                  }
                  className={cn(
                    "p-tap inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors",
                    selfOn
                      ? "border-transparent bg-[var(--p-gold)] text-[#1d1606]"
                      : "border-[var(--p-line-strong)] text-[var(--p-soft)] hover:bg-[rgb(200_222_211/0.06)]",
                  )}
                >
                  {selfOn ? <Check className="size-3.5" /> : <UserRound className="size-3.5" />}
                  لي أنا
                </button>
              )}
              <span className="text-xs text-[var(--p-dim)]">{picked.length} مختارين</span>
            </span>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
            <input
              className="p-input ps-10"
              placeholder="ابحث بالاسم"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-[var(--p-line)] p-1.5">
            {pool.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-[var(--p-dim)]">ما فيه أحد</li>
            )}
            {pool.map((m) => {
              const on = targets.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setTargets((t) => (on ? t.filter((x) => x !== m.id) : [...t, m.id]))
                    }
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors",
                      on ? "bg-[rgb(198_164_92/0.1)]" : "hover:bg-[rgb(200_222_211/0.05)]",
                    )}
                  >
                    <Avatar name={m.full_name} size={30} />
                    <span className="min-w-0 flex-1">
                      <b className="flex items-center gap-1.5 truncate text-sm">
                        <span className="truncate">{m.full_name}</span>
                        {m.id === me.id && (
                          <span className="shrink-0 rounded-full bg-[rgb(198_164_92/0.14)] px-2 py-0.5 text-[11px] font-bold text-[var(--p-gold)]">
                            أنت
                          </span>
                        )}
                      </b>
                      <span className="text-xs text-[var(--p-dim)]">
                        {audience === "leaders" || audience === "project"
                          ? dir?.committee(m.committee_id)?.name
                          : (dir?.team(m.team_id)?.name ?? titleOf(m))}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-md border",
                        on
                          ? "border-transparent bg-[var(--p-gold)] text-[#1d1606]"
                          : "border-[var(--p-line-strong)]",
                      )}
                    >
                      {on && <Check className="size-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selfOn && (
            <p className="text-xs text-[var(--p-dim)]">
              لما تسلّمها، يعتمد ساعاتك شخص غيرك من المسؤولين
            </p>
          )}
          {err("targets")}
        </div>
      )}

      <button type="submit" className="p-btn w-full" disabled={create.isPending}>
        {create.isPending && <Loader2 className="size-4 animate-spin" />} نشر المهمة
      </button>
    </form>
  );
}
