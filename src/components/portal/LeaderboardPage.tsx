import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Info, Medal } from "lucide-react";
import { committeeName, members, months, tiers, type Member } from "@/data/demo";
import { useDemoAuth } from "@/lib/demo-auth";
import { cn } from "@/lib/utils";
import {
  MemberAvatar,
  PageHeader,
  Panel,
  SampleBadge,
  TierBadge,
  rankMembers,
  tierStyle,
} from "./shared";

const podiumStyle = [
  { h: "h-40 md:h-48", ring: "ring-gold", label: "الأول", medal: "tier-gold text-deep" },
  {
    h: "h-28 md:h-36",
    ring: "ring-[oklch(0.8_0.01_240)]",
    label: "الثاني",
    medal: "tier-silver text-deep",
  },
  {
    h: "h-20 md:h-28",
    ring: "ring-[oklch(0.65_0.09_55)]",
    label: "الثالث",
    medal: "tier-bronze text-ivory",
  },
];

export function LeaderboardPage() {
  const { member: me } = useDemoAuth();
  const reduce = useReducedMotion();
  const [month, setMonth] = useState(months[months.length - 1].id);
  const ranked = useMemo(() => rankMembers(members, month), [month]);
  const monthLabel = months.find((m) => m.id === month)?.label ?? "";
  const top = ranked.slice(0, 3);
  const max = ranked[0]?.monthly[month] ?? 1;
  const myRank = me ? ranked.findIndex((m) => m.id === me.id) + 1 : 0;

  // Visual order: 2nd, 1st, 3rd (1st in the centre; RTL renders the first item on the right).
  const podiumOrder = [1, 0, 2].filter((i) => top[i]);

  return (
    <div className="space-y-6">
      <PageHeader title="لوحة الصدارة" text="ترتيب الأعضاء حسب الساعات التطوعية الشهرية.">
        <div
          role="radiogroup"
          aria-label="اختيار الشهر"
          className="inline-flex rounded-full border border-border bg-card p-1 shadow-card"
        >
          {months.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={month === m.id}
              onClick={() => setMonth(m.id)}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-bold transition-colors sm:px-4",
                month === m.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted",
              )}
            >
              {m.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <SampleBadge>بيانات نموذجية للعرض</SampleBadge>
        الترتيب والمستويات أدناه أمثلة توضيحية وليست سجلات أو سياسات معتمدة.
      </div>

      {/* Podium */}
      <section
        aria-label={`المراكز الثلاثة الأولى — ${monthLabel}`}
        className="bg-emerald-soft grain relative overflow-hidden rounded-[2rem] px-4 pb-0 pt-8 text-ivory md:px-10 md:pt-10"
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl"
          aria-hidden
        />
        <p className="relative text-center text-sm text-mint/80">أبطال {monthLabel}</p>
        <ol className="relative mt-6 grid grid-cols-3 items-end gap-2 md:gap-6">
          {podiumOrder.map((idx) => {
            const m = top[idx];
            const st = podiumStyle[idx];
            return (
              <li
                key={`${month}-${m.id}`}
                className="flex flex-col items-center text-center"
                aria-label={`المركز ${st.label}: ${m.name}`}
              >
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative">
                    <MemberAvatar
                      name={m.name}
                      id={m.id}
                      size={idx === 0 ? "xl" : "lg"}
                      className={cn("ring-4", st.ring)}
                    />
                    <span
                      className={cn(
                        "absolute -bottom-1 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full font-display text-sm font-black shadow-lg",
                        st.medal,
                      )}
                    >
                      {idx + 1}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-1 max-w-full font-display text-sm font-bold md:text-base">
                    {m.name}
                  </p>
                  <p className="text-xs text-mint/70">لجنة {committeeName(m.committee)}</p>
                  <p className="mt-1.5 font-display text-2xl font-black text-ivory">
                    {m.monthly[month]}{" "}
                    <span className="text-xs font-medium text-ivory/60">ساعة</span>
                  </p>
                </motion.div>
                <motion.div
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: 0.15 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "mt-4 w-full origin-bottom rounded-t-2xl border border-b-0 border-ivory/15 bg-ivory/[0.08]",
                    st.h,
                  )}
                >
                  <div className="flex justify-center pt-3">
                    <TierBadge hours={m.totalHours} size="sm" />
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ol>
      </section>

      {me && myRank > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/20 bg-secondary/50 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <MemberAvatar name={me.name} id={me.id} />
            <div>
              <p className="text-sm font-bold text-primary">ترتيبك في {monthLabel}</p>
              <p className="text-xs text-muted-foreground">
                {me.monthly[month] ?? 0} ساعة هذا الشهر · {me.totalHours} ساعة إجمالًا
              </p>
            </div>
          </div>
          <span className="font-display text-3xl font-black text-primary" dir="ltr">
            #{myRank}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Full ranking */}
        <Panel title={`الترتيب الكامل — ${monthLabel}`} className="lg:col-span-2">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[20rem] border-separate border-spacing-y-1.5 text-sm">
              <caption className="sr-only">ترتيب الأعضاء حسب ساعات {monthLabel}</caption>
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="px-2 pb-1 text-start font-medium">
                    #
                  </th>
                  <th scope="col" className="px-2 pb-1 text-start font-medium">
                    العضو
                  </th>
                  <th scope="col" className="hidden px-2 pb-1 text-start font-medium md:table-cell">
                    اللجنة
                  </th>
                  <th scope="col" className="px-2 pb-1 text-start font-medium">
                    الساعات الشهرية
                  </th>
                  <th scope="col" className="hidden px-2 pb-1 text-start font-medium sm:table-cell">
                    المستوى
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((m, i) => (
                  <Row
                    key={m.id}
                    m={m}
                    rank={i + 1}
                    month={month}
                    max={max}
                    isMe={m.id === me?.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Tiers */}
        <Panel title="مستويات العضوية" action={<SampleBadge>تجريبية</SampleBadge>}>
          <ul className="space-y-2.5">
            {[...tiers].reverse().map((t) => {
              const Icon = tierStyle[t.id].icon;
              const next = tiers[tiers.indexOf(t) + 1];
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
                      tierStyle[t.id].cls,
                      tierStyle[t.id].text,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {next
                        ? `من ${t.minHours} إلى ${next.minHours - 1} ساعة`
                        : `${t.minHours} ساعة فأكثر`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            العتبات قيم افتراضية قابلة للتعديل، ولا تمثل سياسة معتمدة من إثمار. يُحتسب المستوى من
            إجمالي الساعات.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Row({
  m,
  rank,
  month,
  max,
  isMe,
}: {
  m: Member;
  rank: number;
  month: string;
  max: number;
  isMe: boolean;
}) {
  const hours = m.monthly[month] ?? 0;
  const cell = cn(
    "px-2 py-2.5 first:rounded-s-2xl last:rounded-e-2xl",
    isMe ? "bg-secondary/70" : "bg-[oklch(0.985_0.006_100)]",
  );
  return (
    <tr aria-current={isMe ? "true" : undefined}>
      <td className={cell}>
        {rank <= 3 ? (
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              podiumStyle[rank - 1].medal,
            )}
            aria-label={`المركز ${rank}`}
          >
            <Medal className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="flex h-7 w-7 items-center justify-center font-display font-bold text-muted-foreground">
            {rank}
          </span>
        )}
      </td>
      <td className={cell}>
        <div className="flex items-center gap-2.5">
          <MemberAvatar name={m.name} id={m.id} size="sm" className="ring-0" />
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">
              {m.name}
              {isMe && (
                <span className="ms-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] text-primary-foreground">
                  أنت
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground md:hidden">
              لجنة {committeeName(m.committee)}
            </p>
          </div>
        </div>
      </td>
      <td className={cn(cell, "hidden text-muted-foreground md:table-cell")}>
        {committeeName(m.committee)}
      </td>
      <td className={cell}>
        <div className="flex items-center gap-2">
          <span className="w-7 font-display font-black text-primary">{hours}</span>
          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-primary/10 lg:block">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${(hours / max) * 100}%` }}
            />
          </span>
        </div>
      </td>
      <td className={cn(cell, "hidden sm:table-cell")}>
        <TierBadge hours={m.totalHours} size="sm" />
      </td>
    </tr>
  );
}
