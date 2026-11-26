import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, Inbox, ListChecks, Sparkles, UserRound } from "lucide-react";
import { useMemo } from "react";
import {
  dueLabel,
  daysBetween,
  monthStart,
  relativeTime,
  shortDate,
  todayISO,
} from "@/lib/portal/dates";
import { canReview, isLeadership, myAssignment } from "@/lib/portal/permissions";
import {
  useDirectory,
  useMemberStats,
  useMyHours,
  useNotifications,
  useSummary,
  useTasks,
} from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import { MedalStrip } from "./Achievements";
import type { Task } from "@/lib/portal/types";
import {
  Avatar,
  Chip,
  CountUp,
  EmptyState,
  ErrorState,
  Meter,
  PageHeader,
  PageSkeleton,
  Panel,
  Rise,
  TIER_COLOR,
  TierGem,
  fmt,
  hoursLabel,
  itemVariants,
  listVariants,
  titleOf,
} from "./ui";

const TIERS = [
  { id: "bronze", name: "برونزي", min: 0 },
  { id: "silver", name: "فضي", min: 20 },
  { id: "gold", name: "ذهبي", min: 40 },
  { id: "platinum", name: "بلاتيني", min: 70 },
  { id: "diamond", name: "ماسي", min: 100 },
];

export function HomePage() {
  const me = useMe();
  const summary = useSummary();
  const tasks = useTasks();
  const { dir } = useDirectory();
  const hours = useMyHours();
  const notes = useNotifications();
  const today = todayISO();

  const mine = useMemo(
    () =>
      (tasks.data ?? [])
        .map((t) => ({ t, a: myAssignment(me, t) }))
        .filter(
          (x): x is { t: Task; a: NonNullable<typeof x.a> } =>
            !!x.a && x.a.status !== "approved" && x.t.status === "active",
        )
        .sort((x, y) => x.t.due_date.localeCompare(y.t.due_date)),
    [tasks.data, me],
  );
  const toReview = useMemo(
    () =>
      (tasks.data ?? []).flatMap((t) =>
        t.assignments
          .filter((a) => a.status === "submitted" && canReview(me, t, dir?.member(a.member_id)))
          .map((a) => ({ t, a })),
      ),
    [tasks.data, me, dir],
  );

  if (summary.isError) return <ErrorState onRetry={() => summary.refetch()} />;
  if (!summary.data || !dir) return <PageSkeleton />;
  const s = summary.data;
  const committee = dir.committee(me.committee_id);
  const team = dir.team(me.team_id);
  const firstName = me.full_name.split(" ")[0];
  const sem = s.semester;
  const semPct = sem
    ? Math.min(
        100,
        (daysBetween(sem.starts_on, today) / Math.max(1, daysBetween(sem.starts_on, sem.ends_on))) *
          100,
      )
    : 0;
  const tierColor = TIER_COLOR[s.tier?.id ?? "bronze"];
  const toNext = s.next_tier ? s.next_tier.min_hours - s.semester_hours : 0;
  const tierPct =
    s.next_tier && s.tier
      ? ((s.semester_hours - s.tier.min_hours) / (s.next_tier.min_hours - s.tier.min_hours)) * 100
      : 100;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={UserRound}
        title={`حياك الله، ${firstName}`}
        subtitle={sem ? `ملخص نشاطك في ${sem.name}` : "ملخص نشاطك"}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* identity */}
        <Rise className="flex flex-col gap-5 lg:col-span-4">
          <section className="p-card relative overflow-hidden p-6 text-center">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-24"
              style={{
                background: `radial-gradient(ellipse 70% 100% at 50% 0%, color-mix(in oklab, ${tierColor} 18%, transparent), transparent)`,
              }}
            />
            <div className="relative flex flex-col items-center gap-3">
              <Avatar name={me.full_name} size={88} ring={tierColor} />
              <div>
                <h2 className="font-display text-[22px] font-bold">{me.full_name}</h2>
                {me.member_code && (
                  <p className="mt-0.5 text-[13px] text-[var(--p-dim)]" dir="ltr">
                    {me.member_code}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {committee && <Chip>{committee.title}</Chip>}
                {team && <Chip tone="dim">{team.name}</Chip>}
                <Chip tone="gold">{titleOf(me)}</Chip>
                {me.extra_titles.map((t) => (
                  <Chip key={t} tone="gold">
                    {t.split(" · ")[0]}
                  </Chip>
                ))}
              </div>
              <div className="mt-2 grid w-full grid-cols-3 rounded-2xl [&>*+*]:border-s [&>*+*]:border-[var(--p-line)] border border-[var(--p-line)]">
                <Stat value={s.semester_hours} label="ساعة هذا الفصل" />
                <Stat value={s.completed_tasks} label="مهمة مكتملة" />
                {s.month_rank ? (
                  <Stat
                    value={s.month_rank}
                    prefix="#"
                    label={s.board === "leaders" ? "بين القادة" : "بين الأعضاء"}
                  />
                ) : (
                  <Stat value={s.pending_hours} label="بانتظار الاعتماد" />
                )}
              </div>
            </div>
          </section>

          <MedalStrip />

          {sem && (
            <Panel className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-bold">
                  <CalendarClock className="size-4 text-[var(--p-dim)]" /> {sem.name}
                </span>
                <span className="text-[var(--p-dim)]">
                  باقي {fmt(Math.max(0, daysBetween(today, sem.ends_on)))} يوم
                </span>
              </div>
              <Meter value={semPct} color="var(--p-soft)" />
              <div className="flex justify-between text-xs text-[var(--p-dim)]">
                <span>{shortDate(sem.starts_on)}</span>
                <span>{shortDate(sem.ends_on)}</span>
              </div>
            </Panel>
          )}
        </Rise>

        <div className="flex flex-col gap-5 lg:col-span-8">
          {isLeadership(me) && (
            <Rise delay={0.05}>
              <LeadershipOverview />
            </Rise>
          )}
          {/* tier */}
          <Rise delay={0.05} className={isLeadership(me) ? "hidden" : undefined}>
            <section className="p-card space-y-5 p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[13px] text-[var(--p-dim)]">مستواك هذا الفصل</p>
                  <p
                    className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold"
                    style={{ color: tierColor }}
                  >
                    <TierGem tierId={s.tier?.id ?? "bronze"} className="size-5" /> المستوى{" "}
                    {s.tier?.name}
                  </p>
                </div>
                <p className="text-sm text-[var(--p-soft)]">
                  {s.next_tier ? (
                    <>
                      باقي <b className="text-[var(--p-text)]">{hoursLabel(toNext)}</b> للمستوى{" "}
                      {s.next_tier.name}
                    </>
                  ) : (
                    "وصلت أعلى مستوى، ما شاء الله 🌟"
                  )}
                </p>
              </div>
              <Meter value={tierPct} color={tierColor} />
              <ol className="grid grid-cols-5 gap-2 text-center text-xs">
                {TIERS.map((t, i) => {
                  const reached = s.semester_hours >= t.min;
                  const current = s.tier?.id === t.id;
                  return (
                    <li
                      key={t.id}
                      className={
                        current
                          ? "font-bold"
                          : reached
                            ? "text-[var(--p-soft)]"
                            : "text-[var(--p-dim)]"
                      }
                      style={current ? { color: TIER_COLOR[t.id] } : undefined}
                    >
                      <TierGem
                        tierId={t.id}
                        className={`mx-auto mb-1 size-3.5 ${reached ? "" : "opacity-30"}`}
                      />
                      {t.name}
                      <span className="block text-[11px] opacity-75" dir="ltr">
                        {TIERS[i + 1] ? `${t.min}–${TIERS[i + 1]!.min - 1}` : `${t.min}+`}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          </Rise>

          {toReview.length > 0 && (
            <Rise delay={0.08}>
              <Link
                to="/portal/tasks"
                search={{ view: "review" }}
                className="group flex items-center gap-4 rounded-[22px] border border-[rgb(198_164_92/0.3)] bg-[rgb(198_164_92/0.08)] p-5 transition-colors hover:bg-[rgb(198_164_92/0.12)]"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-[rgb(198_164_92/0.18)] text-[var(--p-gold-soft)]">
                  <Inbox className="size-5" />
                </span>
                <span className="flex-1">
                  <b className="block font-display">{fmt(toReview.length)} تسليم بانتظار اعتمادك</b>
                  <span className="text-sm text-[var(--p-soft)]">
                    راجعها عشان تنحسب ساعات أعضائك
                  </span>
                </span>
                <ArrowLeft className="size-5 text-[var(--p-gold-soft)] transition-transform group-hover:-translate-x-1" />
              </Link>
            </Rise>
          )}

          <Rise delay={0.1}>
            <Panel
              title="مهامي الحالية"
              action={
                <Link
                  to="/portal/tasks"
                  className="text-sm font-bold text-[var(--p-soft)] hover:text-[var(--p-text)]"
                >
                  كل المهام
                </Link>
              }
            >
              {mine.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="ما عندك مهام حاليًا"
                  body={
                    isLeadership(me)
                      ? "المهام اللي تُسند لك تظهر هنا"
                      : "تصفّح المهام المتاحة واسحب اللي يناسبك"
                  }
                  action={
                    <Link
                      to="/portal/tasks"
                      search={{ view: isLeadership(me) ? "all" : "open" }}
                      className="p-btn-ghost"
                    >
                      {isLeadership(me) ? "كل المهام" : "المهام المتاحة"}
                    </Link>
                  }
                />
              ) : (
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-2.5"
                >
                  {mine.slice(0, 5).map(({ t, a }) => {
                    const late = t.due_date < today;
                    return (
                      <motion.li key={t.id} variants={itemVariants}>
                        <Link
                          to="/portal/tasks"
                          search={{ task: t.id }}
                          className="p-well flex items-center gap-3 px-4 py-3.5 transition-colors hover:border-[var(--p-line-strong)] hover:bg-[rgb(200_222_211/0.06)]"
                        >
                          <span className="min-w-0 flex-1">
                            <b className="block truncate">{t.title}</b>
                            <span className="text-[13px] text-[var(--p-dim)]">
                              {hoursLabel(t.hours)} · {dueLabel(t.due_date, today)}
                            </span>
                          </span>
                          {a.status === "returned" ? (
                            <Chip tone="bad">رجعت لك</Chip>
                          ) : a.status === "submitted" ? (
                            <Chip tone="warn">بانتظار الاعتماد</Chip>
                          ) : late ? (
                            <Chip tone="bad">متأخرة</Chip>
                          ) : (
                            <Chip tone="ok">قيد التنفيذ</Chip>
                          )}
                        </Link>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </Panel>
          </Rise>

          <Rise delay={0.14}>
            <Panel title="آخر النشاط">
              {(() => {
                const items = [
                  ...(hours.data ?? []).slice(0, 4).map((h) => ({
                    key: h.id,
                    text: `اعتُمدت ${hoursLabel(h.hours)}: ${h.description ?? "مهمة"}`,
                    when: h.earned_on,
                    gold: true,
                  })),
                  ...(notes.data ?? [])
                    .filter((n) => n.id !== "welcome" && !/اعتُمدت/.test(n.title))
                    .slice(0, 3)
                    .map((n) => ({
                      key: n.id,
                      text: `${n.title}${n.body ? ` · ${n.body}` : ""}`,
                      when: n.created_at,
                      gold: false,
                    })),
                ]
                  .sort((a, b) => b.when.localeCompare(a.when))
                  .slice(0, 5);
                if (items.length === 0)
                  return (
                    <p className="py-4 text-center text-sm text-[var(--p-dim)]">
                      أول ما تُعتمد لك مهمة بتظهر هنا
                    </p>
                  );
                return (
                  <ul className="flex flex-col">
                    {items.map((it) => (
                      <li
                        key={it.key}
                        className="p-row -mx-2 flex items-center gap-3 rounded-xl border-b border-[var(--p-line)] px-2 py-3 text-sm last:border-0"
                      >
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-full ${it.gold ? "bg-[rgb(198_164_92/0.14)] text-[var(--p-gold-soft)]" : "bg-[rgb(200_222_211/0.08)] text-[var(--p-soft)]"}`}
                        >
                          <Sparkles className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{it.text}</span>
                        <span className="shrink-0 text-xs text-[var(--p-dim)]">
                          {it.when.length === 10 ? shortDate(it.when) : relativeTime(it.when)}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </Panel>
          </Rise>
        </div>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  prefix,
}: {
  value: number;
  label: string;
  prefix?: string | undefined;
}) {
  return (
    <div className="px-1 py-3">
      <b className="block font-display text-[22px] leading-tight">
        {prefix}
        <CountUp value={value} />
      </b>
      <span className="text-[11px] text-[var(--p-dim)] sm:text-xs">{label}</span>
    </div>
  );
}

/** Leadership home: how each committee is doing this month (hours approved, active members). */
function LeadershipOverview() {
  const today = todayISO();
  const stats = useMemberStats(monthStart(today), today);
  const { dir } = useDirectory();
  if (!stats.data || !dir)
    return (
      <div className="p-card h-72 p-6">
        <div className="p-skeleton h-full" />
      </div>
    );
  const rows = dir.committees.map((c) => {
    const ms = stats.data.filter((m) => m.committee_id === c.id);
    return {
      c,
      hours: ms.reduce((n, m) => n + m.period_hours, 0),
      active: ms.filter((m) => m.period_hours > 0).length,
      size: ms.length,
      waiting: ms.reduce((n, m) => n + m.awaiting_review, 0),
    };
  });
  const max = Math.max(1, ...rows.map((r) => r.hours));
  const total = rows.reduce((n, r) => n + r.hours, 0);
  const active = rows.reduce((n, r) => n + r.active, 0);
  return (
    <section className="p-card space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-[var(--p-dim)]">المبادرة هذا الشهر</p>
          <p className="mt-1 font-display text-2xl font-extrabold">
            <span className="text-[var(--p-gold-soft)]">
              <CountUp value={total} />
            </span>{" "}
            ساعة معتمدة
          </p>
        </div>
        <p className="text-sm text-[var(--p-soft)]">
          <b className="text-[var(--p-text)]">{fmt(active)}</b> عضو نشط من {fmt(stats.data.length)}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li
            key={r.c.id}
            className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm"
          >
            <span className="truncate">{r.c.name}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(200_222_211/0.08)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.c.accent, transformOrigin: "right" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: r.hours / max }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.05 }}
              />
            </div>
            <span className="w-24 text-start text-xs text-[var(--p-dim)]">
              <b className="text-[var(--p-text)]">{fmt(r.hours)}</b> س · {r.active}/{r.size}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to="/portal/stats"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--p-soft)] hover:text-[var(--p-text)]"
      >
        التفاصيل في الإحصائيات <ArrowLeft className="size-4" />
      </Link>
    </section>
  );
}
