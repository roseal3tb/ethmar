import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  FlaskConical,
  Globe,
  KeyRound,
  ListChecks,
  LogOut,
  Pencil,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wordmark } from "@/components/site/Wordmark";
import { useDemoAuth } from "@/lib/demo-auth";
import { committeeName, roleLabel } from "@/data/demo";
import { cn } from "@/lib/utils";
import { PasswordDialog, ProfileDialog } from "./AccountDialogs";
import { MemberAvatar, TierBadge, daysUntil } from "./shared";
import { ease } from "./motion";

type PortalPath =
  | "/portal"
  | "/portal/leaderboard"
  | "/portal/community"
  | "/portal/tasks"
  | "/portal/labs";
export type PortalNavItem = { to: PortalPath; label: string; icon: LucideIcon };

export const portalNav: PortalNavItem[] = [
  { to: "/portal", label: "حسابي", icon: UserRound },
  { to: "/portal/leaderboard", label: "لوحة الصدارة", icon: Trophy },
  { to: "/portal/community", label: "المجتمع", icon: Users },
  { to: "/portal/tasks", label: "المهام", icon: ListChecks },
  { to: "/portal/labs", label: "اللابات", icon: FlaskConical },
];

/* Lets any portal page open the account dialogs owned by the shell */
type PortalUI = { openProfile: () => void; openPassword: () => void };
const PortalUICtx = createContext<PortalUI>({ openProfile: () => {}, openPassword: () => {} });
export const usePortalUI = () => useContext(PortalUICtx);

function useActiveNav() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";
  return {
    path,
    active:
      portalNav.find((n) => (n.to === "/portal" ? path === "/portal" : path.startsWith(n.to))) ??
      portalNav[0],
  };
}

