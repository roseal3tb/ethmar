import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckCheck,
  ChevronLeft,
  ClipboardCheck,
  LayoutGrid,
  Clock3,
  ExternalLink,
  FolderKanban,
  KeyRound,
  ListChecks,
  LogOut,
  Medal,
  Trophy,
  UserRound,
  Users,
  UserCog,
  Vote,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wordmark } from "@/components/site/Wordmark";
import { usingMock } from "@/lib/portal/api";
import { relativeTime, todayISO, weekStart } from "@/lib/portal/dates";
import { PortalError } from "@/lib/portal/errors";
import {
  canManageAccounts,
  canReview,
  canReviewReport,
  canSeeReports,
  canSeeStats,
  hasCap,
  inSurveyAudience,
  isCommitteeHead,
  isLeadership,
  myAssignment,
} from "@/lib/portal/permissions";
import {
  useDirectory,
  useMarkRead,
  useNotifications,
  useReports,
  useSurveys,
  useTasks,
} from "@/lib/portal/queries";
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
  /** One of the four tabs that stay on the phone's bar; the rest live under «المزيد». */
  primary?: boolean | undefined;
};

/** One list for every screen size: the phone shows the same pages, the rest under «المزيد». */
function useNav(): NavItem[] {
  const me = useMe();
  const { data: tasks } = useTasks();
  const { dir } = useDirectory();
  const { data: surveys } = useSurveys();
  const thisWeek = weekStart(todayISO());
  const { data: weekReports, error: reportsError } = useReports(
    thisWeek,
    thisWeek,
    canSeeReports(me),
  );
  // Hidden until the database has the reports (so an early deploy shows nothing half-done).
  const notReady = reportsError instanceof PortalError && reportsError.code === "not_ready";
  const reportsVisible = canSeeReports(me) && !notReady && (!!weekReports || !!reportsError);
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
  const surveyBadge = (surveys ?? []).filter(
    (s) =>
      s.status === "open" &&
      !s.mine?.submitted_at &&
      (!s.deadline || new Date(s.deadline).getTime() > Date.now()) &&
      inSurveyAudience(me, s),
  ).length;
  const reportBadge = useMemo(() => {
    if (!weekReports) return 0;
    let n = weekReports.filter((r) => canReviewReport(me, r) && r.status === "submitted").length;
    const mine = weekReports.find((r) => r.committee_id === me.committee_id);
    if (isCommitteeHead(me) && (mine?.status === "returned" || !mine || mine.status === "draft")) {
      // Remind heads from Thursday on.
      if (mine?.status === "returned" || new Date().getDay() >= 4) n++;
    }
    return n;
  }, [weekReports, me]);
  const admin = isLeadership(me) || hasCap(me, "hours");
  return [
    { to: "/portal", label: "حسابي", icon: UserRound, exact: true, primary: true },
    { to: "/portal/tasks", label: "المهام", icon: ListChecks, badge, primary: true },
    { to: "/portal/projects", label: "المشاريع", icon: FolderKanban, primary: true },
    { to: "/portal/leaderboard", label: "الصدارة", icon: Trophy, primary: true },
    { to: "/portal/community", label: "المجتمع", icon: Users },
    { to: "/portal/hours", label: "ساعاتي", icon: Clock3 },
    { to: "/portal/surveys", label: "الاستبيانات", icon: Vote, badge: surveyBadge },
    ...(reportsVisible
      ? [{ to: "/portal/reports", label: "التقارير", icon: ClipboardCheck, badge: reportBadge }]
      : []),
    ...(canSeeStats(me) ? [{ to: "/portal/stats", label: "الإحصائيات", icon: BarChart3 }] : []),
    ...(canManageAccounts(me)
      ? [{ to: "/portal/accounts", label: admin ? "الإدارة" : "الحسابات", icon: UserCog }]
      : []),
  ];
}

function isActive(path: string, item: NavItem) {
  return item.exact ? path === item.to || path === item.to + "/" : path.startsWith(item.to);
}

export function PortalLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNav();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  return (
    <div className="portal relative min-h-dvh pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-28">
      <div
        aria-hidden="true"
        className="p-aurora pointer-events-none absolute inset-x-0 top-0 h-[70vh] lg:fixed lg:inset-0 lg:h-auto"
      />
      <TopBar onMore={() => setMore(true)} />
      <main id="main" className="relative mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-6 sm:pt-8">
        {/* Enter-only, in CSS: cheap on phones, and nothing to wait for when leaving a page. */}
        <div key={path} className="p-page-in">
          {children}
        </div>
      </main>
      <Dock nav={nav} path={path} onMore={() => setMore(true)} />
      <MoreSheet nav={nav} path={path} open={more} onOpenChange={setMore} />
    </div>
  );
}

