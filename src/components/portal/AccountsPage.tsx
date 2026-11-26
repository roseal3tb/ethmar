import { motion } from "framer-motion";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  MailCheck,
  RotateCcw,
  Search,
  Send,
  UserCog,
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
import { api } from "@/lib/portal/api";
import { errorMessage } from "@/lib/portal/errors";
import { useAccountActions, useDirectory, useMemberEmails } from "@/lib/portal/queries";
import type { InviteResult, Member } from "@/lib/portal/types";
import { useQueryClient } from "@tanstack/react-query";
import { canManageAccount, isCommitteeHead, isLeadership } from "@/lib/portal/permissions";
import { useMe } from "@/lib/portal/session";
import { PSelect } from "./PSelect";
import { Avatar, Chip, ErrorState, PageHeader, PageSkeleton, Segmented, titleOf } from "./ui";

type Filter = "all" | "with" | "without";
type Action = { kind: "invite" | "reset"; member: Member } | null;
/** Activated = has a login and has chosen their own password. */
const isActive = (m: Member) => m.has_account && !m.must_change_password;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountsPage() {
  const me = useMe();
  const leadership = isLeadership(me);
  const { dir, isError, refetch } = useDirectory();
  const emails = useMemberEmails(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [committee, setCommittee] = useState("all");
  const [q, setQ] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [bulkOpen, setBulkOpen] = useState<false | "invite" | "remind">(false);

  // Leadership sees everyone; a committee head their committee; a team head their team's members.
  const scope = useMemo(
    () => (dir?.members ?? []).filter((m) => canManageAccount(me, m)),
    [dir, me],
  );
  const myTeams = dir && me.committee_id && !leadership ? dir.teamsOf(me.committee_id) : [];
  const showTeamFilter = isCommitteeHead(me) && !leadership && myTeams.length > 0;

  const rows = useMemo(() => {
    let r = scope;
    if (filter !== "all") r = r.filter((m) => (filter === "with" ? isActive(m) : !isActive(m)));
    if (committee !== "all")
      r = r.filter((m) =>
        committee === "lead"
          ? !m.committee_id
          : committee === "none"
            ? !m.team_id
            : committee.startsWith("team:")
              ? m.team_id === committee.slice(5)
              : m.committee_id === committee,
      );
    if (q.trim())
      r = r.filter(
        (m) =>
          m.full_name.includes(q.trim()) ||
          (emails.data?.[m.id] ?? "").includes(q.trim().toLowerCase()),
      );
    return r;
  }, [scope, filter, committee, q, emails.data]);

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!dir) return <PageSkeleton />;
  const withCount = scope.filter(isActive).length;
  // New invitations go only to people who never got one; a second email would cancel the first link.
  const ready = scope.filter((m) => !m.has_account && emails.data?.[m.id]);
  const pending = scope.filter((m) => m.has_account && !isActive(m) && emails.data?.[m.id]);
  const noEmail = scope.filter((m) => !isActive(m) && !emails.data?.[m.id]).length;
  const whose = leadership
    ? null
    : isCommitteeHead(me)
      ? (dir.committee(me.committee_id)?.title ?? "لجنتك")
      : (dir.team(me.team_id)?.name ?? "فريقك");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={UserCog}
        title="حسابات الأعضاء"
        subtitle={
          whose
            ? `${whose} · ${withCount} من ${scope.length} فعّلوا حساباتهم`
            : `${withCount} من ${scope.length} فعّلوا حساباتهم`
        }
        actions={
          ready.length > 0 || pending.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pending.length > 0 && (
                <button
                  type="button"
                  className="p-btn-ghost h-11"
                  onClick={() => setBulkOpen("remind")}
                  title="يوصلهم رابط جديد، والرابط القديم يوقف"
                >
                  <RotateCcw className="size-4" /> تذكير اللي ما فعّلوا ({pending.length})
                </button>
              )}
              {ready.length > 0 && (
                <button type="button" className="p-btn" onClick={() => setBulkOpen("invite")}>
                  <Send className="size-4" /> دعوة الكل ({ready.length})
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--p-line-strong)] bg-[rgb(200_222_211/0.04)] p-4 text-sm leading-7 text-[var(--p-soft)]">
        <MailCheck className="mt-1 size-4 shrink-0 text-[var(--p-ok)]" />
        <p>
          كل عضو يوصله إيميل دعوة فيه رابط، يفتحه ويختار كلمة المرور بنفسه. لو الرابط انتهى أو ضاع،
          أرسل له دعوة جديدة.
          {whose && <> هنا تشوف أعضاء {whose} اللي تقدر تدعوهم بس.</>}
          {noEmail > 0 && (
            <>
              {" "}
              فيه <b className="text-[var(--p-text)]">{noEmail}</b> بدون إيميل مسجّل، تقدر تكتب
              إيميلاتهم وقت الدعوة.
            </>
          )}
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
              { value: "with", label: "مفعّلين" },
              { value: "without", label: "لم يفعّلوا", count: scope.length - withCount },
            ]}
          />
          {leadership && (
            <PSelect
              size="sm"
              label="اللجنة"
              value={committee}
              onChange={setCommittee}
              options={[
                { value: "all", label: "كل اللجان" },
                { value: "lead", label: "قيادة المبادرة" },
                ...dir.committees.map((c) => ({ value: c.id, label: c.title, group: "اللجان" })),
              ]}
            />
          )}
          {showTeamFilter && (
            <PSelect
              size="sm"
              label="الفريق"
              value={committee}
              onChange={setCommittee}
              options={[
                { value: "all", label: "كل الفرق" },
                ...myTeams.map((t) => ({ value: `team:${t.id}`, label: t.name, group: "الفرق" })),
                { value: "none", label: "بدون فريق", group: "أخرى" },
              ]}
            />
          )}
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
            <li key={m.id} className="p-row flex flex-wrap items-center gap-3 px-4 py-3">
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
                {emails.data?.[m.id] ?? <span className="text-[var(--p-bad)]">— بدون إيميل</span>}
              </span>
              {isActive(m) ? (
                <Chip tone="ok">مفعّل</Chip>
              ) : m.has_account ? (
                <Chip tone="warn">بانتظار التفعيل</Chip>
              ) : (
                <Chip tone="dim">لم يُدعَ</Chip>
              )}
              {isActive(m) ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="p-btn-ghost min-h-9 px-3 text-[13px]"
                    onClick={() => setAction({ kind: "invite", member: m })}
                    title="إعادة إرسال الدعوة"
                  >
                    <Send className="size-3.5" /> دعوة
                  </button>
                  <button
                    type="button"
                    className="p-btn-ghost min-h-9 px-3 text-[13px]"
                    onClick={() => setAction({ kind: "reset", member: m })}
                  >
                    <KeyRound className="size-3.5" /> كلمة مرور
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="p-btn min-h-9 px-3 text-[13px]"
                  onClick={() => setAction({ kind: "invite", member: m })}
                >
                  <Send className="size-3.5" /> إرسال دعوة
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
      <Dialog open={!!bulkOpen} onOpenChange={(o) => !o && setBulkOpen(false)}>
        <DialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[#08291f] sm:max-w-md">
          {bulkOpen && (
            <BulkInvite
              kind={bulkOpen}
              members={bulkOpen === "remind" ? pending : ready}
              onClose={() => setBulkOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinkResult({
  res,
  name,
  onClose,
}: {
  res: InviteResult;
  name: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (res.emailed)
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 text-center"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[rgb(143_217_179/0.12)] text-[var(--p-ok)]">
          <MailCheck className="size-6" />
        </span>
        <DialogTitle className="font-display text-xl">وصل الإيميل</DialogTitle>
        <DialogDescription className="text-[var(--p-soft)]">
          أرسلنا لـ {name} على <span dir="ltr">{res.email}</span>
        </DialogDescription>
        <button type="button" className="p-btn w-full" onClick={onClose}>
          تم
        </button>
      </motion.div>
    );
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <DialogHeader className="text-start sm:text-start">
        <DialogTitle className="font-display text-xl">الرابط جاهز</DialogTitle>
        <DialogDescription className="text-[var(--p-soft)]">
          إرسال الإيميلات ما تفعّل بعد، فانسخ الرابط وأرسله لـ {name} بنفسك. يشتغل مرة وحدة.
        </DialogDescription>
      </DialogHeader>
      <p className="p-well break-all p-3 text-xs text-[var(--p-soft)]" dir="ltr">
        {res.link}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="p-btn flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(res.link ?? "");
              setCopied(true);
            } catch {
              toast.error("ما قدرنا ننسخ، انسخه يدويًا");
            }
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{" "}
          {copied ? "نُسخ" : "نسخ الرابط"}
        </button>
        <button type="button" className="p-btn-ghost h-11" onClick={onClose}>
          تم
        </button>
      </div>
    </motion.div>
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
  const { invite, reset } = useAccountActions();
  const [email, setEmail] = useState(initialEmail);
  const [res, setRes] = useState<InviteResult | null>(null);
  const busy = invite.isPending || reset.isPending;
  const emailOk = EMAIL.test(email.trim());
  const locked = action.member.has_account && !!initialEmail;

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      setRes(
        action.kind === "invite"
          ? await invite.mutateAsync({
              memberId: action.member.id,
              email: email.trim().toLowerCase(),
            })
          : await reset.mutateAsync(action.member.id),
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (res) return <LinkResult res={res} name={action.member.full_name} onClose={onClose} />;

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader className="text-start sm:text-start">
        <DialogTitle className="font-display text-xl">
          {action.kind === "invite" ? "دعوة للبوابة" : "رابط كلمة مرور جديدة"}
        </DialogTitle>
        <DialogDescription className="text-[var(--p-soft)]">
          {action.kind === "invite"
            ? isActive(action.member)
              ? `يوصل ${action.member.full_name} إيميل فيه رابط يدخله البوابة مباشرة.`
              : `يوصل ${action.member.full_name} إيميل فيه رابط يفعّل فيه حسابه ويختار كلمة المرور.`
            : `يوصل ${action.member.full_name} إيميل فيه رابط يختار فيه كلمة مرور جديدة.`}
        </DialogDescription>
      </DialogHeader>
      {action.kind === "invite" && (
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[var(--p-soft)]">البريد الإلكتروني</span>
          <input
            className="p-input read-only:opacity-70"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            readOnly={locked}
            autoFocus={!locked}
          />
          {locked && (
            <span className="block text-xs leading-6 text-[var(--p-dim)]">
              عنده حساب على هذا الإيميل، فالدعوة تروح له نفسه.
            </span>
          )}
        </label>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="p-btn flex-1"
          disabled={busy || (action.kind === "invite" && !emailOk)}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          إرسال
        </button>
        <button type="button" className="p-btn-ghost h-11" onClick={onClose}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

/** Invites everyone without an account whose email is on file, one after another. */
function BulkInvite({
  kind,
  members,
  onClose,
}: {
  kind: "invite" | "remind";
  members: Member[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [links, setLinks] = useState<{ name: string; link: string }[]>([]);

  async function run() {
    setState("running");
    for (const m of members) {
      try {
        const r = await api.inviteMember(m.id);
        if (!r.emailed && r.link) {
          // Email isn't set up yet: stop rather than create accounts nobody hears about.
          setLinks((l) => [...l, { name: m.full_name, link: r.link! }]);
          setDone((d) => d + 1);
          break;
        }
      } catch {
        setFailed((f) => [...f, m.full_name]);
      }
      setDone((d) => d + 1);
    }
    qc.invalidateQueries({ queryKey: ["portal", "structure"] });
    setState("done");
  }

  return (
    <div className="space-y-4">
      <DialogHeader className="text-start sm:text-start">
        <DialogTitle className="font-display text-xl">
          {kind === "remind" ? "تذكير اللي ما فعّلوا" : "دعوة الكل"}
        </DialogTitle>
        <DialogDescription className="leading-7 text-[var(--p-soft)]">
          {kind === "remind"
            ? `بيوصل رابط جديد لـ ${members.length} عضو انرسلت لهم دعوة وما فعّلوا. الرابط القديم اللي عندهم يوقف.`
            : `بيوصل إيميل دعوة لـ ${members.length} عضو عندهم إيميل مسجّل وما انرسلت لهم دعوة قبل.`}
        </DialogDescription>
      </DialogHeader>
      {state !== "idle" && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-[rgb(200_222_211/0.1)]">
            <div
              className="h-full rounded-full bg-[var(--p-ok)] transition-[width] duration-300"
              style={{ width: `${(done / members.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-[var(--p-soft)]">
            {done} من {members.length}
            {failed.length > 0 && (
              <span className="text-[var(--p-bad)]"> · تعذّر {failed.length}</span>
            )}
          </p>
        </div>
      )}
      {state === "running" && (
        <p className="text-xs text-[var(--p-dim)]">خلّي الصفحة مفتوحة لين يخلص الإرسال.</p>
      )}
      {state === "done" && links.length > 0 && (
        <p className="rounded-xl bg-[rgb(232_194_122/0.1)] p-3 text-sm text-[var(--p-warn)]">
          وقّفنا بعد أول عضو لأن إرسال الإيميلات ما تفعّل بعد. فعّله وارجع اضغط «دعوة الكل».
        </p>
      )}
      {state === "done" && failed.length > 0 && (
        <p className="text-xs leading-6 text-[var(--p-dim)]">تعذّر: {failed.join("، ")}</p>
      )}
      <div className="flex gap-2">
        {state === "idle" && (
          <button type="button" className="p-btn flex-1" onClick={run}>
            <Send className="size-4" /> أرسل الدعوات
          </button>
        )}
        {state === "running" && (
          <button type="button" className="p-btn flex-1" disabled>
            <Loader2 className="size-4 animate-spin" /> جاري الإرسال…
          </button>
        )}
        <button
          type="button"
          className="p-btn-ghost h-11"
          onClick={onClose}
          disabled={state === "running"}
        >
          {state === "done" ? "تم" : "إلغاء"}
        </button>
      </div>
    </div>
  );
}
