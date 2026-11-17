import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wordmark } from "@/components/site/Wordmark";
import ksuLockup from "@/assets/ksu-spp-lockup.png";
import { demoAccounts } from "@/data/demo";
import { useDemoAuth } from "@/lib/demo-auth";
import { validateLogin, type LoginErrors } from "@/lib/portal-validation";
import { cn } from "@/lib/utils";

type Errors = LoginErrors;

export function LoginScreen() {
  const { login } = useDemoAuth();
  const reduce = useReducedMotion();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const uid = useId();
  const demo = demoAccounts[0];

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (loading) return;
    const e = validateLogin(id, password);
    setErrors(e);
    if (e.id || e.password) return;
    setLoading(true);
    // Small delay so the loading state is perceivable; the check itself is local demo data.
    window.setTimeout(() => {
      const ok = login(id, password, remember);
      setLoading(false);
      if (!ok) {
        setErrors({ form: "بيانات الدخول غير صحيحة، تأكد من البريد أو رقم العضوية وكلمة المرور" });
        toast.error("تعذّر تسجيل الدخول", { description: "تحقق من بياناتك وحاول مرة أخرى" });
        return;
      }
      toast.success("تم تسجيل الدخول", { description: "حياك الله في مجتمع إثمار" });
    }, 650);
  };

  const fillDemo = () => {
    setId(demo.login);
    setPassword(demo.password);
    setErrors({});
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="bg-hero grain relative hidden overflow-hidden p-12 text-ivory lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute -end-28 top-1/3 h-96 w-96 animate-drift rounded-full bg-mint/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-center justify-between">
          <Link to="/" aria-label="الموقع العام">
            <Wordmark />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-ivory/70 transition hover:text-ivory"
          >
            <ArrowRight className="h-4 w-4" /> الموقع العام
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1 text-xs text-mint">
            بوابة الأعضاء
          </p>
          <h2 className="font-display text-4xl font-black leading-tight xl:text-5xl">
            مساحة أعضاء وقادة إثمار
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ivory/70">
            تابع مهامك وساعاتك التطوعية، وتعرّف على لجان المبادرة وزملائك في مكان واحد
          </p>
        </div>
        <img
          src={ksuLockup}
          alt="جامعة الملك سعود — برنامج الشراكة الطلابية"
          className="relative h-16 w-auto self-start opacity-90"
          width={242}
          height={145}
        />
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col">
        <div className="bg-hero grain relative flex items-center justify-between px-5 py-5 lg:hidden">
          <Link to="/" aria-label="الموقع العام">
            <Wordmark size="sm" />
          </Link>
          <Link to="/" className="relative flex items-center gap-1 text-sm text-ivory/75">
            <ArrowRight className="h-4 w-4" /> الموقع
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <h1 className="font-display text-3xl font-black text-primary md:text-[2.1rem]">
              حياك الله في مجتمع إثمار
            </h1>
            <p className="mt-2 text-muted-foreground">سجّل دخولك لمتابعة مهامك وساعاتك التطوعية</p>

            <form
              onSubmit={submit}
              noValidate
              className="mt-8 space-y-5"
              aria-describedby={errors.form ? `${uid}-form` : undefined}
            >
              {errors.form && (
                <div
                  id={`${uid}-form`}
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errors.form}
                </div>
              )}

              <Field
                id={`${uid}-id`}
                label="البريد الإلكتروني أو رقم العضوية"
                error={errors.id}
                icon={Mail}
              >
                <input
                  id={`${uid}-id`}
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  dir="ltr"
                  placeholder="name@demo.ethmar أو ETH-1001"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    if (errors.id || errors.form)
                      setErrors((x) => ({ ...x, id: undefined, form: undefined }));
                  }}
                  aria-invalid={!!errors.id}
                  aria-describedby={errors.id ? `${uid}-id-err` : undefined}
                  className={inputCls(!!errors.id)}
                />
              </Field>

              <Field id={`${uid}-pw`} label="كلمة المرور" error={errors.password} icon={KeyRound}>
                <input
                  id={`${uid}-pw`}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  dir="ltr"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password || errors.form)
                      setErrors((x) => ({ ...x, password: undefined, form: undefined }));
                  }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? `${uid}-pw-err` : undefined}
                  className={cn(inputCls(!!errors.password), "pl-12")}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  aria-pressed={show}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-primary"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </Field>

              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor={`${uid}-remember`}
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80"
                >
                  <Checkbox
                    id={`${uid}-remember`}
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    className="h-5 w-5 rounded-md"
                  />
                  تذكرني على هذا الجهاز
                </label>
                <button
                  type="button"
                  className="text-sm font-bold text-primary/80 transition hover:text-primary"
                  onClick={() =>
                    toast.info("استعادة كلمة المرور غير متاحة في النسخة التجريبية", {
                      description: "تواصل مع فريق التقنية في إثمار عند إطلاق البوابة",
                    })
                  }
                >
                  نسيت كلمة المرور؟
                </button>
              </div>

              <Button
                type="submit"
                variant="brand"
                size="xl"
                disabled={loading}
                className="w-full"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" /> جارٍ التحقق…
                  </>
                ) : (
                  <>
                    <LogIn /> تسجيل الدخول
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 rounded-2xl border border-dashed border-gold/60 bg-gold/[0.07] p-4 text-sm">
              <p className="flex items-center gap-2 font-bold text-[oklch(0.42_0.08_70)]">
                <Sparkles className="h-4 w-4" /> نسخة تجريبية من البوابة
              </p>
              <p className="mt-1.5 leading-relaxed text-foreground/70">
                هذه نسخة أولية بحسابات وبيانات نموذجية، وليست حسابات أعضاء حقيقية
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <dl className="space-y-0.5 text-xs text-foreground/75" dir="ltr">
                  <div>
                    <dt className="inline text-muted-foreground">Email: </dt>
                    <dd className="inline font-mono">{demo.login}</dd>
                  </div>
                  <div>
                    <dt className="inline text-muted-foreground">Password: </dt>
                    <dd className="inline font-mono">{demo.password}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-gold/50 bg-card"
                  onClick={fillDemo}
                >
                  تعبئة الحساب التجريبي
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function inputCls(invalid: boolean) {
  return cn(
    // Inputs are LTR (emails, codes, passwords) inside an RTL layout: use physical sides.
    "h-12 w-full rounded-2xl border bg-card pl-4 pr-11 text-left text-base text-foreground placeholder:text-muted-foreground/60 shadow-sm transition",
    "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10",
    invalid
      ? "border-destructive focus:border-destructive focus:ring-destructive/10"
      : "border-input",
  );
}

function Field({
  id,
  label,
  error,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  icon: typeof Mail;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-foreground/85">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        {children}
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