/** Hides while scrolling down on phones (more room to read), comes back on the way up. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (Math.abs(y - last) > 8) {
          setHidden(y > last && y > 80);
          last = y;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return hidden;
}

function TopBar({ onMore }: { onMore: () => void }) {
  const hidden = useHideOnScroll();
  return (
    <div
      className={cn(
        "sticky top-0 z-30 border-b border-[var(--p-line)] bg-[#031f19] pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out lg:translate-y-0 lg:bg-[#031f19]/80 lg:backdrop-blur-xl",
        hidden && "max-lg:-translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:py-3">
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
          <a href="/" className="p-btn-ghost hidden h-10 lg:inline-flex">
            الموقع الرئيسي <ExternalLink className="size-3.5" />
          </a>
          <Notifications />
          <UserMenu onMore={onMore} />
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

function UserMenu({ onMore }: { onMore: () => void }) {
  const me = useMe();
  const { signOut } = useSession();
  const { dir } = useDirectory();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const committee = dir?.committee(me.committee_id);
  return (
    <>
      <button
        type="button"
        onClick={onMore}
        className="rounded-xl p-1 lg:hidden"
        aria-label="حسابي والمزيد"
      >
        <Avatar name={me.full_name} size={34} ring="var(--p-gold)" />
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="hidden items-center gap-2 rounded-xl p-1 transition-colors hover:bg-[rgb(200_222_211/0.07)] lg:flex"
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
          <Link
            to="/portal/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(200_222_211/0.06)]"
          >
            <Medal className="size-4 text-[var(--p-gold-soft)]" /> ملفي وأوسمتي
          </Link>
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
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--p-bad)] hover:bg-[rgb(242_165_142/0.08)]"
          >
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </PopoverContent>
      </Popover>
      <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </>
  );
}

function PasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[var(--p-surface,#08291f)] sm:max-w-md">
        <DialogTitle className="sr-only">تغيير كلمة المرور</DialogTitle>
        <ChangePasswordForm
          title="تغيير كلمة المرور"
          requireCurrent
          onDone={() => {
            onOpenChange(false);
            toast.success("تم تغيير كلمة المرور");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

const LG = "(min-width: 1024px)";
/** Whether the full laptop dock is showing (the phone dock keeps four tabs + «المزيد»). */
function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(LG);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(LG).matches,
    () => false,
  );
}

