import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckCheck,
  Clock3,
  ExternalLink,
  KeyRound,
  ListChecks,
  LogOut,
  Trophy,
  UserRound,
  Users,
  UserCog,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wordmark } from "@/components/site/Wordmark";
import { usingMock } from "@/lib/portal/api";
import { relativeTime } from "@/lib/portal/dates";
import { canManageAccounts, canReview, canSeeStats, myAssignment } from "@/lib/portal/permissions";
import { useDirectory, useMarkRead, useNotifications, useTasks } from "@/lib/portal/queries";
import { useMe, useSession } from "@/lib/portal/session";
import { cn } from "@/lib/utils";
import { ChangePasswordForm } from "./AuthScreens";
import { Avatar, EASE, titleOf } from "./ui";

type NavItem = {
  to: string;
  label: string;
  icon: typeof UserRound;
  exact?: boolean | undefined;
  badge?: number | undefined;
  mobile?: boolean | undefined;
};

function useNav(): NavItem[] {
  const me = useMe();
  const { data: tasks } = useTasks();
  const { dir } = useDirectory();
  const badge = useMemo(() => {
    if (!tasks) return 0;
    let n = 0;
    for (const t of tasks) {
      const mine = myAssignment(me, t);
      if (mine?.status === "returned") n++;
      for (const a of t.assignments)
        if (a.status === "submitted" && canReview(me, t, dir?.member(a.member_id))) n++;
    }
    return n;
  }, [tasks, me, dir]);
  return [
    { to: "/portal", label: "حسابي", icon: UserRound, exact: true, mobile: true },
    { to: "/portal/tasks", label: "المهام", icon: ListChecks, badge, mobile: true },
    { to: "/portal/leaderboard", label: "الصدارة", icon: Trophy, mobile: true },
    { to: "/portal/community", label: "المجتمع", icon: Users, mobile: true },
    { to: "/portal/hours", label: "ساعاتي", icon: Clock3, mobile: true },
    ...(canSeeStats(me) ? [{ to: "/portal/stats", label: "الإحصائيات", icon: BarChart3 }] : []),
    ...(canManageAccounts(me)
      ? [{ to: "/portal/accounts", label: "الحسابات", icon: UserCog }]
      : []),
  ];
}

function isActive(path: string, item: NavItem) {
  return item.exact ? path === item.to || path === item.to + "/" : path.startsWith(item.to);
}

export function PortalLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNav();
  return (
    <div className="portal relative min-h-screen pb-28">
      <div aria-hidden="true" className="p-aurora pointer-events-none fixed inset-0" />
      <TopBar nav={nav} />
      <main id="main" className="relative mx-auto w-full max-w-[1180px] px-4 pt-6 sm:px-6 sm:pt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Dock nav={nav} path={path} />
    </div>
  );
}

