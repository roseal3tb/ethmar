import { motion } from "framer-motion";
import { Clock3, Hourglass } from "lucide-react";
import { useMemo } from "react";
import { shortDate, todayISO } from "@/lib/portal/dates";
import { useMyHours, useSummary } from "@/lib/portal/queries";
import type { HourEntry } from "@/lib/portal/types";
import {
  CountUp,
  EASE,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Panel,
  fmt,
  hoursLabel,
} from "./ui";

const MONTH = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long" });
const MONTH_Y = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  month: "long",
  year: "numeric",
});

export function HoursPage() {
  const summary = useSummary();
  const hours = useMyHours();
  const today = todayISO();

  const months = useMemo(() => {
    const sem = summary.data?.semester;
    const start = sem?.starts_on ?? today;
    const end = sem && sem.ends_on < today ? sem.ends_on : today;
    const list: { key: string; label: string; total: number }[] = [];
    const d = new Date(start.slice(0, 7) + "-01T00:00:00");
    while (d.toISOString().slice(0, 7) <= end.slice(0, 7) && list.length < 12) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      list.push({ key, label: MONTH.format(d), total: 0 });
      d.setMonth(d.getMonth() + 1);
    }
    for (const h of hours.data ?? []) {
      const m = list.find((x) => x.key === h.earned_on.slice(0, 7));
      if (m) m.total += h.hours;
    }
    return list;
  }, [hours.data, summary.data, today]);

  const grouped = useMemo(() => {
    const g = new Map<string, HourEntry[]>();
    for (const h of hours.data ?? []) {
      const k = h.earned_on.slice(0, 7);
      g.set(k, [...(g.get(k) ?? []), h]);
    }
    return [...g.entries()];
  }, [hours.data]);

  if (summary.isError || hours.isError)
    return (
      <ErrorState
        onRetry={() => {
          summary.refetch();
          hours.refetch();
        }}
      />
    );
  if (!summary.data || !hours.data) return <PageSkeleton />;
  const s = summary.data;
  const max = Math.max(4, ...months.map((m) => m.total));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Clock3}
        title="ساعاتي"
        subtitle="ساعاتك خاصة فيك، ما يشوفها إلا أنت وقادتك"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "ساعات الفصل", value: s.semester_hours, gold: true },
          { label: "هذا الشهر", value: s.month_hours },
          { label: "بانتظار الاعتماد", value: s.pending_hours },
          { label: "كل الساعات", value: s.total_hours },
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
              className={`mt-1 block font-display text-3xl font-extrabold ${t.gold ? "text-[var(--p-gold-soft)]" : ""}`}
            >
              <CountUp value={t.value} />
            </b>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <Panel title="ساعاتك خلال الفصل" className="lg:col-span-5">
          <div
            className="flex h-48 items-end gap-3"
            role="img"
            aria-label={months.map((m) => `${m.label}: ${fmt(m.total)}`).join("، ")}
          >
            {months.map((m, i) => (
              <div
                key={m.key}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-xs font-bold text-[var(--p-soft)]">
                  {m.total ? fmt(m.total) : ""}
                </span>
                <motion.div
                  className="w-full max-w-12 rounded-t-xl"
                  style={{
                    height: `${(m.total / max) * 100}%`,
                    minHeight: 4,
                    transformOrigin: "bottom",
                    background:
                      m.key === today.slice(0, 7)
                        ? "linear-gradient(180deg,#E2C98F,#C6A45C)"
                        : "linear-gradient(180deg,rgb(200 222 211/.45),rgb(200 222 211/.18))",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.06 }}
                />
                <span className="text-[11px] text-[var(--p-dim)]">{m.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="السجل" className="lg:col-span-7">
          {grouped.length === 0 ? (
            <EmptyState
              icon={Hourglass}
              title="ما فيه ساعات معتمدة بعد"
              body="كل مهمة تنعتمد لك تنضاف هنا تلقائيًا."
            />
          ) : (
            <div className="flex flex-col gap-5">
              {grouped.map(([month, list]) => (
                <div key={month}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <b className="text-[var(--p-dim)]">
                      {MONTH_Y.format(new Date(month + "-01T00:00:00"))}
                    </b>
                    <span className="text-[var(--p-soft)]">
                      {hoursLabel(list.reduce((n, h) => n + h.hours, 0))}
                    </span>
                  </div>
                  <ul className="flex flex-col">
                    {list.map((h) => (
                      <li
                        key={h.id}
                        className="p-row -mx-2 flex items-center gap-3 rounded-xl border-b border-[var(--p-line)] px-2 py-3 last:border-0"
                      >
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgb(198_164_92/0.12)] font-display font-bold text-[var(--p-gold-soft)]"
                          dir="ltr"
                        >
                          +{fmt(h.hours)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {h.description ?? (h.task_id ? "مهمة" : "ساعات مضافة")}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--p-dim)]">
                          {shortDate(h.earned_on)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
