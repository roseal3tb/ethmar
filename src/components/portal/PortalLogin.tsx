import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, LoaderCircle, CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/site/Wordmark";
import { useDemoAuth } from "@/lib/demo-auth";

export function PortalLogin() {
  const { login } = useDemoAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!id.trim() || !password) { setError("أدخل البريد الإلكتروني أو رقم العضوية وكلمة المرور."); return; }
    setBusy(true);
    // Short pending state for prototype feedback; no network request or real auth is performed.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const ok = login(id, password, remember);
    setBusy(false);
    if (!ok) {
      setError("بيانات الدخول التجريبية غير صحيحة. تحقق من البريد أو رقم العضوية وكلمة المرور.");
      toast.error("تعذّر تسجيل الدخول إلى الحساب التجريبي");
      return;
    }
    setPassword("");
    toast.success("أهلًا بك في بوابة إثمار التجريبية");
  }

  return <main dir="rtl" className="min-h-screen bg-ivory lg:grid lg:grid-cols-[1fr_1fr]">
    <div className="relative order-2 flex min-h-screen flex-col justify-center px-5 py-20 sm:px-10 lg:order-1 lg:px-20">
      <div className="mx-auto w-full max-w-[460px]">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-forest hover:underline"><ArrowLeft size={17} /> العودة للموقع الرئيسي</Link>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-mint/55 px-4 py-2 text-xs font-bold text-forest"><ShieldCheck size={15} /> منصة أعضاء إثمار · نسخة تجريبية</div>
        <h1 className="font-display text-3xl font-black leading-relaxed text-deep sm:text-4xl">حياك الله في مجتمع إثمار</h1>
        <p className="mt-3 text-sm leading-8 text-muted-foreground">مكان واحد لمتابعة رحلتك التطوعية، مهامك، مجتمعك، وإنجازاتك.</p>
        <p className="mt-1 text-xs font-bold text-forest/70">جامعة الملك سعود · برنامج الشراكة الطلابية</p>
        <form noValidate className="mt-10 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="login-id" className="font-bold">البريد الإلكتروني أو رقم العضوية</Label>
            <div className="relative"><Mail size={18} className="pointer-events-none absolute inset-y-0 right-4 my-auto text-muted-foreground" />
              <Input id="login-id" autoComplete="username" dir="ltr" className="h-13 rounded-2xl border-emerald/15 bg-white pe-4 ps-11 text-left" placeholder="rose@demo.ethmar" value={id} onChange={(e) => setId(e.target.value)} aria-invalid={!!error && !id.trim()} aria-describedby={error ? "login-error" : undefined} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className="font-bold">كلمة المرور</Label>
            <div className="relative"><LockKeyhole size={18} className="pointer-events-none absolute inset-y-0 right-4 my-auto text-muted-foreground" />
              <Input id="login-password" autoComplete="current-password" dir="ltr" type={visible ? "text" : "password"} className="h-13 rounded-2xl border-emerald/15 bg-white pe-12 ps-11 text-left" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error && !password} aria-describedby={error ? "login-error" : undefined} />
              <button type="button" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute inset-y-0 left-3 my-auto grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-forest"><input type="checkbox" className="h-4 w-4 accent-emerald" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> تذكرني على هذا الجهاز <span className="text-xs text-muted-foreground">(للعرض التجريبي فقط)</span></label>
          {error && <div id="login-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
          <Button type="submit" variant="brand" disabled={busy} className="h-13 w-full rounded-2xl text-base">{busy ? <><LoaderCircle size={17} className="animate-spin" /> جارٍ الدخول...</> : <>تسجيل الدخول <ArrowLeft size={18} /></>}</Button>
        </form>
        <div className="mt-8 rounded-2xl border border-forest/10 bg-white/85 p-5 text-sm leading-7 text-foreground/80">
          <div className="mb-2 flex items-center gap-2 font-extrabold text-forest"><CircleHelp size={17} /> حساب جاهز للتجربة</div>
          <p>البريد: <code dir="ltr" className="font-mono text-xs font-bold">rose@demo.ethmar</code></p>
          <p>كلمة المرور: <code dir="ltr" className="font-mono text-xs font-bold">demo1234</code></p>
          <p className="mt-2 text-xs text-muted-foreground">هذه بيانات عرض علنية وليست حسابات أعضاء حقيقية. لا تستخدم كلمة مرورك الشخصية هنا.</p>
        </div>
      </div>
    </div>
    <aside className="bg-hero grain relative order-1 hidden min-h-screen flex-col justify-between overflow-hidden p-12 text-ivory lg:order-2 lg:flex">
      <div className="absolute -left-32 top-[24%] h-[450px] w-[450px] rounded-full border border-mint/20" aria-hidden="true" />
      <div className="absolute -left-20 top-[29%] h-[350px] w-[350px] rounded-full border border-mint/20" aria-hidden="true" />
      <Wordmark />
      <div className="relative max-w-lg">
        <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/10"><Sparkles size={29} className="text-gold" /></div>
        <h2 className="font-display text-4xl font-extrabold leading-[1.6]">هنا تنمو الخبرة.<br /><span className="text-mint">وهنا يبدأ الأثر.</span></h2>
        <p className="mt-5 max-w-md text-lg leading-9 text-ivory/70">رحلتك مع إثمار لا تتوقف عند المشاركة، بل تصنع تجربة تنمو فيها المهارات وتُحتفى فيها الإنجازات.</p>
        <div className="mt-12 h-px w-24 bg-gold" />
      </div>
      <p className="text-sm text-mint/70">مبادرة إثمار · جامعة الملك سعود · برنامج الشراكة الطلابية</p>
    </aside>
  </main>;
}