function Dock({ nav, path, onMore }: { nav: NavItem[]; path: string; onMore: () => void }) {
  const wide = useWide();
  const rest = nav.filter((n) => !n.primary);
  const moreActive =
    !wide && (rest.some((n) => isActive(path, n)) || path.startsWith("/portal/profile"));
  const moreBadge = rest.reduce((a, n) => a + (n.badge ?? 0), 0);
  return (
    <nav
      aria-label="تنقل البوابة"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:bottom-6 lg:px-0 lg:pb-0"
    >
      <LayoutGroup id="dock">
        <ul className="p-dock flex w-full max-w-md items-stretch justify-between gap-0.5 rounded-[24px] border border-[var(--p-line-strong)] bg-[#0b3228] p-1.5 lg:w-auto lg:max-w-none lg:justify-center lg:gap-1 lg:bg-[#0a2d24]/95 lg:backdrop-blur-xl">
          {nav.map((n) => (
            <li key={n.to} className={cn("flex-1 lg:flex-none", !n.primary && "hidden lg:block")}>
              {/* Only one highlighted tab per layout, or the shared pill would fade between two. */}
              <DockLink item={n} active={isActive(path, n) && (wide || !!n.primary)} />
            </li>
          ))}
          <li className="flex-1 lg:hidden">
            <button
              type="button"
              onClick={onMore}
              aria-haspopup="dialog"
              aria-label={moreBadge ? `المزيد (${moreBadge} تنتظرك)` : "المزيد"}
              className={cn(
                "p-tap relative flex w-full flex-col items-center gap-1 rounded-[18px] px-1 py-2 text-[11px] font-bold transition-colors",
                moreActive ? "text-[var(--p-bg)]" : "text-[var(--p-soft)]",
              )}
            >
              {moreActive && (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute inset-0 rounded-[18px] bg-[var(--p-soft)]"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <span className="relative">
                <LayoutGrid className="size-[20px]" />
                {moreBadge > 0 && <Badge n={moreBadge} />}
              </span>
              <span className="relative">المزيد</span>
            </button>
          </li>
        </ul>
      </LayoutGroup>
    </nav>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -top-1.5 -end-2.5 grid min-w-[18px] place-items-center rounded-full border-2 border-[#0b3228] bg-[var(--p-gold)] px-1 text-[10px] font-extrabold leading-[14px] text-[#1d1606]">
      {n > 9 ? "9+" : n}
    </span>
  );
}

function DockLink({ item: n, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={n.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "p-tap relative flex flex-col items-center gap-1 rounded-[18px] px-1 py-2 text-[11px] font-bold transition-colors lg:px-3 lg:py-2 xl:flex-row xl:gap-2 xl:px-4 xl:py-2.5 xl:text-sm",
        active ? "text-[var(--p-bg)]" : "text-[var(--p-soft)] hover:text-[var(--p-text)]",
      )}
    >
      {active && (
        <motion.span
          layoutId="dock-pill"
          className="absolute inset-0 rounded-[18px] bg-[var(--p-soft)]"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <span className="relative">
        <n.icon className="size-[20px] xl:size-[18px]" />
        {!!n.badge && <Badge n={n.badge} />}
      </span>
      <span className="relative whitespace-nowrap">{n.label}</span>
    </Link>
  );
}

/** «المزيد» on phones: every other page, the account and sign-out, as a bottom sheet. */
function MoreSheet({
  nav,
  path,
  open,
  onOpenChange,
}: {
  nav: NavItem[];
  path: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const me = useMe();
  const { signOut } = useSession();
  const { dir } = useDirectory();
  const [pwOpen, setPwOpen] = useState(false);
  const committee = dir?.committee(me.committee_id);
  const close = () => onOpenChange(false);
  const tiles: NavItem[] = [
    ...nav.filter((n) => !n.primary),
    { to: "/portal/profile", label: "ملفي", icon: Medal },
  ];
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="portal-sheet max-h-[88dvh] rounded-t-[28px] border-[var(--p-line-strong)] bg-[#08291f] pb-[calc(1rem+env(safe-area-inset-bottom))] text-[var(--p-text)]">
          <DrawerTitle className="sr-only">المزيد</DrawerTitle>
          <div className="overflow-y-auto px-4 pt-3">
            <Link
              to="/portal/profile"
              onClick={close}
              className="p-tap flex items-center gap-3 rounded-2xl border border-[var(--p-line)] bg-[rgb(200_222_211/0.04)] p-3"
            >
              <Avatar name={me.full_name} size={48} ring="var(--p-gold)" />
              <span className="min-w-0 flex-1">
                <b className="block truncate font-display text-base">{me.full_name}</b>
                <span className="block truncate text-xs text-[var(--p-dim)]">
                  {titleOf(me)}
                  {committee ? ` · ${committee.name}` : ""}
                </span>
              </span>
              <ChevronLeft className="size-5 text-[var(--p-dim)]" />
            </Link>
            <ul className="mt-4 grid grid-cols-3 gap-2.5">
              {tiles.map((n, i) => {
                const active = isActive(path, n);
                return (
                  <motion.li
                    key={n.to}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={open ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ delay: 0.05 + i * 0.025, duration: 0.3, ease: EASE }}
                  >
                    <Link
                      to={n.to}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "p-tap relative flex aspect-[1.05] flex-col items-center justify-center gap-2 rounded-2xl border text-center text-[13px] font-bold",
                        active
                          ? "border-transparent bg-[var(--p-soft)] text-[var(--p-bg)]"
                          : "border-[var(--p-line)] bg-[rgb(200_222_211/0.04)] text-[var(--p-text)]",
                      )}
                    >
                      <span
                        className={cn(
                          "relative grid size-10 place-items-center rounded-xl",
                          active
                            ? "bg-[rgb(3_31_25/0.12)]"
                            : "bg-[rgb(200_222_211/0.07)] text-[var(--p-soft)]",
                        )}
                      >
                        <n.icon className="size-5" />
                        {!!n.badge && <Badge n={n.badge} />}
                      </span>
                      {n.label}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
            <div className="mt-4 divide-y divide-[var(--p-line)] overflow-hidden rounded-2xl border border-[var(--p-line)]">
              <button
                type="button"
                onClick={() => {
                  close();
                  setPwOpen(true);
                }}
                className="p-tap flex w-full items-center gap-3 px-4 py-3.5 text-sm"
              >
                <KeyRound className="size-4 text-[var(--p-dim)]" /> تغيير كلمة المرور
              </button>
              <a href="/" className="p-tap flex items-center gap-3 px-4 py-3.5 text-sm">
                <ExternalLink className="size-4 text-[var(--p-dim)]" /> الموقع الرئيسي
              </a>
              <button
                type="button"
                onClick={signOut}
                className="p-tap flex w-full items-center gap-3 px-4 py-3.5 text-sm text-[var(--p-bad)]"
              >
                <LogOut className="size-4" /> تسجيل الخروج
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <PasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </>
  );
}
