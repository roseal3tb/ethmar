import { useState, type FormEvent, type ReactNode } from "react";
import { Award, ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, KeyRound, Pencil, ShieldCheck, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemoAuth } from "@/lib/demo-auth";
import { committeeName, tierForHours } from "@/data/demo";
import { Avatar, PortalCard, SectionTitle, TierBadge, formatDate, formatNumber, type PortalView } from "./portal-ui";

function EditProfile({ open, onOpenChange, displayName, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; displayName: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(displayName);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (draft.trim().length < 3) { toast.error("أدخل اسمًا لا يقل عن ٣ أحرف"); return; }
    onSave(draft.trim()); toast.success("تم تحديث الاسم للعرض الحالي فقط"); onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setDraft(displayName); }}><DialogContent dir="rtl" className="rounded-3xl sm:max-w-md">
    <DialogHeader><DialogTitle>تعديل الملف الشخصي</DialogTitle><DialogDescription>تعديلات العرض مؤقتة، ولا تُحفظ في سجلات إثمار الرسمية.</DialogDescription></DialogHeader>
    <form className="mt-3 space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="profile-name">اسم العرض</Label><Input id="profile-name" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={70} required /></div><Button className="w-full" variant="brand" type="submit">حفظ في النسخة التجريبية</Button></form>
  </DialogContent></Dialog>;
}

function ChangePassword({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState("");
  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); };
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!current) { toast.error("أدخل كلمة المرور الحالية"); return; }
    if (next.length < 8) { toast.error("كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل"); return; }
    if (next !== confirm) { toast.error("كلمتا المرور الجديدتان غير متطابقتين"); return; }
    toast.info("تمت محاكاة الطلب فقط؛ لم تتغير كلمة المرور الفعلية"); reset(); onOpenChange(false);
  }
  return <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}><DialogContent dir="rtl" className="rounded-3xl sm:max-w-md">
    <DialogHeader><DialogTitle>تغيير كلمة المرور</DialogTitle><DialogDescription>واجهة توضيحية فقط. لا يتم حفظ كلمات المرور أو تعديل بيانات الدخول التجريبية. لا تستخدم كلمة مرور حقيقية.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="mt-3 space-y-4">
      <div className="space-y-2"><Label htmlFor="oldpass">كلمة المرور الحالية</Label><Input id="oldpass" autoComplete="off" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="newpass">كلمة المرور الجديدة</Label><Input id="newpass" autoComplete="off" type="password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="confirmpass">تأكيد كلمة المرور الجديدة</Label><Input id="confirmpass" autoComplete="off" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      <Button className="w-full" variant="brand" type="submit">محاكاة طلب تغيير كلمة المرور</Button>
    </form>
  </DialogContent></Dialog>;
}

