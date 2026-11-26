// Small building blocks shared by every portal page (dark Ethmar look, calm motion).
import { animate, motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Member, Role } from "@/lib/portal/types";

export const EASE = [0.22, 1, 0.36, 1] as const;
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const fmt = (n: number) => nf.format(n);

export function hoursLabel(h: number): string {
  if (h === 1) return "ساعة";
  if (h === 2) return "ساعتين";
  if (h >= 3 && h <= 10 && Number.isInteger(h)) return `${fmt(h)} ساعات`;
  return `${fmt(h)} ساعة`;
}

export function seatsLabel(n: number): string {
  if (n === 1) return "مقعد واحد";
  if (n === 2) return "مقعدين";
  if (n >= 3 && n <= 10) return `${n} مقاعد`;
  return `${n} مقعد`;
}

const ROLE_LABEL: Record<Role, string> = {
  member: "عضو",
  team_lead: "قائد الفريق",
  team_deputy: "نائب قائد الفريق",
  team_supervisor: "إشراف",
  project_lead: "قائد مشروع",
  committee_lead: "قائد اللجنة",
  committee_deputy: "نائب قائد اللجنة",
  vice_president: "نائب الرئيس",
  president: "رئيس المبادرة",
};
export const titleOf = (m: Pick<Member, "title" | "role">) => m.title ?? ROLE_LABEL[m.role];

export function initials(name: string): string {
  const parts = name.replace(/^(ال)/, "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const lastWord = parts.length > 1 ? parts[parts.length - 1]!.replace(/^ال/, "") : "";
  return first + (lastWord[0] ?? "");
}

/* ───────── layout ───────── */

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: ComponentType<{ className?: string | undefined }>;
  title: string;
  subtitle?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] border border-[var(--p-line-strong)] bg-[rgb(200_222_211/0.07)] text-[var(--p-soft)]">
          <Icon className="size-[22px]" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-[28px]">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-[var(--p-dim)]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  action,
  className,
  children,
  as: As = "section",
  ...rest
}: {
  title?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
  children: ReactNode;
  as?: "section" | "div" | "aside";
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <As className={cn("p-card p-5 sm:p-6", className)} {...rest}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {typeof title === "string" ? (
            <h2 className="font-display text-lg font-bold">{title}</h2>
          ) : (
            title
          )}
          {action}
        </div>
      )}
      {children}
    </As>
  );
}

/* ───────── atoms ───────── */

type Tone = "ok" | "warn" | "bad" | "gold" | "soft" | "dim";
const TONE: Record<Tone, string> = {
  ok: "bg-[rgb(143_217_179/0.13)] text-[var(--p-ok)]",
  warn: "bg-[rgb(232_194_122/0.14)] text-[var(--p-warn)]",
  bad: "bg-[rgb(242_165_142/0.14)] text-[var(--p-bad)]",
  gold: "bg-[rgb(198_164_92/0.16)] text-[var(--p-gold-soft)]",
  soft: "bg-[rgb(200_222_211/0.1)] text-[var(--p-soft)]",
  dim: "bg-[rgb(200_222_211/0.05)] text-[var(--p-dim)]",
};
export function Chip({
  tone = "soft",
  className,
  children,
}: {
  tone?: Tone | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const TIER_COLOR: Record<string, string> = {
  bronze: "#D39A6A",
  silver: "#C4CDD4",
  gold: "#E2C98F",
  platinum: "#A9D9D6",
  diamond: "#A3D4F7",
};
export function TierBadge({
  tierId,
  name,
  className,
}: {
  tierId: string;
  name: string;
  className?: string | undefined;
}) {
  const c = TIER_COLOR[tierId] ?? "#C8DED3";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
        className,
      )}
      style={{ color: c, background: `color-mix(in oklab, ${c} 14%, transparent)` }}
    >
      <TierGem tierId={tierId} className="size-3" />
      {name}
    </span>
  );
}
export function TierGem({ tierId, className }: { tierId: string; className?: string | undefined }) {
  const c = TIER_COLOR[tierId] ?? "#C8DED3";
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path d="M6 .8 11 4.6 6 11.2 1 4.6Z" fill={c} opacity=".9" />
      <path
        d="M1 4.6h10M6 .8 4.2 4.6 6 11.2 7.8 4.6Z"
        fill="none"
        stroke="#031F19"
        strokeOpacity=".35"
        strokeWidth=".7"
      />
    </svg>
  );
}

export function Avatar({
  name,
  size = 40,
  ring,
  className,
}: {
  name: string;
  size?: number | undefined;
  ring?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[#0F3A2F] font-display font-extrabold text-[var(--p-soft)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.34)),
        boxShadow: ring ? `0 0 0 2px ${ring}` : "inset 0 0 0 1px rgb(200 222 211 / 0.14)",
      }}
    >
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string | undefined }) {
  return <div className={cn("p-skeleton", className)} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="جارٍ التحميل">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-12" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-1" />
        <Skeleton className="h-64 lg:col-span-2" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string | undefined }>;
  title: string;
  body?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-2xl border border-dashed border-[var(--p-line-strong)] text-[var(--p-dim)]">
        <Icon className="size-6" />
      </span>
      <p className="font-display text-base font-bold">{title}</p>
      {body && <p className="max-w-sm text-sm text-[var(--p-dim)]">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="p-card flex flex-col items-center gap-3 p-8 text-center" role="alert">
      <p className="font-display font-bold">تعذّر تحميل البيانات</p>
      <p className="text-sm text-[var(--p-dim)]">تأكد من اتصالك بالإنترنت وحاول مرة ثانية</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="p-btn-ghost">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

/* ───────── controls ───────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number | undefined }[];
  id: string;
  className?: string | undefined;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-[var(--p-line)] bg-[rgb(200_222_211/0.04)] p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl font-bold transition-colors",
              size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm",
              active ? "text-[var(--p-bg)]" : "text-[var(--p-soft)] hover:text-[var(--p-text)]",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-[var(--p-soft)]"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">{o.label}</span>
            {o.count != null && o.count > 0 && (
              <span
                className={cn(
                  "relative min-w-5 rounded-full px-1.5 text-[11px] leading-5",
                  active
                    ? "bg-[var(--p-bg)]/15"
                    : "bg-[rgb(198_164_92/0.2)] text-[var(--p-gold-soft)]",
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── motion ───────── */

export function CountUp({
  value,
  className,
  suffix,
}: {
  value: number;
  className?: string | undefined;
  suffix?: string | undefined;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt(value) + (suffix ?? "");
      return;
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => (el.textContent = fmt(Math.round(v * 10) / 10) + (suffix ?? "")),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce, suffix]);
  return (
    <span ref={ref} className={className}>
      {fmt(reduce ? value : 0)}
      {suffix}
    </span>
  );
}

export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Fades a page section in on mount. */
export function Rise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number | undefined;
  className?: string | undefined;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Progress bar that fills calmly when it appears. */
export function Meter({
  value,
  color = "var(--p-gold)",
  className,
}: {
  value: number;
  color?: string | undefined;
  className?: string | undefined;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-[rgb(200_222_211/0.1)]", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, transformOrigin: "right" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
      />
    </div>
  );
}

/** True after the first client render (portal data lives in the browser). */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
