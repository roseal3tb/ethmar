import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Loader2, LogOut, Mail, ShieldCheck, UserX } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/site/Wordmark";
import { api, usingMock } from "@/lib/portal/api";
import { errorMessage } from "@/lib/portal/errors";
import { MOCK_LOGINS, MOCK_PASSWORD } from "@/lib/portal/mock-api";
import { useSession } from "@/lib/portal/session";
import { EASE } from "./ui";

function AuthFrame({ children, side }: { children: ReactNode; side?: ReactNode | undefined }) {
  return (
    <div className="portal relative flex min-h-screen overflow-hidden">
      <BackgroundRings />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_1fr] lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="hidden flex-col gap-8 lg:flex"
        >
          {side ?? <BrandSide />}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
          className="w-full"
        >
          <div className="mx-auto w-full max-w-[440px]">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

function BrandSide() {
  return (
    <>
      <Wordmark size="lg" affiliation={false} />
      <div className="max-w-md space-y-4">
        <h1 className="font-display text-[40px] font-extrabold leading-[1.25] text-balance">
          بوابة أعضاء <span className="text-[var(--p-gold-soft)]">إثمار</span>
        </h1>
        <p className="text-lg leading-8 text-[var(--p-soft)]">
          مهامك وساعاتك التطوعية وترتيبك بين أعضاء المبادرة، في مكان واحد.
        </p>
      </div>
      <ul className="grid max-w-md gap-3 text-sm text-[var(--p-soft)]">
        {[
          "تسحب المهمة وتسلّمها وقائدك يعتمدها",
          "ساعاتك تنحسب تلقائيًا مع كل اعتماد",
          "تعرف لجان المبادرة وفرقها وأعضاءها",
        ].map((t, i) => (
          <motion.li
            key={t}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.25 + i * 0.08 }}
            className="flex items-center gap-3"
          >
            <span className="grid size-7 place-items-center rounded-full bg-[rgb(143_217_179/0.12)] text-[var(--p-ok)]">
              <ShieldCheck className="size-3.5" />
            </span>
            {t}
          </motion.li>
        ))}
      </ul>
    </>
  );
}

/** Slow, concentric rings — the only ambient motion on the auth screens. */
function BackgroundRings() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="p-aurora absolute inset-0" />
      {[520, 780, 1040].map((s, i) => (
        <motion.span
          key={s}
          className="absolute rounded-full border border-[rgb(200_222_211/0.06)]"
          style={{ width: s, height: s, top: -s / 2.6, left: -s / 3 }}
          animate={{ rotate: i % 2 ? -360 : 360 }}
          transition={{ duration: 120 + i * 40, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute size-1.5 rounded-full bg-[var(--p-gold)]/60"
            style={{ top: "50%", left: -3 }}
          />
        </motion.span>
      ))}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Mail;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-[var(--p-soft)]">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute top-1/2 start-4 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
        {children}
      </span>
    </label>
  );
}

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("اكتب بريدك وكلمة المرور");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.signIn(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame>
      <div className="mb-6 lg:hidden">
        <Wordmark affiliation={false} />
      </div>
      <form
        onSubmit={submit}
        className="p-card space-y-5 p-6 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.7)] sm:p-8"
        noValidate
      >
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-extrabold">تسجيل الدخول</h2>
          <p className="text-sm text-[var(--p-dim)]">ادخل بالبريد اللي سجّلت فيه بالمبادرة</p>
        </div>
        <Field label="البريد الإلكتروني" icon={Mail}>
          <input
            className="p-input ps-11"
            type="email"
            dir="ltr"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
          />
        </Field>
        <Field label="كلمة المرور" icon={KeyRound}>
          <input
            className="p-input ps-11 pe-12"
            type={show ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 end-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--p-dim)] hover:text-[var(--p-text)]"
            aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </Field>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-xl bg-[rgb(242_165_142/0.1)] px-3 py-2 text-sm text-[var(--p-bad)]"
          >
            {error}
          </motion.p>
        )}
        <button type="submit" className="p-btn w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          دخول
        </button>
        <p className="text-center text-[13px] leading-6 text-[var(--p-dim)]">
          ما عندك حساب أو نسيت كلمة المرور؟ تواصل مع قيادة المبادرة وتنشأ لك كلمة مرور جديدة.
        </p>
      </form>
      {usingMock && (
        <MockPicker
          onPick={(e) => {
            setEmail(e);
            setPassword(MOCK_PASSWORD);
          }}
        />
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/" className="text-[var(--p-soft)] hover:text-[var(--p-text)]">
          › الرجوع للموقع
        </Link>
      </p>
    </AuthFrame>
  );
}

