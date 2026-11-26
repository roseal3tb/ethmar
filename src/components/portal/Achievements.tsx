import { Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlarmClockCheck,
  Apple,
  Bean,
  ChevronLeft,
  Crown,
  Lock,
  MessageCircleHeart,
  ShoppingBasket,
  Shrub,
  Sprout,
  Star,
  TreeDeciduous,
  Trees,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { shortDate } from "@/lib/portal/dates";
import { useAchievements } from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type { Achievement } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { EASE, fmt } from "./ui";

type Meta = {
  name: string;
  /** What earns it. */
  how: string;
  icon: ComponentType<{ className?: string | undefined; strokeWidth?: number }>;
  /** Two colours of the medal (inner, outer). */
  hue: [string, string];
  unit?: string | undefined;
};

export const ACHIEVEMENTS: Record<string, Meta> = {
  seed: { name: "بذرة", how: "انضممت لإثمار", icon: Bean, hue: ["#C8DED3", "#5E8C78"] },
  sprout: { name: "أول غرسة", how: "سحبت أول مهمة", icon: Sprout, hue: ["#B9E4C9", "#3F8F66"] },
  first_fruit: {
    name: "أول ثمرة",
    how: "انعتمدت أول مهمة لك",
    icon: Apple,
    hue: ["#F2C48D", "#C07A3A"],
  },
  roots: {
    name: "جذور",
    how: "10 ساعات تطوعية",
    icon: Shrub,
    hue: ["#C9D9A6", "#6E8B3D"],
    unit: "ساعة",
  },
  basket: {
    name: "سلّة ثمار",
    how: "5 مهام معتمدة",
    icon: ShoppingBasket,
    hue: ["#EFD39A", "#B08A3E"],
    unit: "مهمة",
  },
  on_time: {
    name: "في الموعد",
    how: "5 مهام سلّمتها قبل موعدها",
    icon: AlarmClockCheck,
    hue: ["#A8D8E0", "#3D8794"],
    unit: "مهمة",
  },
  voice: {
    name: "صوتك مسموع",
    how: "جاوبت أول استبيان",
    icon: MessageCircleHeart,
    hue: ["#E9B8C6", "#A65A74"],
  },
  trunk: {
    name: "جذع",
    how: "50 ساعة تطوعية",
    icon: TreeDeciduous,
    hue: ["#D9C2A0", "#8A6A40"],
    unit: "ساعة",
  },
  star: {
    name: "نجم الشهر",
    how: "الأول في الصدارة لشهر كامل",
    icon: Star,
    hue: ["#F5DE9A", "#C6A45C"],
  },
  orchard: {
    name: "بستان",
    how: "25 مهمة معتمدة",
    icon: Trees,
    hue: ["#9FD3B4", "#2E7D57"],
    unit: "مهمة",
  },
  tree: {
    name: "شجرة مثمرة",
    how: "100 ساعة تطوعية",
    icon: TreeDeciduous,
    hue: ["#F0CF86", "#9C7A2F"],
    unit: "ساعة",
  },
  leader: {
    name: "قيادة",
    how: "تقود فريق أو لجنة أو مشروع",
    icon: Crown,
    hue: ["#E8D9A8", "#A78A45"],
  },
};

/** Round medal with a growth ring that fills with progress. */
export function Medal({
  a,
  size = 76,
  delay = 0,
}: {
  a: Achievement;
  size?: number | undefined;
  delay?: number | undefined;
}) {
  const meta = ACHIEVEMENTS[a.id] ?? ACHIEVEMENTS["seed"]!;
  const reduce = useReducedMotion();
  const Icon = meta.icon;
  const pct = a.goal ? Math.min(1, a.progress / a.goal) : 0;
  const r = 46;
  const len = 2 * Math.PI * r;
  const id = `m-${a.id}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={meta.hue[0]} />
            <stop offset="100%" stopColor={meta.hue[1]} />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(200 222 211 / 0.1)" strokeWidth="5" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={a.unlocked ? meta.hue[0] : "var(--p-gold)"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={len}
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: len }}
          animate={{ strokeDashoffset: len * (1 - (a.unlocked ? 1 : pct)) }}
          transition={{ duration: reduce ? 0 : 1.2, ease: EASE, delay: delay + 0.1 }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r="37"
          fill={a.unlocked ? `url(#${id}-g)` : "rgb(200 222 211 / 0.06)"}
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay }}
          style={{ transformOrigin: "50px 50px" }}
        />
        {a.unlocked && (
          <circle
            cx="50"
            cy="50"
            r="37"
            fill="none"
            stroke="rgb(255 255 255 / 0.25)"
            strokeWidth="1"
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {a.unlocked ? (
          <Icon className="size-[38%] text-[#08291f] drop-shadow-sm" strokeWidth={2.1} />
        ) : (
          <span className="relative grid place-items-center">
            <Icon className="size-[34px] text-[var(--p-dim)] opacity-40" strokeWidth={1.8} />
            <Lock className="absolute -bottom-1 -end-2 size-3.5 text-[var(--p-dim)]" />
          </span>
        )}
      </div>
      {a.unlocked && (
        // CSS, not framer: an endless framer animation would keep the page transition from finishing.
        <span
          aria-hidden="true"
          className="p-glow pointer-events-none absolute inset-[12%] rounded-full"
          style={{ boxShadow: `0 0 28px 2px ${meta.hue[0]}55`, animationDelay: `${delay}s` }}
        />
      )}
    </div>
  );
}

export function AchievementGrid({ items }: { items: Achievement[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...items].sort((x, y) => Number(y.unlocked) - Number(x.unlocked));
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((a, i) => {
        const meta = ACHIEVEMENTS[a.id];
        if (!meta) return null;
        const isOpen = open === a.id;
        return (
          <motion.li
            key={a.id}
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: i * 0.04 }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : a.id)}
              aria-expanded={isOpen}
              className={cn(
                "group flex h-full w-full flex-col items-center gap-2.5 rounded-3xl border p-4 text-center transition-colors",
                a.unlocked
                  ? "border-[rgb(198_164_92/0.3)] bg-[rgb(198_164_92/0.06)] hover:bg-[rgb(198_164_92/0.1)]"
                  : "border-[var(--p-line)] bg-[rgb(200_222_211/0.03)] hover:bg-[rgb(200_222_211/0.06)]",
              )}
            >
              <motion.div whileHover={{ rotate: a.unlocked ? -6 : 0, scale: 1.05 }}>
                <Medal a={a} delay={i * 0.04} />
              </motion.div>
              <b className={cn("font-display text-[15px]", !a.unlocked && "text-[var(--p-soft)]")}>
                {meta.name}
              </b>
              <span className="text-xs leading-5 text-[var(--p-dim)]">{meta.how}</span>
              <AnimatePresence initial={false}>
                {(isOpen || (!a.unlocked && a.goal > 1)) && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] font-bold text-[var(--p-gold-soft)]"
                  >
                    {a.unlocked
                      ? a.unlocked_at
                        ? `حصلت عليه ${shortDate(a.unlocked_at.slice(0, 10))}`
                        : "حصلت عليه"
                      : a.goal > 1
                        ? `${fmt(a.progress)} من ${fmt(a.goal)} ${meta.unit ?? ""}`
                        : "لسى"}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

const seenKey = (memberId: string) => `ethmar-medals-${memberId}`;

/** Celebrates medals unlocked since the member last looked (remembered per browser). */
export function useMedalCelebration(items: Achievement[] | undefined) {
  const me = useMe();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!items?.length) return;
    const unlocked = items.filter((a) => a.unlocked).map((a) => a.id);
    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(seenKey(me.id));
      seen = raw ? (JSON.parse(raw) as string[]) : null;
      localStorage.setItem(seenKey(me.id), JSON.stringify(unlocked));
    } catch {
      return;
    }
    if (!seen) return; // first visit on this device: nothing to celebrate yet
    const fresh = unlocked.filter((id) => !seen!.includes(id));
    if (!fresh.length) return;
    const names = fresh.map((id) => ACHIEVEMENTS[id]?.name ?? id).join("، ");
    toast.success(fresh.length > 1 ? "أوسمة جديدة" : "وسام جديد", { description: names });
    if (!reduce) celebrate();
  }, [items, me.id, reduce]);
}

