import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, FlaskConical, House, LayoutDashboard, ListChecks, LogOut, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/site/Wordmark";
import { useDemoAuth } from "@/lib/demo-auth";
import { Avatar, type PortalView } from "./portal-ui";
import { cn } from "@/lib/utils";

const navigation = [
  { id: "account", label: "حسابي", icon: LayoutDashboard },
  { id: "leaderboard", label: "لوحة الصدارة", icon: Trophy },
  { id: "community", label: "المجتمع", icon: UsersRound },
  { id: "tasks", label: "المهام", icon: ListChecks },
  { id: "labs", label: "اللابات", icon: FlaskConical },
] as const;

export function PortalLayout({ view, onViewChange, children, displayName }: {
  view: PortalView; onViewChange: (view: PortalView) => void; displayName: string; children: ReactNode;
}) {
  const { member, logout } = useDemoAuth();
  function doLogout() { logout(); toast("تم تسجيل الخروج من النسخة التجريبية"); }

  return <div dir="rtl" className="min-h-screen bg-[#f7f8f4] text-deep">
    <div className="mx-auto flex min-h-screen max-w-[1800px]">
      <aside className="sticky top-0 hidden h-screen w-65 shrink-0 flex-col overflow-y-auto bg-deep px-5 py-7 text-ivory lg:flex xl:w-72">
        <Link to="/" className="mb-12 block"><Wordmark /></Link>
        <div className="mb-4 px-3 text-[11px] font-bold tracking-widest text-mint/55">مساحة الأعضاء</div>
        <nav aria-label="قائمة بوابة الأعضاء" className="space-y-1.5">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onViewChange(id)} aria-current={view === id ? "page" : undefined}
            className={cn("flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 text-start text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint", view === id ? "bg-mint text-deep shadow-[0_12px_30px_-18px_rgba(200,222,211,.6)]" : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory")}
          ><Icon size={19} />{label}</button>)}
        </nav>
        <div className="mt-auto space-y-4 pt-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold text-mint">بيئة تجريبية</p>
            <p className="mt-2 text-xs leading-6 text-ivory/65">البيانات والعضويات المعروضة للتوضيح وليست سجلات رسمية.</p>
          </div>
          <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-ivory/65 hover:bg-white/5"><House size={17} />الموقع الرئيسي</Link>
          <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start text-sm text-red-100 hover:bg-white/5"><LogOut size={17} />تسجيل الخروج</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-emerald/10 bg-[#f7f8f4]/95 backdrop-blur-xl">
          <div className="flex h-[76px] items-center justify-between gap-4 px-5 md:px-9 xl:px-12">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">بوابة الأعضاء <span aria-hidden="true">/</span> نسخة تجريبية</div>
              <p className="mt-0.5 truncate font-display text-base font-extrabold text-deep">{navigation.find((n) => n.id === view)?.label}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden rounded-full border border-emerald/10 bg-mint/40 px-3 py-1.5 text-xs font-bold text-forest sm:block">جامعة الملك سعود</span>
              <button type="button" onClick={() => toast.info("لا توجد إشعارات جديدة في النسخة التجريبية")} aria-label="الإشعارات" className="relative grid h-10 w-10 place-items-center rounded-xl border border-emerald/10 bg-white text-forest hover:bg-mint/30"><Bell size={19} /></button>
              <div className="hidden text-left sm:block"><div className="text-xs font-bold">{displayName}</div><div className="text-[11px] text-muted-foreground">{member?.role}</div></div>
              <Avatar member={member} name={displayName} size="sm" />
              <button type="button" aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={doLogout} className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-800 lg:hidden"><LogOut size={18} /></button>
            </div>
          </div>
        </header>
        <main id="portal-main" className="mx-auto w-full max-w-[1400px] px-5 pb-30 pt-7 md:px-9 md:pt-10 lg:pb-12 xl:px-12">{children}</main>
      </div>
    </div>
    <nav aria-label="تنقل الأعضاء على الجوال" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-emerald/10 bg-white/95 px-1 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(3,31,25,.25)] backdrop-blur-xl lg:hidden">
      {navigation.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onViewChange(id)} aria-current={view === id ? "page" : undefined}
        className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold sm:text-xs", view === id ? "bg-mint/55 text-primary" : "text-muted-foreground hover:bg-mint/25")}
      ><Icon size={19} aria-hidden="true" /><span className="truncate">{label}</span></button>)}
    </nav>
  </div>;
}
