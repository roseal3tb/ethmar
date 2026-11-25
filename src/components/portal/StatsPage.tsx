import { motion } from "framer-motion";
import { ArrowDownUp, BarChart3, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { monthStart, todayISO } from "@/lib/portal/dates";
import { isCommitteeHead, isLeadership, isTeamHead } from "@/lib/portal/permissions";
import { useDirectory, useMemberStats, useSummary } from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type { MemberStat } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Chip,
  CountUp,
  EASE,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Segmented,
  TierBadge,
  fmt,
  titleOf,
} from "./ui";

type Period = "month" | "semester";
type Tab = "members" | "leaders";
type SortKey =
  | "period_hours"
  | "semester_hours"
  | "active_tasks"
  | "awaiting_review"
  | "approved_tasks"
  | "full_name";
const TIER_ID: Record<string, string> = {
  برونزي: "bronze",
  فضي: "silver",
  ذهبي: "gold",
  بلاتيني: "platinum",
  ماسي: "diamond",
};

export function StatsPage() {
  const me = useMe();
  const { dir } = useDirectory();
  const summary = useSummary();
  const leadership = isLeadership(me);
  const [period, setPeriod] = useState<Period>("month");
  const [tab, setTab] = useState<Tab>("members");
  const [committee, setCommittee] = useState("all");
  const [team, setTeam] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "period_hours", dir: -1 });
  const today = todayISO();
  const sem = summary.data?.semester;
  const from = period === "month" ? monthStart(today) : (sem?.starts_on ?? monthStart(today));
  const to = period === "month" ? today : (sem?.ends_on ?? today);
  const stats = useMemberStats(from, to, !!summary.data);

  const rows = useMemo(() => {
    let r = stats.data ?? [];
    if (leadership)
      r = r.filter((s) => (tab === "members" ? s.role === "member" : s.role !== "member"));
    if (committee !== "all") r = r.filter((s) => s.committee_id === committee);
    if (team !== "all") r = r.filter((s) => (team === "none" ? !s.team_id : s.team_id === team));
    if (q.trim()) r = r.filter((s) => s.full_name.includes(q.trim()));
    const k = sort.key;
    return [...r].sort(
      (a, b) =>
        (k === "full_name"
          ? a.full_name.localeCompare(b.full_name, "ar")
          : (a[k] as number) - (b[k] as number)) * sort.dir,
    );
  }, [stats.data, leadership, tab, committee, team, q, sort]);

  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;
  if (!dir || !stats.data) return <PageSkeleton />;

  const scopeLabel = leadership
    ? "كل المبادرة"
    : isCommitteeHead(me)
      ? (dir.committee(me.committee_id)?.title ?? "")
      : isTeamHead(me)
        ? (dir.team(me.team_id)?.name ?? "")
        : "";
  const committeeTeams =
    !leadership && isCommitteeHead(me) && me.committee_id
      ? dir.teamsOf(me.committee_id)
      : committee !== "all"
        ? dir.teamsOf(committee)
        : [];
  const totals = {
    hours: rows.reduce((n, r) => n + r.period_hours, 0),
    active: rows.filter((r) => r.period_hours > 0).length,
    waiting: rows.reduce((n, r) => n + r.awaiting_review, 0),
    inProgress: rows.reduce((n, r) => n + r.active_tasks, 0),
  };

  function exportCsv() {
    const head = [
      "الاسم",
      "اللجنة",
      "الفريق",
      "المسمى",
      "ساعات الفترة",
      "ساعات الفصل",
      "المستوى",
      "مهام جارية",
      "بانتظار الاعتماد",
      "مهام معتمدة",
    ];
    const lines = rows.map((r) =>
      [
        r.full_name,
        dir!.committee(r.committee_id)?.title ?? "",
        dir!.team(r.team_id)?.name ?? "",
        r.title ?? "",
        r.period_hours,
        r.semester_hours,
        r.tier_name,
        r.active_tasks,
        r.awaiting_review,
        r.approved_tasks,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ethmar-stats-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const th = (key: SortKey, label: string, cls = "") => (
    <th
      scope="col"
      className={cn("px-3 py-3 font-bold", cls)}
      aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : -1 }))}
        className="inline-flex items-center gap-1 hover:text-[var(--p-text)]"
      >
        {label}
        <ArrowDownUp
          className={cn("size-3", sort.key === key ? "text-[var(--p-gold)]" : "opacity-40")}
        />
      </button>
    </th>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={BarChart3}
        title="الإحصائيات"
        subtitle={scopeLabel}
        actions={
          <>
            <Segmented
              id="st-period"
              size="sm"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "month", label: "هذا الشهر" },
                { value: "semester", label: "الفصل" },
              ]}
            />
            <button type="button" className="p-btn-ghost" onClick={exportCsv}>
              <Download className="size-4" /> تصدير
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: period === "month" ? "ساعات هذا الشهر" : "ساعات الفصل",
            value: totals.hours,
            gold: true,
          },
          { label: "أعضاء نشطين", value: totals.active, suffix: ` / ${rows.length}` },
          { label: "مهام جارية", value: totals.inProgress },
          { label: "بانتظار الاعتماد", value: totals.waiting },
        ].map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: i * 0.05 }}
            className="p-card p-5"
          >
            <p className="text-[13px] text-[var(--p-dim)]">{t.label}</p>
            <b
              className={cn(
                "mt-1 block font-display text-3xl font-extrabold",
                t.gold && "text-[var(--p-gold-soft)]",
              )}
            >
              <CountUp value={t.value} />
              {t.suffix && (
                <span className="text-base font-bold text-[var(--p-dim)]">{t.suffix}</span>
              )}
            </b>
          </motion.div>
        ))}
      </div>

      <section className="p-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--p-line)] p-4">
          {leadership && (
            <Segmented
              id="st-tab"
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: "members", label: "الأعضاء" },
                { value: "leaders", label: "القادة" },
              ]}
            />
          )}
          {leadership && (
            <select
              className="p-input h-10 min-h-10 w-auto py-1 text-sm"
              value={committee}
              onChange={(e) => {
                setCommittee(e.target.value);
                setTeam("all");
              }}
              aria-label="اللجنة"
            >
              <option value="all">كل اللجان</option>
              {dir.committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          {committeeTeams.length > 0 && (
            <select
              className="p-input h-10 min-h-10 w-auto py-1 text-sm"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              aria-label="الفريق"
            >
              <option value="all">كل الفرق</option>
              {committeeTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="none">بدون فريق</option>
            </select>
          )}
          <label className="relative ms-auto w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
            <input
              className="p-input h-10 min-h-10 ps-10 text-sm"
              placeholder="ابحث عن اسم"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="ما فيه بيانات" body="غيّر التصفية أو الفترة." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[rgb(200_222_211/0.03)] text-start text-xs text-[var(--p-dim)]">
                <tr className="text-start">
                  {th("full_name", "العضو", "text-start")}
                  {th("period_hours", period === "month" ? "الشهر" : "الفترة")}
                  {th("semester_hours", "الفصل")}
                  <th scope="col" className="px-3 py-3 font-bold">
                    المستوى
                  </th>
                  {th("active_tasks", "جارية")}
                  {th("awaiting_review", "للاعتماد")}
                  {th("approved_tasks", "معتمدة")}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Row
                    key={r.member_id}
                    r={r}
                    where={[
                      leadership ? dir.committee(r.committee_id)?.name : null,
                      dir.team(r.team_id)?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ r, where }: { r: MemberStat; where: string }) {
  return (
    <tr className="border-t border-[var(--p-line)] text-center transition-colors hover:bg-[rgb(200_222_211/0.03)]">
      <td className="px-3 py-3 text-start">
        <span className="flex items-center gap-3">
          <Avatar name={r.full_name} size={32} />
          <span className="min-w-0">
            <b className="block truncate">{r.full_name}</b>
            <span className="block truncate text-xs text-[var(--p-dim)]">
              {[r.role !== "member" ? titleOf(r) : null, where].filter(Boolean).join(" · ")}
            </span>
          </span>
        </span>
      </td>
      <td className="px-3 py-3 font-display text-base font-bold">{fmt(r.period_hours)}</td>
      <td className="px-3 py-3 text-[var(--p-soft)]">{fmt(r.semester_hours)}</td>
      <td className="px-3 py-3">
        <TierBadge tierId={TIER_ID[r.tier_name] ?? "bronze"} name={r.tier_name} />
      </td>
      <td className="px-3 py-3">
        {r.active_tasks || <span className="text-[var(--p-dim)]">—</span>}
      </td>
      <td className="px-3 py-3">
        {r.awaiting_review ? (
          <Chip tone="warn">{r.awaiting_review}</Chip>
        ) : (
          <span className="text-[var(--p-dim)]">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        {r.approved_tasks || <span className="text-[var(--p-dim)]">—</span>}
      </td>
    </tr>
  );
}
