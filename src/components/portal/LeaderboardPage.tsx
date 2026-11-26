import { AnimatePresence, motion } from "framer-motion";
import { Crown, Hourglass, Search, Sparkles, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { addDays, monthStart, todayISO } from "@/lib/portal/dates";
import { boardOf } from "@/lib/portal/permissions";
import { useLeaderboard, useSummary } from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type { Board, LeaderRow } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import {
  Avatar,
  EASE,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Segmented,
  Skeleton,
  TIER_COLOR,
  TierBadge,
  TierGem,
  fmt,
  hoursLabel,
} from "./ui";

type Period = "month" | "last" | "semester";
const MONTH = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  month: "long",
  year: "numeric",
});

export function LeaderboardPage() {
  const me = useMe();
  const summary = useSummary();
  const myBoard = boardOf(me.role);
  const [board, setBoard] = useState<Board>(myBoard ?? "members");
  // null = not chosen yet: open on this month, or on the semester while this month is still empty.
  const [picked, setPicked] = useState<Period | null>(null);
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const today = todayISO();
  const sem = summary.data?.semester;



  const monthLb = useLeaderboard(board, monthStart(today), today);
  const monthEmpty = !!monthLb.data && !monthLb.data.some((r) => r.rank != null);
  const period: Period = picked ?? (monthEmpty ? "semester" : "month");
  const range = useMemo(() => {
    if (period === "month")
      return {
        from: monthStart(today),
        to: today,
        label: MONTH.format(new Date(today + "T00:00:00")),
      };
    if (period === "last") {
      const end = addDays(monthStart(today), -1);
      return { from: monthStart(end), to: end, label: MONTH.format(new Date(end + "T00:00:00")) };
    }
    return {
      from: sem?.starts_on ?? monthStart(today),
      to: sem?.ends_on ?? today,
      label: sem?.name ?? "الفصل",
    };
  }, [period, today, sem]);
  const lb = useLeaderboard(board, range.from, range.to);
  const rows = lb.data ?? [];
  const meRow = rows.find((r) => r.is_me);
  const shown = q.trim() ? rows.filter((r) => r.full_name.includes(q.trim())) : rows;
  const ranked = rows.filter((r) => r.rank != null);
  const podium =
    q.trim() || ranked.length < 3 ? [] : ranked.filter((r) => r.rank! <= 3).slice(0, 3);
  const restAll = q.trim() ? shown : rows.filter((r) => !podium.includes(r));
  const LIMIT = 17;
  const meCard = useRef<HTMLElement>(null);
  const [meHidden, setMeHidden] = useState(false);
  useEffect(() => {
    const el = meCard.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setMeHidden(!e!.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [meRow?.member_id]);
  const rest = showAll || q.trim() ? restAll : restAll.filter((r, i) => i < LIMIT || r.is_me);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Trophy}
        title="لوحة الصدارة"
        subtitle="الترتيب حسب الساعات المعتمدة · كل واحد يشوف رقمه بس"
        actions={
          <Segmented
            id="lb-period"
            size="sm"
            value={period}
            onChange={setPicked}
            options={[
              { value: "month", label: "هذا الشهر" },
              { value: "last", label: "الشهر الماضي" },
              { value: "semester", label: "الفصل كامل" },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <aside className="flex flex-col gap-5 lg:col-span-4">
          <Segmented
            id="lb-board"
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
            value={board}
            onChange={setBoard}
            options={[
              { value: "members", label: "الأعضاء" },
              { value: "leaders", label: "القادة" },
            ]}
          />
          {period === "month" && <MonthCountdown />}
          {meRow ? (
            <section ref={meCard} className="p-card relative overflow-hidden p-6">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: TIER_COLOR[meRow.tier_id] }}
              />
              <p className="relative text-[13px] text-[var(--p-dim)]">ترتيبك · {range.label}</p>
              <div className="relative mt-2 flex items-baseline gap-3">
                {meRow.rank != null ? (
                  <>
                    <b className="font-display text-5xl font-extrabold">#{meRow.rank}</b>
                    <span className="text-sm text-[var(--p-soft)]">من {fmt(rows.length)}</span>
                  </>
                ) : (
                  <b className="font-display text-2xl font-extrabold leading-snug">
                    ما بدأت في هذي الفترة
                  </b>
                )}
              </div>
              {meRow.rank == null && (
                <Link
                  to="/portal/tasks"
                  search={{ view: "open" }}
                  className="relative mt-2 inline-flex items-center gap-1 text-sm font-bold text-[var(--p-gold-soft)] hover:underline"
                >
                  أول ساعة معتمدة تحطك في الترتيب، شوف المهام المتاحة
                </Link>
              )}
              <p className="relative mt-3 text-sm">
                رصيدك في هذي الفترة: <b>{hoursLabel(meRow.hours ?? 0)}</b>
              </p>
              <div className="relative mt-4">
                <TierBadge tierId={meRow.tier_id} name={`مستواك ${meRow.tier_name}`} />
              </div>
            </section>
          ) : (
            <Panel>
              <p className="text-sm leading-7 text-[var(--p-soft)]">
                {myBoard
                  ? "ما ظهرت في هذي اللوحة، لوحتك هي «" +
                    (myBoard === "leaders" ? "القادة" : "الأعضاء") +
                    "»"
                  : "قيادة المبادرة خارج المنافسة، والأرقام التفصيلية في صفحة الإحصائيات"}
              </p>
            </Panel>
          )}
          <Panel title="المستويات">
            <ul className="flex flex-col gap-2.5 text-sm">
              {[
                ["diamond", "ماسي", "100+"],
                ["platinum", "بلاتيني", "70–99"],
                ["gold", "ذهبي", "40–69"],
                ["silver", "فضي", "20–39"],
                ["bronze", "برونزي", "0–19"],
              ].map(([id, name, range]) => (
                <li
                  key={id}
                  className="p-row -mx-2 flex items-center justify-between rounded-lg px-2 py-1"
                >
                  <span className="flex items-center gap-2" style={{ color: TIER_COLOR[id!] }}>
                    <TierGem tierId={id!} className="size-3.5" /> {name}
                  </span>
                  <span className="text-[var(--p-dim)]" dir="ltr">
                    {range}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-6 text-[var(--p-dim)]">
              المستوى يُحسب من ساعات الفصل الحالي
            </p>
          </Panel>
        </aside>

        <section
          className="p-card p-4 sm:p-6 lg:col-span-8"
          aria-label={`لوحة ${board === "leaders" ? "القادة" : "الأعضاء"}`}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              {board === "leaders" ? "القادة" : "الأعضاء"} · {range.label}
            </h2>
            <label className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
              <input
                className="p-input h-10 min-h-10 ps-10 text-sm"
                placeholder="ابحث عن اسم"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
          </div>

          {lb.isError ? (
            <ErrorState onRetry={() => lb.refetch()} />
          ) : lb.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-40" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Trophy} title="ما فيه ترتيب بعد" />
          ) : (
            <>
              {podium.length === 3 && (
                <Podium rows={podium} standout={period === "semester" ? null : range.label} />
              )}
              {!q.trim() && ranked.length === 0 && (
                <p className="p-well mb-3 px-4 py-3 text-center text-sm leading-7 text-[var(--p-soft)]">
                  ما فيه ساعات معتمدة في هذي الفترة بعد. أول ما تنعتمد أول مهمة يبدأ الترتيب
                </p>
              )}
              <ol className="mt-2 flex flex-col gap-1">
                {rest.map((r, i) => (
                  <motion.li
                    key={r.member_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: Math.min(i, 12) * 0.025 }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                      r.is_me
                        ? "border border-[rgb(198_164_92/0.35)] bg-[rgb(198_164_92/0.08)]"
                        : "hover:bg-[rgb(200_222_211/0.04)]",
                    )}
                  >
                    <b className="w-8 shrink-0 text-center font-display text-[var(--p-dim)]">
                      {r.rank ?? "–"}
                    </b>
                    <Avatar name={r.full_name} size={36} />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">
                        {r.full_name}
                        {r.is_me && (
                          <span className="ms-1.5 text-xs text-[var(--p-gold-soft)]">أنت</span>
                        )}
                      </b>
                      <span className="block truncate text-xs text-[var(--p-dim)]">
                        {[
                          r.committee_title?.replace(/^(لجنة|اللجنة) /, ""),
                          r.team_name,
                          board === "leaders" ? r.title : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {r.is_me && r.hours != null && (
                      <span className="text-sm font-bold">{hoursLabel(r.hours)}</span>
                    )}
                    <TierBadge
                      tierId={r.tier_id}
                      name={r.tier_name}
                      className="hidden sm:inline-flex"
                    />
                    <TierGem tierId={r.tier_id} className="size-4 sm:hidden" />
                  </motion.li>
                ))}
              </ol>
              {!showAll && !q.trim() && restAll.length > rest.length && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="p-btn-ghost mt-3 w-full"
                >
                  عرض الترتيب كامل ({fmt(rows.length)})
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {meRow && meHidden && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[rgb(198_164_92/0.4)] bg-[#0b3328]/95 px-4 py-2.5 shadow-[0_14px_40px_-10px_rgb(0_0_0/0.7)] backdrop-blur-xl lg:hidden"
            role="status"
          >
            <b className="font-display text-2xl font-extrabold text-[var(--p-gold-soft)]">
              {meRow.rank != null ? `#${meRow.rank}` : "–"}
            </b>
            <span className="min-w-0 flex-1 text-sm">
              <b className="block">ترتيبك</b>
              <span className="text-xs text-[var(--p-dim)]">{range.label}</span>
            </span>
            <span className="text-sm font-bold">{hoursLabel(meRow.hours ?? 0)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Time left in the month: the monthly board closes at its end. */
function MonthCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const d = new Date(now);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const left = Math.max(0, end - now);
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const total = end - new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return (
    <section className="p-card flex items-center gap-4 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgb(198_164_92/0.12)] text-[var(--p-gold-soft)]">
        <Hourglass className="p-hourglass size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-[var(--p-dim)]">باقي على نهاية الشهر</p>
        <p className="font-display text-lg font-extrabold">
          {days > 0 ? `${days} ${days > 2 && days < 11 ? "أيام" : "يوم"} و` : ""}
          {hours} {hours > 2 && hours < 11 ? "ساعات" : "ساعة"}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(200_222_211/0.1)]">
          <motion.div
            className="h-full rounded-full bg-[var(--p-gold)]"
            style={{ transformOrigin: "right" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 - left / total }}
            transition={{ duration: 1, ease: EASE }}
          />
        </div>
      </div>
    </section>
  );
}

function Podium({ rows, standout }: { rows: LeaderRow[]; standout: string | null }) {
  const order = [rows[1]!, rows[0]!, rows[2]!];
  const heights = [96, 128, 76];
  return (
    <div
      className="mb-4 grid grid-cols-3 items-end gap-2 sm:gap-4"
      aria-label="المراكز الثلاثة الأولى"
    >
      {order.map((r, i) => (
        <div key={r.member_id} className="flex flex-col items-center gap-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.25 + i * 0.08 }}
            className="p-lift relative flex flex-col items-center gap-2 transition-transform duration-300"
          >
            {r.rank === 1 && (
              <span className="p-bob absolute -top-6" aria-hidden="true">
                <Crown className="size-5 text-[var(--p-gold)]" />
              </span>
            )}
            <Avatar name={r.full_name} size={r.rank === 1 ? 64 : 52} ring={TIER_COLOR[r.tier_id]} />
            <b className="line-clamp-1 text-[13px] sm:text-sm">
              {r.full_name}
              {r.is_me && <span className="block text-[11px] text-[var(--p-gold-soft)]">أنت</span>}
            </b>
            <span className="line-clamp-1 text-[11px] text-[var(--p-dim)]">
              {r.committee_title?.replace(/^(لجنة|اللجنة) /, "")}
            </span>
            {r.rank === 1 && standout && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.8 }}
                className="inline-flex items-center gap-1 rounded-full bg-[rgb(198_164_92/0.16)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--p-gold-soft)]"
                title={`العضو المتميز · ${standout}`}
              >
                <Sparkles className="size-3" /> المتميز
              </motion.span>
            )}
          </motion.div>
          <motion.div
            className={cn(
              "grid w-full place-items-center rounded-t-2xl border border-b-0",
              r.rank === 1
                ? "border-[rgb(198_164_92/0.35)] bg-[linear-gradient(180deg,rgb(198_164_92/0.18),rgb(198_164_92/0.03))]"
                : "border-[var(--p-line)] bg-[linear-gradient(180deg,rgb(200_222_211/0.08),transparent)]",
            )}
            style={{ height: heights[i], transformOrigin: "bottom" }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: i * 0.08 }}
          >
            <b
              className={cn(
                "font-display text-3xl font-extrabold",
                r.rank === 1 ? "text-[var(--p-gold-soft)]" : "text-[var(--p-soft)]",
              )}
            >
              {r.rank}
            </b>
          </motion.div>
        </div>
      ))}
    </div>
  );
}
