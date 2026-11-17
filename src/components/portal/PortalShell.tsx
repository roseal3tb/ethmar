import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  FlaskConical,
  Globe,
  ListChecks,
  LogOut,
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
import { committeeName, roleLabels } from "@/data/demo";
import { cn } from "@/lib/utils";
import { MemberAvatar, SampleBadge, TierBadge, daysUntil } from "./shared";

export type PortalNavItem = {
  to: "/portal" | "/portal/leaderboard" | "/portal/community" | "/portal/tasks" | "/portal/labs";
  label: string;
  icon: LucideIcon;
};

export const portalNav: PortalNavItem[] = [
  { to: "/portal", label: "حسابي", icon: UserRound },
  { to: "/portal/leaderboard", label: "لوحة الصدارة", icon: Trophy },
  { to: "/portal/community", label: "المجتمع", icon: Users },
  { to: "/portal/tasks", label: "المهام", icon: ListChecks },
  { to: "/portal/labs", label: "اللابات", icon: FlaskConical },
];

function useActiveNav() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, "") || "/";
  return (
    portalNav.find((n) => (n.to === "/portal" ? path === "/portal" : path.startsWith(n.to))) ??
    portalNav[0]
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const active = useActiveNav();
  const { member, account, profile, logout } = useDemoAuth();
  const navigate = useNavigate();
  if (!member || !account || !profile) return null;

  const onLogout = () => {
    logout();
    toast.success("تم تسجيل الخروج", { description: "نراك قريبًا في مجتمع إثمار." });
    navigate({ to: "/portal" });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.008_120)]">
      {/* Desktop sidebar (right side in RTL) */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-72 flex-col overflow-hidden bg-sidebar text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-emerald blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-center justify-between px-6 pb-6 pt-7">
          <Link to="/portal" aria-label="بوابة الأعضاء — حسابي">
            <Wordmark size="sm" affiliation={false} />
          </Link>
          <span className="rounded-full border border-ivory/15 px-2.5 py-1 text-[11px] text-mint/80">
            بوابة الأعضاء
          </span>
        </div>

        <div className="relative mx-4 rounded-2xl border border-ivory/10 bg-ivory/[0.05] p-4">
          <div className="flex items-center gap-3">
            <MemberAvatar name={profile.displayName} id={member.id} />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">{profile.displayName}</p>
              <p className="truncate text-xs text-mint/70">
                {roleLabels[member.role]} · لجنة {committeeName(member.committee)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <TierBadge hours={member.totalHours} size="sm" />
            <span className="text-xs text-ivory/60" dir="ltr">
              {account.memberCode}
            </span>
          </div>
        </div>

        <nav aria-label="تنقل البوابة" className="relative mt-6 flex-1 space-y-1 px-4">
          {portalNav.map((n) => {
            const on = n.to === active.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors",
                  on ? "bg-mint text-deep" : "text-ivory/70 hover:bg-ivory/[0.06] hover:text-ivory",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    on ? "text-primary" : "text-mint/70 group-hover:text-mint",
                  )}
                />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative space-y-1 border-t border-ivory/10 px-4 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-ivory/65 transition hover:bg-ivory/[0.06] hover:text-ivory"
          >
            <Globe className="h-4 w-4" /> الموقع العام
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-ivory/65 transition hover:bg-ivory/[0.06] hover:text-ivory"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
          <p className="px-4 pt-2 text-[11px] leading-relaxed text-ivory/40">
            نسخة تجريبية للبوابة — البيانات المعروضة نموذجية.
          </p>
        </div>
      </aside>

      <div className="lg:ps-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border/70 bg-[oklch(0.975_0.008_120)]/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/portal"
                className="rounded-lg lg:hidden"
                aria-label="بوابة الأعضاء — حسابي"
              >
                <Wordmark size="sm" light={false} affiliation={false} />
              </Link>
              <div className="hidden min-w-0 lg:block">
                <p className="text-xs text-muted-foreground">بوابة الأعضاء</p>
                <p className="truncate font-display text-lg font-extrabold text-primary">
                  {active.label}
                </p>
              </div>
              <SampleBadge className="hidden sm:inline-flex">نسخة تجريبية</SampleBadge>
            </div>
            <div className="flex items-center gap-2">
              <Notifications />
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger
                  className="flex items-center gap-2 rounded-full p-1 pe-1 transition hover:bg-muted sm:pe-3"
                  aria-label="قائمة العضو"
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
                <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-display text-sm font-bold text-primary">
                      {profile.displayName}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                    >
                      {account.login}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2">
                    <Link to="/portal">
                      <UserRound className="h-4 w-4" /> حسابي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2">
                    <Link to="/portal/tasks">
                      <ClipboardList className="h-4 w-4" /> مهامي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2">
                    <Link to="/">
                      <Globe className="h-4 w-4" /> الموقع العام
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={onLogout}
                    className="cursor-pointer rounded-xl py-2 text-destructive focus:text-destructive"
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
          className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="تنقل البوابة"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pt-1.5 shadow-[0_-10px_30px_-20px_rgba(0,0,0,.35)] backdrop-blur-xl lg:hidden"
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
                    on ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                      on && "bg-secondary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="truncate">{n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
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
      text: "استكشف لوحة الصدارة والمجتمع والمهام.",
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
        {unread > 0 && (
          <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-deep">
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" dir="rtl" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-extrabold text-primary">الإشعارات</p>
          <button
            type="button"
            onClick={() => setRead(items.map((i) => i.id))}
            disabled={!unread}
            className="flex items-center gap-1 text-xs font-bold text-primary/70 transition hover:text-primary disabled:opacity-40"
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
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
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
