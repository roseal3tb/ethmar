import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  FlaskConical,
  KeyRound,
  ListChecks,
  Pencil,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  initialTasks,
  months,
  members,
  nextTier,
  roleLabels,
  committeeName,
  tierForHours,
} from "@/data/demo";
import { useDemoAuth } from "@/lib/demo-auth";
import { cn } from "@/lib/utils";
import { ProfileDialog, PasswordDialog } from "./AccountDialogs";
import {
  CommitteeChip,
  MemberAvatar,
  Panel,
  ProgressBar,
  SampleBadge,
  StatusBadge,
  TierBadge,
  dueLabel,
  firstName,
  greeting,
  rankMembers,
  tierShortName,
} from "./shared";

const initiallyDone = initialTasks.filter((t) => t.status === "done").length;

export function AccountPage() {
  const { member, account, profile, tasks } = useDemoAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const latest = months[months.length - 1];
  const rank = useMemo(
    () => (member ? rankMembers(members, latest.id).findIndex((m) => m.id === member.id) + 1 : 0),
    [member, latest.id],
  );

  if (!member || !account || !profile) return null;

  const tier = tierForHours(member.totalHours);
  const next = nextTier(member.totalHours);
  const tierProgress = next
    ? ((member.totalHours - tier.minHours) / (next.minHours - tier.minHours)) * 100
    : 100;
  const doneNow = tasks.filter((t) => t.status === "done").length;
  // Historic completed count + changes made in this demo session.
  const completedTasks = Math.max(0, account.completedTasks + (doneNow - initiallyDone));
  const openTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const maxMonthly = Math.max(...months.map((m) => member.monthly[m.id] ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="bg-emerald-soft grain relative overflow-hidden rounded-[2rem] p-6 text-ivory md:p-9">
        <div
          className="pointer-events-none absolute -end-16 -top-20 h-64 w-64 rounded-full bg-mint/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 md:gap-5">
            <MemberAvatar
              name={profile.displayName}
              id={member.id}
              size="xl"
              className="ring-4 ring-ivory/15"
            />
            <div className="min-w-0">
              <p className="text-sm text-mint/80">{greeting()}،</p>
              <h1 className="font-display text-2xl font-black leading-tight md:text-3xl">
                حياك الله يا {firstName(profile.displayName)}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-ivory/10 px-3 py-1">
                  لجنة {committeeName(member.committee)}
                </span>
                <span className="rounded-full bg-ivory/10 px-3 py-1">
                  {roleLabels[member.role]}
                </span>
                <span className="rounded-full bg-ivory/10 px-3 py-1" dir="ltr">
                  {account.memberCode}
                </span>
                <TierBadge tier={tier} />
              </div>
            </div>
          </div>
          <Button
            variant="hero"
            className="h-11 self-start px-5 md:self-center"
            onClick={() => setEditOpen(true)}
          >
            <Pencil /> تعديل الملف
          </Button>
        </div>
        {(profile.major || profile.bio) && (
          <p className="relative mt-5 max-w-2xl border-t border-ivory/10 pt-4 text-sm leading-relaxed text-ivory/75">
            {profile.major && <span className="font-bold text-mint">{profile.major}</span>}
            {profile.major && profile.bio && " · "}
            {profile.bio}
          </p>
        )}
      </section>

      {/* Overview stats */}
      <section aria-label="نظرة عامة" className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Stat icon={Clock} label="إجمالي الساعات" value={member.totalHours} unit="ساعة" />
        <Stat icon={CheckCircle2} label="المهام المكتملة" value={completedTasks} unit="مهمة" />
        <Stat
          icon={CalendarDays}
          label={`ساعات ${latest.label}`}
          value={member.monthly[latest.id] ?? 0}
          unit="ساعة"
        />
        <Stat
          icon={Trophy}
          label="ترتيبك هذا الشهر"
          value={rank}
          prefix="#"
          unit={`من ${members.length}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Tier progress */}
          <Panel title="مستوى العضوية" action={<SampleBadge>عتبات تجريبية</SampleBadge>}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TierBadge tier={tier} />
                <span className="text-sm text-muted-foreground">
                  {member.totalHours} ساعة مسجلة
                </span>
              </div>
              {next ? (
                <span className="text-sm text-foreground/75">
                  باقي <b className="text-primary">{next.minHours - member.totalHours}</b> ساعة
                  للمستوى {tierShortName(next)}
                </span>
              ) : (
                <span className="text-sm font-bold text-primary">وصلت لأعلى مستوى</span>
              )}
            </div>
            <ProgressBar
              value={tierProgress}
              className="mt-4 h-3"
              label="التقدم نحو المستوى التالي"
            />
            <div className="mt-6">
              <p className="mb-3 text-sm font-bold text-foreground/75">الساعات الشهرية</p>
              <div className="flex h-36 items-end gap-3 sm:gap-6">
                {months.map((m) => {
                  const v = member.monthly[m.id] ?? 0;
                  const isLatest = m.id === latest.id;
                  return (
                    <div key={m.id} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-sm font-bold text-primary">{v}</span>
                      <div
                        className={cn(
                          "w-full max-w-16 rounded-t-xl transition-all duration-700",
                          isLatest ? "bg-primary" : "bg-secondary",
                        )}
                        style={{ height: `${(v / maxMonthly) * 88}px` }}
                        aria-hidden
                      />
                      <span className="text-xs text-muted-foreground">{m.label.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Recent tasks */}
          <Panel
            title="مهامي الحالية"
            action={
              <Link
                to="/portal/tasks"
                className="flex items-center gap-1 text-sm font-bold text-primary/80 transition hover:text-primary"
              >
                كل المهام <ArrowUpLeft className="h-4 w-4" />
              </Link>
            }
          >
            {openTasks.length === 0 ? (
              <p className="rounded-2xl bg-sage p-5 text-center text-sm text-muted-foreground">
                لا توجد مهام مفتوحة حاليًا.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {openTasks.slice(0, 3).map((t) => {
                  const due = dueLabel(t.dueAt, t.status);
                  return (
                    <li key={t.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-foreground">{t.title}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <CommitteeChip id={t.committee} />
                        <span
                          className={cn(
                            due.tone === "danger" && "text-destructive",
                            due.tone === "warn" && "font-bold text-[oklch(0.5_0.1_65)]",
                          )}
                        >
                          {due.text}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <ProgressBar value={t.progress} label={`تقدم ${t.title}`} />
                        <span
                          className="w-10 shrink-0 text-end text-xs font-bold text-primary"
                          dir="ltr"
                        >
                          {t.progress}%
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          {/* Achievements */}
          <Panel title="الإنجازات">
            <ul className="space-y-3">
              {account.achievements.map((a, i) => (
                <li
                  key={a}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-[oklch(0.985_0.006_100)] p-3"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      i === 0
                        ? "tier-gold text-deep"
                        : i === 1
                          ? "bg-primary text-mint"
                          : "bg-secondary text-primary",
                    )}
                  >
                    <BadgeCheck className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-foreground">{a}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Quick navigation */}
          <Panel title="تنقل سريع">
            <div className="grid grid-cols-2 gap-3">
              <QuickLink to="/portal/tasks" icon={ListChecks} label="المهام" />
              <QuickLink to="/portal/leaderboard" icon={Trophy} label="لوحة الصدارة" />
              <QuickLink to="/portal/community" icon={Users} label="المجتمع" />
              <QuickLink to="/portal/labs" icon={FlaskConical} label="اللابات" />
            </div>
          </Panel>

          {/* Account settings */}
          <Panel title="إعدادات الحساب">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-start text-sm font-bold transition hover:border-primary/30 hover:bg-sage"
              >
                <Pencil className="h-4 w-4 text-primary" /> تعديل الملف الشخصي
              </button>
              <button
                type="button"
                onClick={() => setPwOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-start text-sm font-bold transition hover:border-primary/30 hover:bg-sage"
              >
                <KeyRound className="h-4 w-4 text-primary" /> تغيير كلمة المرور
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              واجهات تجريبية: لا يتم تعديل أي بيانات حقيقية.
            </p>
          </Panel>
        </div>
      </div>

      <ProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  prefix,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-card md:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground md:text-sm">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-black text-primary md:text-4xl" dir="ltr">
          {prefix}
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/portal/tasks" | "/portal/leaderboard" | "/portal/community" | "/portal/labs";
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-sage"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-mint transition group-hover:bg-forest">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-bold text-foreground">{label}</span>
    </Link>
  );
}
