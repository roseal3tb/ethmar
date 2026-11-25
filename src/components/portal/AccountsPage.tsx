import { motion } from "framer-motion";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Search,
  ShieldAlert,
  UserCog,
  UserPlus,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/lib/portal/errors";
import { useAccountActions, useDirectory, useMemberEmails } from "@/lib/portal/queries";
import type { Member } from "@/lib/portal/types";
import { Avatar, Chip, ErrorState, PageHeader, PageSkeleton, Segmented, titleOf } from "./ui";

type Filter = "all" | "with" | "without";
type Action = { kind: "create" | "reset"; member: Member } | null;

export function AccountsPage() {
  const { dir, isError, refetch } = useDirectory();
  const emails = useMemberEmails(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [committee, setCommittee] = useState("all");
  const [q, setQ] = useState("");
  const [action, setAction] = useState<Action>(null);

  const rows = useMemo(() => {
    let r = dir?.members ?? [];
    if (filter !== "all") r = r.filter((m) => (filter === "with" ? m.has_account : !m.has_account));
    if (committee !== "all")
      r = r.filter((m) => (committee === "lead" ? !m.committee_id : m.committee_id === committee));
    if (q.trim())
      r = r.filter(
        (m) =>
          m.full_name.includes(q.trim()) ||
          (emails.data?.[m.id] ?? "").includes(q.trim().toLowerCase()),
      );
    return r;
  }, [dir, filter, committee, q, emails.data]);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!dir) return <PageSkeleton />;
  const withCount = dir.members.filter((m) => m.has_account).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={UserCog}
        title="حسابات الأعضاء"
        subtitle={`${withCount} من ${dir.members.length} عندهم حساب`}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-[rgb(232_194_122/0.25)] bg-[rgb(232_194_122/0.06)] p-4 text-sm leading-7 text-[var(--p-soft)]">
        <ShieldAlert className="mt-1 size-4 shrink-0 text-[var(--p-warn)]" />
        <p>
          كلمة المرور المؤقتة تظهر <b className="text-[var(--p-text)]">مرة وحدة</b> بعد الإنشاء أو
          الإعادة. أرسلها للعضو بشكل خاص، وبيطلب منه النظام يغيّرها أول ما يدخل.
        </p>
      </div>

      <section className="p-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--p-line)] p-4">
          <Segmented
            id="acc-filter"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "الكل" },
              { value: "with", label: "عندهم حساب" },
              { value: "without", label: "بدون حساب", count: dir.members.length - withCount },
            ]}
          />
          <select
            className="p-input h-10 min-h-10 w-auto py-1 text-sm"
            value={committee}
            onChange={(e) => setCommittee(e.target.value)}
            aria-label="اللجنة"
          >
            <option value="all">كل اللجان</option>
            <option value="lead">قيادة المبادرة</option>
            {dir.committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <label className="relative ms-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
            <input
              className="p-input h-10 min-h-10 ps-10 text-sm"
              placeholder="ابحث بالاسم أو البريد"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        <ul className="divide-y divide-[var(--p-line)]">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={m.full_name} size={36} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{m.full_name}</b>
                <span className="block truncate text-xs text-[var(--p-dim)]">
                  {titleOf(m)} ·{" "}
                  {dir.team(m.team_id)?.name ??
                    dir.committee(m.committee_id)?.name ??
                    "قيادة المبادرة"}
                </span>
              </span>
              <span className="hidden min-w-0 text-xs text-[var(--p-soft)] md:block" dir="ltr">
                {emails.data?.[m.id] ?? ""}
              </span>
              {m.has_account ? <Chip tone="ok">مفعّل</Chip> : <Chip tone="dim">بدون حساب</Chip>}
              {m.has_account ? (
                <button
                  type="button"
                  className="p-btn-ghost min-h-9 px-3 text-[13px]"
                  onClick={() => setAction({ kind: "reset", member: m })}
                >
                  <KeyRound className="size-3.5" /> كلمة مرور جديدة
                </button>
              ) : (
                <button
                  type="button"
                  className="p-btn min-h-9 px-3 text-[13px]"
                  onClick={() => setAction({ kind: "create", member: m })}
                >
                  <UserPlus className="size-3.5" /> إنشاء حساب
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-md">
          {action && (
            <AccountDialog
              key={action.member.id + action.kind}
              action={action}
              initialEmail={emails.data?.[action.member.id] ?? ""}
              onClose={() => setAction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountDialog({
  action,
  initialEmail,
  onClose,
}: {
  action: NonNullable<Action>;
  initialEmail: string;
  onClose: () => void;
}) {
  const { create, reset } = useAccountActions();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const busy = create.isPending || reset.isPending;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const res =
        action.kind === "create"
          ? await create.mutateAsync({
              memberId: action.member.id,
              email: email.trim().toLowerCase(),
            })
          : await reset.mutateAsync(action.member.id);
      setPassword(res.password);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function copy() {
    if (!password) return;
    const text = `بوابة أعضاء إثمار\nالبريد: ${email}\nكلمة المرور المؤقتة: ${password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("ما قدرنا ننسخ، انسخها يدويًا");
    }
  }

  if (password)
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <DialogHeader className="text-start sm:text-start">
          <DialogTitle className="font-display text-xl">
            {action.kind === "create" ? "انشأ الحساب" : "كلمة مرور جديدة"}
          </DialogTitle>
          <DialogDescription className="text-[var(--p-soft)]">
            أرسلها لـ {action.member.full_name} الحين، ما راح تظهر مرة ثانية.
          </DialogDescription>
        </DialogHeader>
        <div className="p-well space-y-2 p-4" dir="ltr">
          {email && <p className="text-sm text-[var(--p-soft)]">{email}</p>}
          <p className="select-all font-mono text-2xl font-bold tracking-wider text-[var(--p-gold-soft)]">
            {password}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="p-btn flex-1" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{" "}
            {copied ? "نُسخت" : "نسخ البيانات"}
          </button>
          <button type="button" className="p-btn-ghost h-11" onClick={onClose}>
            تم
          </button>
        </div>
      </motion.div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader className="text-start sm:text-start">
        <DialogTitle className="font-display text-xl">
          {action.kind === "create" ? "إنشاء حساب" : "إعادة تعيين كلمة المرور"}
        </DialogTitle>
        <DialogDescription className="text-[var(--p-soft)]">
          {action.kind === "create"
            ? `حساب جديد لـ ${action.member.full_name} بكلمة مرور مؤقتة.`
            : `بتنلغي كلمة المرور الحالية لـ ${action.member.full_name}.`}
        </DialogDescription>
      </DialogHeader>
      {action.kind === "create" && (
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[var(--p-soft)]">البريد الإلكتروني</span>
          <input
            className="p-input"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoFocus
          />
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="p-btn flex-1"
          disabled={busy || (action.kind === "create" && !emailOk)}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {action.kind === "create" ? "إنشاء الحساب" : "إنشاء كلمة مرور جديدة"}
        </button>
        <button type="button" className="p-btn-ghost h-11" onClick={onClose}>
          إلغاء
        </button>
      </div>
    </form>
  );
}