function TopBar({ nav }: { nav: NavItem[] }) {
  return (
    <div className="sticky top-0 z-30 border-b border-[var(--p-line)] bg-[#031f19]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/portal" className="flex items-center gap-3" aria-label="بوابة إثمار — حسابي">
          <Wordmark size="sm" affiliation={false} />
          <span className="hidden border-s border-[var(--p-line-strong)] ps-3 text-[13px] font-bold text-[var(--p-dim)] sm:inline">
            بوابة الأعضاء
          </span>
          {usingMock && (
            <span className="rounded-full bg-[rgb(198_164_92/0.16)] px-2 py-0.5 text-[11px] font-bold text-[var(--p-gold-soft)]">
              معاينة
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2">
          <a href="/" className="p-btn-ghost hidden h-10 sm:inline-flex">
            الموقع الرئيسي <ExternalLink className="size-3.5" />
          </a>
          <Notifications />
          <UserMenu extra={nav.filter((n) => !n.mobile)} />
        </div>
      </div>
    </div>
  );
}

function Notifications() {
  const { data } = useNotifications();
  const mark = useMarkRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = (data ?? []).filter((n) => !n.read_at && n.id !== "welcome").length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative grid size-10 place-items-center rounded-xl border border-[var(--p-line-strong)] text-[var(--p-soft)] transition-colors hover:bg-[rgb(200_222_211/0.07)]"
        aria-label={unread ? `الإشعارات (${unread} جديدة)` : "الإشعارات"}
      >
        <Bell className="size-[18px]" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-[var(--p-gold)] px-1 text-[11px] font-extrabold leading-5 text-[#1d1606]"
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(92vw,360px)] rounded-2xl border-[var(--p-line-strong)] p-0"
      >
        <div className="flex items-center justify-between border-b border-[var(--p-line)] px-4 py-3">
          <b className="font-display">الإشعارات</b>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => mark.mutate(undefined)}
              className="flex items-center gap-1 text-xs font-bold text-[var(--p-soft)] hover:text-[var(--p-text)]"
            >
              <CheckCheck className="size-3.5" /> تعليم الكل كمقروء
            </button>
          )}
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-1.5">
          {(data ?? []).length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-[var(--p-dim)]">ما فيه إشعارات</li>
          )}
          {(data ?? []).map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (!n.read_at && n.id !== "welcome") mark.mutate([n.id]);
                  setOpen(false);
                  if (n.link) navigate({ href: n.link });
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-[rgb(200_222_211/0.06)]"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read_at ? "bg-transparent" : "bg-[var(--p-gold)]",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{n.title}</b>
                  {n.body && (
                    <span className="block truncate text-[13px] text-[var(--p-dim)]">{n.body}</span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--p-dim)]">
                  {relativeTime(n.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu({ extra }: { extra: NavItem[] }) {
  const me = useMe();
  const { signOut } = useSession();
  const { dir } = useDirectory();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const committee = dir?.committee(me.committee_id);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-[rgb(200_222_211/0.07)]"
          aria-label="قائمة الحساب"
        >
          <Avatar name={me.full_name} size={34} ring="var(--p-gold)" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-64 rounded-2xl border-[var(--p-line-strong)] p-2"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={me.full_name} size={40} />
            <div className="min-w-0">
              <b className="block truncate">{me.full_name}</b>
              <span className="block truncate text-xs text-[var(--p-dim)]">
                {titleOf(me)}
                {committee ? ` · ${committee.name}` : ""}
              </span>
            </div>
          </div>
          <div className="my-1 h-px bg-[var(--p-line)]" />
          {extra.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(200_222_211/0.06)] md:hidden"
            >
              <n.icon className="size-4 text-[var(--p-dim)]" /> {n.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPwOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(200_222_211/0.06)]"
          >
            <KeyRound className="size-4 text-[var(--p-dim)]" /> تغيير كلمة المرور
          </button>
          <a
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(200_222_211/0.06)] sm:hidden"
          >
            <ExternalLink className="size-4 text-[var(--p-dim)]" /> الموقع الرئيسي
          </a>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--p-bad)] hover:bg-[rgb(242_165_142/0.08)]"
          >
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </PopoverContent>
      </Popover>
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[var(--p-surface,#08291f)] sm:max-w-md">
          <DialogTitle className="sr-only">تغيير كلمة المرور</DialogTitle>
          <ChangePasswordForm
            title="تغيير كلمة المرور"
            onDone={() => {
              setPwOpen(false);
              toast.success("تم تغيير كلمة المرور");
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Dock({ nav, path }: { nav: NavItem[]; path: string }) {
  return (
    <nav
      aria-label="تنقل البوابة"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:bottom-6 md:px-0 md:pb-0"
    >
      <LayoutGroup id="dock">
        <ul className="flex w-full max-w-md items-stretch justify-between gap-1 rounded-[22px] border border-[var(--p-line-strong)] bg-[#0a2d24]/95 p-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl md:w-auto md:max-w-none md:justify-center">
          {nav.map((n) => {
            const active = isActive(path, n);
            return (
              <li key={n.to} className={cn("flex-1 md:flex-none", !n.mobile && "hidden md:block")}>
                <Link
                  to={n.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition-colors md:flex-row md:gap-2 md:px-4 md:py-2.5 md:text-sm",
                    active
                      ? "text-[var(--p-bg)]"
                      : "text-[var(--p-soft)] hover:text-[var(--p-text)]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="dock-pill"
                      className="absolute inset-0 rounded-2xl bg-[var(--p-soft)]"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className="relative">
                    <n.icon className="size-[19px] md:size-[18px]" />
                    {!!n.badge && (
                      <span className="absolute -top-1.5 -end-2 grid min-w-4 place-items-center rounded-full bg-[var(--p-gold)] px-1 text-[10px] leading-4 text-[#1d1606]">
                        {n.badge}
                      </span>
                    )}
                  </span>
                  <span className="relative">{n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
    </nav>
  );
}
