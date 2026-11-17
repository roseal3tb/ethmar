import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDemoAuth } from "@/lib/demo-auth";
import {
  BIO_MAX,
  validatePasswordChange,
  validateProfile,
  type PasswordErrors,
  type ProfileErrors,
} from "@/lib/portal-validation";
import { cn } from "@/lib/utils";

function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-gold/60 bg-gold/[0.07] p-3.5 text-xs leading-relaxed text-foreground/75">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.5_0.08_70)]" />
      <span>{children}</span>
    </div>
  );
}

function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-bold text-foreground/85">
          {label}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const fieldCls = (invalid?: boolean) =>
  cn(
    "w-full rounded-2xl border bg-card px-4 py-3 text-base text-foreground shadow-sm transition placeholder:text-muted-foreground/60",
    "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10",
    invalid ? "border-destructive" : "border-input",
  );

/* ------------------------------------------------------------- Profile */

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { member, profile, updateProfile } = useDemoAuth();
  const uid = useId();
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<ProfileErrors>({});

  // Load the current demo values each time the dialog opens.
  useEffect(() => {
    if (open && profile) {
      setName(profile.displayName);
      setMajor(profile.major);
      setBio(profile.bio);
      setErrors({});
    }
  }, [open, profile]);

  if (!member || !profile) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateProfile(name, major, bio);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateProfile({ displayName: name.trim(), major: major.trim(), bio: bio.trim() });
    onOpenChange(false);
    toast.success("تم حفظ التعديلات لهذه الجلسة", {
      description: "نسخة تجريبية: لم يتم تحديث أي سجل عضوية فعلي.",
    });
  };

  const reset = () => {
    setName(member.name);
    setMajor("");
    setBio("");
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[92vh] max-w-lg overflow-y-auto rounded-[1.75rem] p-6 sm:p-7"
      >
        <DialogTitle className="font-display text-2xl font-extrabold text-primary">
          تعديل الملف الشخصي
        </DialogTitle>
        <DialogDescription className="-mt-2">
          حدّث طريقة ظهورك داخل البوابة التجريبية.
        </DialogDescription>
        <DemoNotice>
          التعديلات تُحفظ مؤقتًا في هذه الجلسة فقط ولا تُرسل إلى أي نظام. سجل العضوية الرسمي لا
          يتغير.
        </DemoNotice>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField id={`${uid}-name`} label="الاسم المعروض" error={errors.displayName}>
            <input
              id={`${uid}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldCls(!!errors.displayName)}
              aria-invalid={!!errors.displayName}
              aria-describedby={errors.displayName ? `${uid}-name-err` : undefined}
              autoComplete="name"
            />
          </FormField>
          <FormField id={`${uid}-major`} label="التخصص / الكلية (اختياري)" error={errors.major}>
            <input
              id={`${uid}-major`}
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              placeholder="مثال: نظم المعلومات — كلية علوم الحاسب"
              className={fieldCls(!!errors.major)}
              aria-invalid={!!errors.major}
            />
          </FormField>
          <FormField
            id={`${uid}-bio`}
            label="نبذة قصيرة (اختياري)"
            error={errors.bio}
            hint={
              <span
                className={cn(
                  "text-xs",
                  bio.length > BIO_MAX ? "text-destructive" : "text-muted-foreground",
                )}
                dir="ltr"
              >
                {bio.length}/{BIO_MAX}
              </span>
            }
          >
            <textarea
              id={`${uid}-bio`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className={cn(fieldCls(!!errors.bio), "resize-none")}
              aria-invalid={!!errors.bio}
            />
          </FormField>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" className="rounded-full" onClick={reset}>
              استعادة الافتراضي
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-full sm:flex-none"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" variant="brand" className="flex-1 sm:flex-none">
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ Password */

export function PasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { account } = useDemoAuth();
  const uid = useId();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
      setShow(false);
    }
  }, [open]);

  if (!account) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validatePasswordChange(current, next, confirm, account.password);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
      // Deliberately does NOT change anything: there is no backend.
      toast.info("تم التحقق من النموذج — لم تتغير كلمة المرور", {
        description: "هذه واجهة تجريبية؛ تبقى كلمة مرور الحساب التجريبي كما هي.",
      });
    }, 600);
  };

  const pwInput = (
    id: string,
    value: string,
    set: (v: string) => void,
    err?: string,
    ac = "new-password",
  ) => (
    <input
      id={id}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => set(e.target.value)}
      dir="ltr"
      autoComplete={ac}
      className={cn(fieldCls(!!err), "text-left")}
      aria-invalid={!!err}
      aria-describedby={err ? `${id}-err` : undefined}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[92vh] max-w-md overflow-y-auto rounded-[1.75rem] p-6 sm:p-7"
      >
        <DialogTitle className="font-display text-2xl font-extrabold text-primary">
          تغيير كلمة المرور
        </DialogTitle>
        <DialogDescription className="-mt-2">
          8 أحرف على الأقل، تجمع بين الحروف والأرقام.
        </DialogDescription>
        <DemoNotice>
          واجهة تجريبية لعرض التجربة فقط: لن يتم تغيير كلمة المرور أو حفظها في أي مكان.
        </DemoNotice>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField id={`${uid}-cur`} label="كلمة المرور الحالية" error={errors.current}>
            {pwInput(`${uid}-cur`, current, setCurrent, errors.current, "current-password")}
          </FormField>
          <FormField id={`${uid}-new`} label="كلمة المرور الجديدة" error={errors.next}>
            {pwInput(`${uid}-new`, next, setNext, errors.next)}
          </FormField>
          <FormField id={`${uid}-conf`} label="تأكيد كلمة المرور الجديدة" error={errors.confirm}>
            {pwInput(`${uid}-conf`, confirm, setConfirm, errors.confirm)}
          </FormField>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            className="flex items-center gap-2 text-sm font-bold text-primary/80 transition hover:text-primary"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {show ? "إخفاء كلمات المرور" : "إظهار كلمات المرور"}
          </button>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="brand"
              className="flex-1"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : null}
              تحديث كلمة المرور
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