export function AccountDashboard({ displayName, onNameChange, onViewChange }: { displayName: string; onNameChange: (value: string) => void; onViewChange: (v: PortalView) => void }) {
  const { member, account, tasks } = useDemoAuth();
  const [edit, setEdit] = useState(false); const [password, setPassword] = useState(false);
  if (!member || !account) return null;
  const tier = tierForHours(member.totalHours);
  const recent = [...tasks].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)).slice(0, 3);
  const stats = [
    { label: "ساعات تطوعية معتمدة (تجريبية)", value: formatNumber(member.totalHours), icon: Clock3, foot: "حسب سجل العضو التجريبي" },
    { label: "مهام مكتملة في سجل العرض", value: formatNumber(account.completedTasks), icon: CheckCircle2, foot: "العدد من بيانات الحساب الأصلية" },
    { label: "إنجازات في الملف", value: formatNumber(account.achievements.length), icon: Award, foot: "شارات إنجاز تجريبية" },
  ];
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-[2rem] bg-hero p-7 text-ivory sm:p-10">
      <div aria-hidden="true" className="absolute -left-10 -top-16 h-65 w-65 rounded-full border border-mint/20" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-mint"><Sparkles size={14} /> رحلتك في إثمار</span>
          <h1 className="mt-5 font-display text-3xl font-black leading-[1.5] sm:text-4xl">حياك الله، {displayName.split(" ")[0]} <span className="text-gold">✦</span></h1>
          <p className="mt-2 text-sm leading-7 text-ivory/75 sm:text-base">كل مهمة تنجزها تصنع فرقًا. اكتشف مدى تقدمك، وإنجازاتك، والمساحات التي تنتظرك.</p>
          <button onClick={() => onViewChange("tasks")} className="mt-6 inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 text-sm font-bold text-deep hover:bg-white">استعرض مهامي <ArrowLeft size={17} /></button>
        </div>
        <div className="flex items-center gap-4 rounded-[1.5rem] border border-white/15 bg-white/10 p-5"><Avatar member={member} name={displayName} size="lg" /><div><p className="font-display text-lg font-bold">{displayName}</p><p className="text-sm text-ivory/75">لجنة {committeeName(member.committee)}</p><p className="text-xs text-mint">{member.role}</p></div></div>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-3">{stats.map(({ label, value, icon: Icon, foot }) => <PortalCard key={label} className="relative overflow-hidden"><div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-mint/60 text-forest"><Icon size={20} /></div><div className="font-display text-3xl font-black text-deep" dir="ltr" style={{textAlign:"right"}}>{value}</div><p className="mt-2 text-sm font-bold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{foot}</p></PortalCard>)}</div>
    <div className="grid gap-5 xl:grid-cols-3">
      <PortalCard className="xl:col-span-2">
        <SectionTitle eyebrow="بطاقة العضوية" title="ملفك في إثمار" trailing={<div className="flex gap-2"><Button onClick={() => setEdit(true)} variant="outline" size="sm"><Pencil /> تعديل</Button><Button onClick={() => setPassword(true)} variant="outline" size="sm"><KeyRound /> كلمة المرور</Button></div>} />
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Detail icon={<UserRound size={18} />} label="اسم العضو" value={displayName} />
          <Detail icon={<BriefcaseBusiness size={18} />} label="اللجنة" value={committeeName(member.committee)} />
          <Detail icon={<ShieldCheck size={18} />} label="الدور" value={member.role} />
          <div className="rounded-2xl bg-ivory p-4"><p className="mb-2 text-xs text-muted-foreground">المستوى الحالي (تجريبي)</p><TierBadge tier={tier.id} /></div>
        </div>
        <div className="mt-7 border-t border-emerald/10 pt-6"><div className="mb-3 flex justify-between text-sm"><strong>التقدم نحو المستوى التالي</strong><span className="text-muted-foreground">{formatNumber(member.totalHours)} ساعة</span></div>
          {(() => { const index = ["bronze", "silver", "gold", "platinum", "diamond"].indexOf(tier.id); const thresholds = [0,20,40,70,100]; const next = thresholds[index + 1]; return next ? <><div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${Math.min(100, member.totalHours / next * 100)}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">المتبقي {next - member.totalHours} ساعة وفق الحدود التجريبية القابلة للتعديل.</p></> : <p className="text-sm text-forest">أعلى مستوى في بيانات العرض ✦</p>; })()}
        </div>
      </PortalCard>
      <PortalCard><SectionTitle eyebrow="رحلة مميزة" title="إنجازاتك" /><div className="mt-6 space-y-3">{account.achievements.map((achievement, i) => <div key={achievement} className="flex items-center gap-3 rounded-2xl bg-ivory px-4 py-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-amber-700">{i === 0 ? <Award size={21} /> : <TrendingUp size={21} />}</div><p className="text-sm font-bold">{achievement}</p></div>)}</div><p className="mt-4 text-xs leading-6 text-muted-foreground">الإنجازات بيانات توضيحية وليست شهادات صادرة عن المبادرة.</p></PortalCard>
    </div>
    <PortalCard><SectionTitle eyebrow="المتابعة" title="آخر المهام" trailing={<Button onClick={() => onViewChange("tasks")} variant="ghost" className="font-bold">كل المهام <ArrowLeft /></Button>} />
      <div className="mt-5 divide-y divide-emerald/10">{recent.map((task) => <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">لجنة {committeeName(task.committee)} · {formatDate(task.dueAt)}</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold text-forest">{task.progress}%</span><div className="h-2 w-28 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald" style={{ width: `${task.progress}%` }} /></div></div></div>)}</div>
    </PortalCard>
    <EditProfile open={edit} onOpenChange={setEdit} displayName={displayName} onSave={onNameChange} />
    <ChangePassword open={password} onOpenChange={setPassword} />
  </div>;
}
function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex items-start gap-3 rounded-2xl bg-ivory p-4"><div className="text-forest">{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div></div>; }
