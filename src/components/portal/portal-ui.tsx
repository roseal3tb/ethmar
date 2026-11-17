import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tiers, type Member, type TierId } from "@/data/demo";

export const portalViews = ["account", "leaderboard", "community", "tasks", "labs"] as const;
export type PortalView = (typeof portalViews)[number];
export const isPortalView = (value: unknown): value is PortalView =>
  typeof value === "string" && (portalViews as readonly string[]).includes(value);

export const tierClasses: Record<TierId, string> = {
  bronze: "border-orange-200 bg-orange-50 text-orange-900",
  silver: "border-slate-200 bg-slate-100 text-slate-700",
  gold: "border-amber-200 bg-amber-50 text-amber-800",
  platinum: "border-sky-200 bg-sky-50 text-sky-800",
  diamond: "border-cyan-200 bg-cyan-50 text-cyan-800",
};

export function TierBadge({ tier, className }: { tier: TierId; className?: string }) {
  const item = tiers.find((t) => t.id === tier);
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold", tierClasses[tier], className)}>
    <span aria-hidden="true" className="text-[10px]">◆</span>{item?.name ?? tier}
  </span>;
}

export function Avatar({ member, name, size = "md" }: { member?: Member | null; name?: string; size?: "md" | "lg" | "sm" }) {
  const title = name || member?.name || "عضو إثمار";
  const initials = title.split(" ").filter(Boolean).slice(0, 2).map((part) => part.slice(0, 1)).join("");
  return <div role="img" aria-label={`الصورة الرمزية: ${title}`} className={cn(
    "grid shrink-0 place-items-center rounded-2xl border border-emerald/10 bg-gradient-to-br from-mint to-ivory font-display font-extrabold text-emerald",
    size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-9 w-9 rounded-xl text-xs" : "h-12 w-12 text-base",
  )}>{initials}</div>;
}

export function PortalCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[1.5rem] border border-emerald/10 bg-white p-5 shadow-[0_12px_40px_-34px_rgba(3,31,25,.65)] sm:p-6", className)}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, description, trailing }: { eyebrow?: string; title: string; description?: string; trailing?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="mb-1 text-xs font-bold tracking-wide text-forest/65">{eyebrow}</p>}
      <h2 className="font-display text-2xl font-black text-deep sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>}
    </div>
    {trailing}
  </div>;
}

export const formatNumber = (n: number) => n.toLocaleString("en-US");
export const formatDate = (date: string) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
}).format(new Date(`${date}T12:00:00Z`));