export function celebrate() {
  const colors = ["#C6A45C", "#E8D9A8", "#C8DED3", "#8FD9B3", "#F6F5EF"];
  const fire = (x: number, angle: number) =>
    confetti({
      particleCount: 70,
      spread: 70,
      startVelocity: 48,
      origin: { x, y: 0.7 },
      angle,
      colors,
      disableForReducedMotion: true,
    });
  fire(0.15, 60);
  fire(0.85, 120);
  setTimeout(() => fire(0.5, 90), 220);
}

/** Small strip for the home page: latest medal and the closest one to unlock. */
export function MedalStrip() {
  const { data } = useAchievements();
  useMedalCelebration(data);
  if (!data?.length) return null;
  const won = data.filter((a) => a.unlocked);
  const next = data
    .filter((a) => !a.unlocked && a.goal > 1)
    .sort((x, y) => y.progress / y.goal - x.progress / x.goal)[0];
  const latest = [...won].sort((x, y) =>
    (y.unlocked_at ?? "").localeCompare(x.unlocked_at ?? ""),
  )[0];
  return (
    <Link
      to="/portal/profile"
      className="p-card group flex items-center gap-4 p-4 transition-colors hover:border-[rgb(198_164_92/0.35)] sm:p-5"
    >
      <div className="flex -space-x-3 space-x-reverse">
        {won.slice(-3).map((a, i) => (
          <div key={a.id} className="rounded-full ring-4 ring-[var(--p-surface,#08291f)]">
            <Medal a={a} size={46} delay={i * 0.08} />
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <b className="block font-display">
          {won.length} من {data.length} أوسمة
          {latest && latest.id !== "seed" && (
            <span className="font-body text-sm font-normal text-[var(--p-dim)]">
              {" "}
              · آخرها «{ACHIEVEMENTS[latest.id]?.name}»
            </span>
          )}
        </b>
        {next && (
          <span className="mt-1 block text-[13px] text-[var(--p-soft)]">
            باقي لك {fmt(next.goal - next.progress)} {ACHIEVEMENTS[next.id]?.unit ?? ""} على «
            {ACHIEVEMENTS[next.id]?.name}»
          </span>
        )}
      </div>
      <ChevronLeft className="size-5 text-[var(--p-dim)] transition-transform group-hover:-translate-x-1" />
    </Link>
  );
}
