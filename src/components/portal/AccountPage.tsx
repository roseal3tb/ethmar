import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Pencil,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  committeeName,
  initialTasks,
  members,
  months,
  nextTier,
  roleLabel,
  tierForHours,
} from "@/data/demo";
import { useDemoAuth } from "@/lib/demo-auth";
import { cn } from "@/lib/utils";
import { AnimatedNumber, ProgressRing, Stagger, StaggerItem } from "./motion";
import { usePortalUI } from "./PortalShell";
import {
  CommitteeChip,
  MemberAvatar,
  Panel,
  ProgressBar,
  StatusBadge,
  dueLabel,
  firstName,
  greeting,
  rankMembers,
  tierShortName,
} from "./shared";

const initiallyDone = initialTasks.filter((t) => t.status === "done").length;

export function AccountPage() {
  const { member, account, profile, tasks } = useDemoAuth();
  const { openProfile } = usePortalUI();
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
  // Historic completed count plus changes made during this demo session
  const completedTasks = Math.max(0, account.completedTasks + (doneNow - initiallyDone));
  const openTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const maxMonthly = Math.max(...months.map((m) => member.monthly[m.id] ?? 0), 1);

  return (
    <Stagger className="space-y-6">
      {/* Welcome + tier */}
      <StaggerItem>
        <section className="bg-emerald-soft grain relative overflow-hidden rounded-[2rem] p-6 text-ivory md:p-9">
          <div
            className="pointer-events-none absolute -end-20 -top-24 h-72 w-72 animate-drift rounded-full bg-mint/15 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 md:gap-5">
              <MemberAvatar
                name={profile.displayName}
                id={member.id}
                size="xl"
                className="ring-4 ring-ivory/15"
              />
              <div className="min-w-0">
                <p className="text-sm text-mint/80">{greeting()}</p>
                <h1 className="font-display text-2xl font-black leading-tight md:text-[2rem]">
                  حياك الله يا {firstName(profile.displayName)}
                </h1>
                <p className="mt-2 text-sm text-ivory/65">
                  {roleLabel(member)} · لجنة {committeeName(member.committee)} ·{" "}
                  <span dir="ltr">{account.memberCode}</span>
                </p>
                <button
                  type="button"
                  onClick={openProfile}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ivory/20 px-3.5 py-1.5 text-xs font-bold text-ivory/85 transition hover:border-mint hover:bg-mint hover:text-deep"
                >
                  <Pencil className="h-3.5 w-3.5" /> تعديل الملف
                </button>
              </div>
            </div>

            <div className="flex items-center gap-5 self-start rounded-3xl border border-ivory/10 bg-ivory/[0.05] p-4 pe-6 md:self-auto">
              <ProgressRing value={tierProgress} size={104}>
                <span className="font-display text-2xl font-black leading-none">
                  {member.totalHours}
                </span>
                <span className="mt-1 text-[10px] text-ivory/60">ساعة</span>
              </ProgressRing>
              <div>
                <p className="text-xs text-ivory/55">مستوى العضوية</p>
                <p className="mt-0.5 font-display text-xl font-extrabold text-gold">
                  {tierShortName(tier)}
                </p>
                <p className="mt-1 max-w-[11rem] text-xs leading-relaxed text-ivory/65">
                  {next
                    ? `باقي ${next.minHours - member.totalHours} ساعة للمستوى ${tierShortName(next)}`
                    : "وصلت لأعلى مستوى"}
                </p>
              </div>
            </div>
          </div>
          {(profile.major || profile.bio) && (
            <p className="relative mt-6 max-w-2xl border-t border-ivory/10 pt-4 text-sm leading-relaxed text-ivory/75">
              {profile.major && <span className="font-bold text-mint">{profile.major}</span>}
              {profile.major && profile.bio && " · "}
              {profile.bio}
            </p>
          )}
        </section>
      </StaggerItem>

      {/* KPIs */}
      <StaggerItem>
        <section aria-label="نظرة عامة" className="grid grid-cols-3 gap-3 md:gap-4">
          <Stat icon={Clock} label="إجمالي الساعات" value={member.totalHours} unit="ساعة" />
          <Stat icon={CheckCircle2} label="المهام المكتملة" value={completedTasks} unit="مهمة" />
          <Stat
            icon={Trophy}
            label={`ترتيبك في ${latest.label.split(" ")[0]}`}
            value={rank}
            prefix="#"
            unit={`من ${members.length}`}
            to="/portal/leaderboard"
          />
        </section>
      </StaggerItem>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Current tasks */}
        <StaggerItem className="lg:col-span-3">
          <Panel
            title="مهامي الحالية"
            className="h-full"
            action={
              <Link
                to="/portal/tasks"
                className="group flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold text-primary/75 transition hover:bg-secondary hover:text-primary"
              >
                كل المهام
                <ArrowUpLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            }
          >
            {openTasks.length === 0 ? (
              <p className="rounded-2xl bg-sage p-6 text-center text-sm text-muted-foreground">
                لا توجد مهام مفتوحة حاليًا
              </p>
            ) : (
              <ul className="-mx-2 space-y-1">
                {openTasks.slice(0, 4).map((t) => {
                  const due = dueLabel(t.dueAt, t.status);
                  return (
                    <li key={t.id}>
                      <Link
                        to="/portal/tasks"
                        className="group block rounded-2xl p-3 transition-colors hover:bg-sage"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold text-foreground transition-colors group-hover:text-primary">
                            {t.title}
                          </p>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </StaggerItem>

        <div className="space-y-6 lg:col-span-2">
          {/* Monthly hours */}
          <StaggerItem>
            <Panel title="ساعاتك الشهرية">
              <div className="flex h-36 items-end justify-around gap-4">
                {months.map((m, i) => {
                  const v = member.monthly[m.id] ?? 0;
                  const isLatest = m.id === latest.id;
                  return (
                    <div key={m.id} className="group flex flex-1 flex-col items-center gap-2">
                      <span className="text-sm font-bold text-primary opacity-70 transition-opacity group-hover:opacity-100">
                        {v}
                      </span>
                      <div
                        className={cn(
                          "w-full max-w-14 origin-bottom animate-[grow_0.9s_cubic-bezier(.22,1,.36,1)_both] rounded-t-xl transition-colors duration-300",
                          isLatest ? "bg-primary" : "bg-secondary group-hover:bg-primary/40",
                        )}
                        style={{
                          height: `${(v / maxMonthly) * 88}px`,
                          animationDelay: `${0.15 + i * 0.1}s`,
                        }}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "text-xs",
                          isLatest ? "font-bold text-primary" : "text-muted-foreground",
                        )}
                      >
                        {m.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </StaggerItem>

          {/* Achievements */}
          <StaggerItem>
            <Panel title="الإنجازات">
              <ul className="space-y-2">
                {account.achievements.map((a, i) => (
                  <li
                    key={a}
                    className="group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-sage"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]",
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
          </StaggerItem>
        </div>
      </div>

      <StaggerItem>
        <div className="flex flex-col items-start justify-between gap-3 rounded-3xl border border-dashed border-border p-5 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            تبي تحدّث بياناتك أو كلمة المرور؟ تلقاها في قائمة الحساب أعلى الصفحة
          </p>
          <Button variant="outline" className="rounded-full" onClick={openProfile}>
            <Pencil /> تعديل الملف الشخصي
          </Button>
        </div>
      </StaggerItem>
    </Stagger>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  prefix,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  to?: "/portal/leaderboard";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold leading-tight text-muted-foreground sm:text-sm">
          {label}
        </span>
        <span className="hidden h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-mint sm:flex">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
        <span
          className="font-display text-[1.65rem] font-black leading-none text-primary sm:text-4xl"
          dir="ltr"
        >
          {prefix}
          <AnimatedNumber value={value} />
        </span>
        {unit && <span className="text-xs text-muted-foreground sm:text-sm">{unit}</span>}
      </p>
    </>
  );
  const cls =
    "group block rounded-3xl border border-border/70 bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft md:p-5";
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