function MockPicker({ onPick }: { onPick: (email: string) => void }) {
  return (
    <div className="p-well mt-4 p-4 text-sm">
      <p className="mb-3 font-bold text-[var(--p-gold-soft)]">نسخة معاينة — اختر حسابًا تجريبيًا</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(MOCK_LOGINS).map(([email, name]) => (
          <button
            key={email}
            type="button"
            onClick={() => onPick(email)}
            className="p-btn-ghost min-h-9 px-3 text-[13px]"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChangePasswordForm({
  onDone,
  title = "اختر كلمة مرور جديدة",
}: {
  onDone?: () => void;
  title?: string | undefined;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError("كلمة المرور لازم تكون ٨ أحرف على الأقل");
    if (pw !== pw2) return setError("كلمتا المرور غير متطابقتين");
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(pw);
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <Field label="كلمة المرور الجديدة" icon={KeyRound}>
        <input
          className="p-input ps-11"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </Field>
      <Field label="أعد كتابتها" icon={KeyRound}>
        <input
          className="p-input ps-11"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
      </Field>
      <p className="text-xs text-[var(--p-dim)]">٨ أحرف على الأقل، ويفضّل تخلطها بأرقام ورموز.</p>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[rgb(242_165_142/0.1)] px-3 py-2 text-sm text-[var(--p-bad)]"
        >
          {error}
        </p>
      )}
      <button type="submit" className="p-btn w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        حفظ كلمة المرور
      </button>
    </form>
  );
}

export function FirstPasswordScreen({ onDone }: { onDone: () => void }) {
  const { me, signOut } = useSession();
  return (
    <AuthFrame>
      <div className="p-card space-y-5 p-6 sm:p-8">
        <p className="text-sm text-[var(--p-soft)]">
          حياك الله <b className="text-[var(--p-text)]">{me?.full_name}</b> 👋 قبل ما تبدأ، غيّر
          كلمة المرور المؤقتة اللي وصلتك.
        </p>
        <ChangePasswordForm onDone={onDone} />
        <button
          type="button"
          onClick={signOut}
          className="w-full text-center text-sm text-[var(--p-dim)] hover:text-[var(--p-text)]"
        >
          تسجيل الخروج
        </button>
      </div>
    </AuthFrame>
  );
}

export function UnlinkedScreen() {
  const { signOut } = useSession();
  return (
    <AuthFrame>
      <div className="p-card flex flex-col items-center gap-4 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-[rgb(242_165_142/0.1)] text-[var(--p-bad)]">
          <UserX className="size-6" />
        </span>
        <h2 className="font-display text-xl font-extrabold">حسابك غير مربوط بعضوية</h2>
        <p className="text-sm leading-7 text-[var(--p-dim)]">
          سجّلت الدخول بنجاح لكن ما لقينا عضوًا مرتبطًا بهذا البريد. تواصل مع قيادة المبادرة يربطون
          حسابك.
        </p>
        <button type="button" onClick={signOut} className="p-btn-ghost">
          <LogOut className="size-4" /> تسجيل الخروج
        </button>
      </div>
    </AuthFrame>
  );
}

export function PortalLoading() {
  return (
    <div
      className="portal flex min-h-screen flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
    >
      <div className="p-aurora absolute inset-0" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <Wordmark size="lg" affiliation={false} />
      </motion.div>
      <span className="relative text-sm text-[var(--p-dim)]">جارٍ تحميل البوابة…</span>
    </div>
  );
}