export function PortalShell({ children }: { children: ReactNode }) {
  const { path, active } = useActiveNav();
  const { member, account, profile, logout } = useDemoAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const ui = useMemo(
    () => ({ openProfile: () => setProfileOpen(true), openPassword: () => setPasswordOpen(true) }),
    [],
  );
  if (!member || !account || !profile) return null;

  const onLogout = () => {
    logout();
    toast.success("تم تسجيل الخروج", { description: "نراك قريبًا في مجتمع إثمار" });
    navigate({ to: "/portal" });
  };

  return (
    <PortalUICtx.Provider value={ui}>
      <div className="min-h-screen bg-[oklch(0.975_0.008_120)]">
        {/* Desktop sidebar (right side in RTL) */}
        <aside className="fixed inset-y-0 start-0 z-40 hidden w-[17.5rem] flex-col overflow-hidden bg-sidebar text-sidebar-foreground lg:flex">
          <div
            className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-emerald blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -start-16 h-64 w-64 rounded-full bg-emerald/60 blur-3xl"
            aria-hidden
          />

          <div className="relative px-6 pb-7 pt-8">
            <Link
              to="/portal"
              aria-label="بوابة الأعضاء — حسابي"
              className="inline-block transition-opacity hover:opacity-85"
            >
              <Wordmark size="sm" affiliation={false} />
            </Link>
            <p className="mt-2 text-xs text-mint/60">بوابة الأعضاء</p>
          </div>

          <nav aria-label="تنقل البوابة" className="relative flex-1 space-y-1 px-4">
            {portalNav.map((n) => {
              const on = n.to === active.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors duration-300",
                    on ? "text-deep" : "text-ivory/65 hover:text-ivory",
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId={reduce ? undefined : "portal-side-pill"}
                      className="absolute inset-0 rounded-2xl bg-mint"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  {!on && (
                    <span className="absolute inset-0 rounded-2xl bg-ivory/0 transition-colors duration-300 group-hover:bg-ivory/[0.06]" />
                  )}
                  <Icon
                    className={cn(
                      "relative h-5 w-5 transition-transform duration-300",
                      on
                        ? "text-primary"
                        : "text-mint/60 group-hover:-translate-x-0.5 group-hover:text-mint",
                    )}
                  />
                  <span className="relative">{n.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="relative mx-4 mb-4 rounded-2xl border border-ivory/10 bg-ivory/[0.04] p-3.5">
            <div className="flex items-center gap-3">
              <MemberAvatar name={profile.displayName} id={member.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">{profile.displayName}</p>
                <p className="truncate text-xs text-mint/60">
                  لجنة {committeeName(member.committee)}
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ivory/55 transition hover:bg-ivory/10 hover:text-ivory"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="relative px-6 pb-5 text-[11px] text-ivory/35">
            نسخة تجريبية · البيانات نموذجية
          </p>
        </aside>

        <div className="lg:ps-[17.5rem]">
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-border/60 bg-[oklch(0.975_0.008_120)]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-[4.5rem] lg:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  to="/portal"
                  className="rounded-lg transition-opacity hover:opacity-80 lg:hidden"
                  aria-label="بوابة الأعضاء — حسابي"
                >
                  <Wordmark size="sm" light={false} affiliation={false} />
                </Link>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={active.to}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="hidden font-display text-lg font-extrabold text-primary lg:block"
                  >
                    {active.label}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="me-1 hidden items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-bold text-[oklch(0.48_0.08_75)] sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
                  نسخة تجريبية
                </span>
                <Notifications />
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger
                    className="flex items-center gap-2 rounded-full p-1 transition hover:bg-muted sm:pe-3"
                    aria-label="قائمة الحساب"
                  >
                    <MemberAvatar
                      name={profile.displayName}
                      id={member.id}
                      size="sm"
                      className="ring-0"
                    />
                    <span className="hidden max-w-32 truncate text-sm font-bold text-foreground sm:block">
                      {profile.displayName.split(" ")[0]}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                    <DropdownMenuLabel className="flex items-center gap-3 font-normal">
                      <MemberAvatar name={profile.displayName} id={member.id} className="ring-0" />
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-bold text-primary">
                          {profile.displayName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {roleLabel(member)} · {account.memberCode}
                        </span>
                      </span>
                    </DropdownMenuLabel>
                    <div className="px-2 pb-2">
                      <TierBadge hours={member.totalHours} size="sm" />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setProfileOpen(true)}
                      className="cursor-pointer gap-2 rounded-xl py-2.5"
                    >
                      <Pencil className="h-4 w-4" /> تعديل الملف الشخصي
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setPasswordOpen(true)}
                      className="cursor-pointer gap-2 rounded-xl py-2.5"
                    >
                      <KeyRound className="h-4 w-4" /> تغيير كلمة المرور
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-xl py-2.5">
                      <Link to="/">
                        <Globe className="h-4 w-4" /> الموقع العام
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={onLogout}
                      className="cursor-pointer gap-2 rounded-xl py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" /> تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main
            id="portal-main"
            className="mx-auto max-w-6xl px-4 pb-32 pt-7 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9"
          >
            {/* Smooth transition between portal pages */}
            <motion.div
              key={path}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
            >
              {children}
            </motion.div>
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="تنقل البوابة"
          className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/90 px-2 pt-1.5 shadow-[0_-12px_30px_-22px_rgba(0,0,0,.35)] backdrop-blur-xl lg:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {portalNav.map((n) => {
              const on = n.to === active.to;
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-bold transition-colors",
                      on ? "text-primary" : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    <span className="relative flex h-8 w-14 items-center justify-center">
                      {on && (
                        <motion.span
                          layoutId={reduce ? undefined : "portal-bottom-pill"}
                          className="absolute inset-0 rounded-full bg-secondary"
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        />
                      )}
                      <Icon className="relative h-5 w-5" />
                    </span>
                    <span className="truncate">{n.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
        <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      </div>
    </PortalUICtx.Provider>
  );
}

/* ----------------------------------------------------------- Notifications */

function Notifications() {
  const { tasks } = useDemoAuth();
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const list: { id: string; title: string; text: string }[] = [];
    for (const t of tasks) {
      if (t.status === "new")
        list.push({ id: `new-${t.id}`, title: "مهمة جديدة بانتظارك", text: t.title });
      else if (t.status === "active") {
        const d = daysUntil(t.dueAt);
        if (d < 0) list.push({ id: `late-${t.id}`, title: "مهمة متأخرة", text: t.title });
        else if (d <= 14)
          list.push({ id: `due-${t.id}`, title: `تستحق خلال ${d} يوم`, text: t.title });
      }
    }
    list.push({
      id: "welcome",
      title: "حياك الله في البوابة التجريبية",
      text: "استكشف لوحة الصدارة والمجتمع والمهام",
    });
    return list;
  }, [tasks]);

  const unread = items.filter((i) => !read.includes(i.id)).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-primary transition hover:bg-muted"
        aria-label={unread ? `الإشعارات (${unread} غير مقروءة)` : "الإشعارات"}
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-deep"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </PopoverTrigger>
      <PopoverContent align="end" dir="rtl" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-extrabold text-primary">الإشعارات</p>
          <button
            type="button"
            onClick={() => setRead(items.map((i) => i.id))}
            disabled={!unread}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-primary/70 transition hover:bg-muted hover:text-primary disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل كمقروء
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {items.map((i) => {
            const isRead = read.includes(i.id);
            return (
              <li key={i.id}>
                <Link
                  to={i.id === "welcome" ? "/portal" : "/portal/tasks"}
                  onClick={() => {
                    setRead((r) => (r.includes(i.id) ? r : [...r, i.id]));
                    setOpen(false);
                  }}
                  className="flex gap-3 rounded-xl p-3 transition hover:bg-muted"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors",
                      isRead ? "bg-transparent" : "bg-gold",
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm",
                        isRead ? "text-muted-foreground" : "font-bold text-foreground",
                      )}
                    >
                      {i.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{i.text}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
