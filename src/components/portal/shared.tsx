import type { ComponentType, ReactNode } from "react";
import { Crown, Gem, Medal, Shield, Sparkles, Star, type LucideProps } from "lucide-react";
import {
  committeeName,
  tierForHours,
  type Member,
  type Role,
  type TaskStatus,
  type Tier,
  type TierId,
} from "@/data/demo";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Formatting */

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortDateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "short",
});

export const formatDate = (iso: string) => dateFmt.format(new Date(`${iso}T12:00:00`));
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(`${iso}T12:00:00`));

/** Whole days from today until the given ISO date (negative = past). */
export function daysUntil(iso: string, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const [y, m, d] = iso.split("-").map(Number);
  const b = new Date(y, m - 1, d).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dueLabel(iso: string, status: TaskStatus) {
  if (status === "done") return { text: "مكتملة", tone: "muted" as const };
  const d = daysUntil(iso);
  if (d < 0) return { text: `متأخرة ${Math.abs(d)} يوم`, tone: "danger" as const };
  if (d === 0) return { text: "تستحق اليوم", tone: "warn" as const };
  if (d <= 7) return { text: `متبقٍ ${d} يوم`, tone: "warn" as const };
  return { text: `متبقٍ ${d} يوم`, tone: "muted" as const };
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "صباح الخير" : "مساء الخير";
}

export const firstName = (name: string) => name.split(" ")[0];

export const hoursLabel = (n: number) => `${n} ${n >= 3 && n <= 10 ? "ساعات" : "ساعة"}`;

/* ------------------------------------------------------------------ Avatar */

const avatarTones = [
  "from-emerald to-forest text-mint",
  "from-forest to-deep text-gold",
  "from-[oklch(0.45_0.07_165)] to-emerald text-ivory",
  "from-[oklch(0.5_0.06_190)] to-forest text-ivory",
  "from-[oklch(0.55_0.07_55)] to-[oklch(0.35_0.05_45)] text-ivory",
];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "");
}

export function MemberAvatar({
  name,
  id,
  size = "md",
  className,
}: {
  name: string;
  id: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const tone = avatarTones[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarTones.length];
  const s = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  }[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-bold ring-2 ring-ivory/70",
        tone,
        s,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------------------------------------------- Tiers */

export const tierStyle: Record<
  TierId,
  { cls: string; text: string; icon: ComponentType<LucideProps> }
> = {
  bronze: { cls: "tier-bronze", text: "text-ivory", icon: Medal },
  silver: { cls: "tier-silver", text: "text-deep", icon: Shield },
  gold: { cls: "tier-gold", text: "text-deep", icon: Star },
  platinum: { cls: "tier-platinum", text: "text-deep", icon: Crown },
  diamond: { cls: "tier-diamond", text: "text-deep", icon: Gem },
};

export const tierShortName = (t: Tier) => t.name.replace("المستوى ", "");

export function TierBadge({
  tier,
  hours,
  size = "md",
  className,
}: {
  tier?: Tier;
  hours?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = tier ?? tierForHours(hours ?? 0);
  const st = tierStyle[t.id];
  const Icon = st.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold shadow-sm",
        st.cls,
        st.text,
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {tierShortName(t)}
    </span>
  );
}

/* -------------------------------------------------------------------- Roles */

export const roleStyle: Record<Role, string> = {
  القائدة: "bg-primary text-primary-foreground",
  النائب: "bg-mint text-primary",
  المستشار: "border border-gold/60 bg-gold/10 text-[oklch(0.45_0.08_75)]",
  عضو: "bg-muted text-muted-foreground",
};

/* ------------------------------------------------------------------- Badges */

export const statusMeta: Record<TaskStatus, { label: string; cls: string }> = {
  new: { label: "جديدة", cls: "bg-[oklch(0.94_0.05_85)] text-[oklch(0.42_0.08_70)]" },
  active: { label: "نشطة", cls: "bg-secondary text-primary" },
  done: { label: "مكتملة", cls: "bg-primary text-primary-foreground" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", m.cls)}
    >
      {m.label}
    </span>
  );
}

export function CommitteeChip({ id, className }: { id: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground/70",
        className,
      )}
    >
      لجنة {committeeName(id)}
    </span>
  );
}

export function SampleBadge({
  children = "بيانات تجريبية",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-gold/60 bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold text-[oklch(0.45_0.08_75)]",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- Layout */

export function PageHeader({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-2xl font-black text-primary md:text-3xl">{title}</h1>
        {text && <p className="mt-1.5 text-muted-foreground">{text}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-3xl border border-border bg-card p-5 shadow-card md:p-6", className)}
    >
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-extrabold text-primary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-primary/20 bg-card/60 px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Icon className="h-7 w-7" />
      </span>
      <p className="font-display text-lg font-extrabold text-primary">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "primary",
  label,
}: {
  value: number;
  className?: string;
  tone?: "primary" | "mint" | "gold";
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full",
        tone === "primary" ? "bg-primary/10" : "bg-ivory/15",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "primary" && "bg-gradient-to-l from-emerald to-[oklch(0.5_0.08_165)]",
          tone === "mint" && "bg-mint",
          tone === "gold" && "bg-gold",
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** Rank of a member in a given month (1-based), ties broken by total hours. */
export function rankMembers(list: Member[], month: string) {
  return [...list].sort(
    (a, b) => (b.monthly[month] ?? 0) - (a.monthly[month] ?? 0) || b.totalHours - a.totalHours,
  );
}
