import { motion } from "framer-motion";
import {
  Award,
  BadgeCheck,
  ExternalLink,
  KeyRound,
  Loader2,
  Medal as MedalIcon,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { shortDate, todayISO } from "@/lib/portal/dates";
import { errorMessage } from "@/lib/portal/errors";
import {
  useAchievements,
  useCertificates,
  useDirectory,
  useIssueCertificate,
  useSemesters,
  useSummary,
} from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import { AchievementGrid, useMedalCelebration } from "./Achievements";
import { ChangePasswordForm } from "./AuthScreens";
import { PSelect } from "./PSelect";
import {
  Avatar,
  Chip,
  CountUp,
  EASE,
  ErrorState,
  PageHeader,
  PageSkeleton,
  Panel,
  Rise,
  TierBadge,
  fmt,
  hoursLabel,
  titleOf,
} from "./ui";

export function ProfilePage() {
  const me = useMe();
  const { dir } = useDirectory();
  const summary = useSummary();
  const medals = useAchievements();
  const [pwOpen, setPwOpen] = useState(false);
  useMedalCelebration(medals.data);

  if (summary.isLoading || medals.isLoading) return <PageSkeleton />;
  if (summary.isError || medals.isError)
    return <ErrorState onRetry={() => void medals.refetch()} />;

  const s = summary.data;
  const won = (medals.data ?? []).filter((a) => a.unlocked).length;
  const committee = dir?.committee(me.committee_id);
  const team = dir?.team(me.team_id);

  return (
    <div className="space-y-6">
      <PageHeader icon={UserRound} title="ملفي" subtitle="أوسمتك وشهاداتك وإعدادات حسابك" />

      <Rise>
        <section className="p-card relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -start-24 size-72 rounded-full bg-[radial-gradient(circle,rgb(198_164_92/0.16),transparent_65%)]"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <Avatar name={me.full_name} size={88} ring="var(--p-gold)" />
            </motion.div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{me.full_name}</h2>
              <p className="text-[var(--p-soft)]">
                {titleOf(me)}
                {committee ? ` · ${committee.title}` : ""}
                {team ? ` · ${team.name}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {me.member_code && (
                  <Chip tone="dim">
                    <span dir="ltr">{me.member_code}</span>
                  </Chip>
                )}
                {s?.tier && <TierBadge tierId={s.tier.id} name={s.tier.name} />}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 sm:w-[340px]">
              {[
                { k: "ساعة معتمدة", v: s?.total_hours ?? 0 },
                { k: "مهمة منجزة", v: s?.completed_tasks ?? 0 },
                { k: "وسام", v: won },
              ].map((x) => (
                <div key={x.k} className="p-well px-3 py-3 text-center">
                  <dd className="font-display text-2xl font-extrabold text-[var(--p-gold-soft)]">
                    <CountUp value={x.v} />
                  </dd>
                  <dt className="mt-0.5 text-[11px] text-[var(--p-dim)]">{x.k}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </Rise>

      <Rise delay={0.06}>
        <Panel
          title={
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <MedalIcon className="size-5 text-[var(--p-gold-soft)]" /> أوسمتك
            </h2>
          }
          action={
            <span className="text-sm text-[var(--p-dim)]">
              {won} من {medals.data?.length ?? 0}
            </span>
          }
        >
          <AchievementGrid items={medals.data ?? []} />
        </Panel>
      </Rise>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Rise delay={0.1}>
          <Certificates />
        </Rise>
        <Rise delay={0.14}>
          <Panel
            title={
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <ShieldCheck className="size-5 text-[var(--p-soft)]" /> الحساب
              </h2>
            }
          >
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--p-dim)]">الدور</dt>
                <dd>{titleOf(me)}</dd>
              </div>
              {committee && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--p-dim)]">اللجنة</dt>
                  <dd>{committee.title}</dd>
                </div>
              )}
              {team && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--p-dim)]">الفريق</dt>
                  <dd>{team.name}</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              className="p-btn-ghost mt-5 h-11 w-full"
              onClick={() => setPwOpen(true)}
            >
              <KeyRound className="size-4" /> تغيير كلمة المرور
            </button>
          </Panel>
        </Rise>
      </div>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[var(--p-surface,#08291f)] sm:max-w-md">
          <DialogTitle className="sr-only">تغيير كلمة المرور</DialogTitle>
          <ChangePasswordForm
            title="تغيير كلمة المرور"
            requireCurrent
            onDone={() => {
              setPwOpen(false);
              toast.success("تم تغيير كلمة المرور");
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Certificates() {
  const certs = useCertificates();
  const semesters = useSemesters();
  const issue = useIssueCertificate();
  const today = todayISO();
  const current = (semesters.data ?? []).find((x) => x.starts_on <= today && x.ends_on >= today);
  const [period, setPeriod] = useState<string>("");
  const chosen = period || (current ? String(current.id) : "all");
  const list = (certs.data ?? []).filter((c) => !c.revoked_at);

  async function make() {
    try {
      const code = await issue.mutateAsync(chosen === "all" ? null : Number(chosen));
      toast.success("شهادتك جاهزة", {
        action: { label: "افتحها", onClick: () => window.open(`/verify/${code}`, "_blank") },
      });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Panel
      title={
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Award className="size-5 text-[var(--p-gold-soft)]" /> شهاداتي
        </h2>
      }
    >
      <p className="text-sm leading-7 text-[var(--p-soft)]">
        شهادة ساعات تطوعية موثّقة برمز QR، أي أحد يقدر يتحقق منها من موقع إثمار
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <PSelect
            label="فترة الشهادة"
            value={chosen}
            onChange={setPeriod}
            options={[
              ...(semesters.data ?? []).map((x) => ({ value: String(x.id), label: x.name })),
              { value: "all", label: "منذ انضمامي" },
            ]}
          />
        </div>
        <button type="button" className="p-btn-gold h-11" onClick={make} disabled={issue.isPending}>
          {issue.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          أصدر شهادة
        </button>
      </div>
      <ul className="mt-5 space-y-2">
        {list.length === 0 && !certs.isLoading && (
          <li className="p-well px-4 py-6 text-center text-sm text-[var(--p-dim)]">
            ما أصدرت شهادات للحين
          </li>
        )}
        {list.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
          >
            <a
              href={`/verify/${c.code}`}
              target="_blank"
              rel="noreferrer"
              className="p-well group flex items-center gap-3 px-4 py-3 transition-colors hover:border-[rgb(198_164_92/0.35)]"
            >
              <BadgeCheck className="size-5 shrink-0 text-[var(--p-gold-soft)]" />
              <span className="min-w-0 flex-1">
                <b className="block text-sm">{c.period_label}</b>
                <span className="text-xs text-[var(--p-dim)]">
                  {hoursLabel(c.hours)} · {fmt(c.tasks)} مهمة ·{" "}
                  {shortDate(c.issued_at.slice(0, 10))}
                </span>
              </span>
              <span className="text-xs text-[var(--p-dim)]" dir="ltr">
                {c.code}
              </span>
              <ExternalLink className="size-4 text-[var(--p-dim)] transition-transform group-hover:-translate-y-0.5" />
            </a>
          </motion.li>
        ))}
      </ul>
    </Panel>
  );
}
