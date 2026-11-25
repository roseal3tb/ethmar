import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Crown, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { COMMITTEE_HEADS, LEADERSHIP, TEAM_HEADS } from "@/lib/portal/permissions";
import { useDirectory, useMemberTiers, type Directory } from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type { Committee, Member } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Chip,
  EASE,
  ErrorState,
  PageHeader,
  PageSkeleton,
  TierGem,
  fmt,
  itemVariants,
  listVariants,
  titleOf,
} from "./ui";

export function CommunityPage({
  committeeId,
  focus,
}: {
  committeeId?: string | undefined;
  focus?: string | undefined;
}) {
  const { dir, isError, refetch } = useDirectory();
  const navigate = useNavigate();
  const open = (c?: string | undefined, f?: string | undefined) =>
    navigate({ to: "/portal/community", search: { c, m: f } });

  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!dir) return <PageSkeleton />;
  const committee = dir.committee(committeeId);
  return (
    <AnimatePresence mode="wait" initial={false}>
      {committee ? (
        <motion.div
          key={committee.id}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <CommitteeView dir={dir} committee={committee} focus={focus} onBack={() => open()} />
        </motion.div>
      ) : (
        <motion.div
          key="tree"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Tree dir={dir} onOpen={open} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const leadOf = (dir: Directory, c: Committee) =>
  dir
    .membersOf(c.id)
    .filter((m) => COMMITTEE_HEADS.includes(m.role))
    .sort((a, b) => (a.role === "committee_lead" ? -1 : b.role === "committee_lead" ? 1 : 0));

function Tree({
  dir,
  onOpen,
}: {
  dir: Directory;
  onOpen: (c?: string | undefined, m?: string | undefined) => void;
}) {
  const me = useMe();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const leadership = dir.members
    .filter((m) => LEADERSHIP.includes(m.role))
    .sort((a) => (a.role === "president" ? -1 : 1));
  const results = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    return dir.members.filter((m) => m.full_name.includes(s)).slice(0, 12);
  }, [q, dir]);
  const mine = dir.committee(me.committee_id);
  const exp = expanded ? dir.committee(expanded) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Users}
        title="المجتمع"
        subtitle={`${fmt(dir.members.length)} عضو في ${dir.committees.length} لجان`}
      />

      <label className="relative block max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 start-4 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
        <input
          className="p-input h-12 ps-11"
          placeholder="ابحث عن عضو بالاسم"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="ابحث عن عضو"
        />
      </label>

      <AnimatePresence mode="wait">
        {q.trim() ? (
          <motion.section
            key="results"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-card p-3"
            aria-live="polite"
          >
            <p className="px-2 pb-2 text-sm text-[var(--p-dim)]">
              {results.length ? `${results.length} نتيجة` : "ما لقينا أحد بهذا الاسم"}
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => m.committee_id && onOpen(m.committee_id, m.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-[rgb(200_222_211/0.05)]"
                  >
                    <Avatar name={m.full_name} size={36} />
                    <span className="min-w-0">
                      <b className="block truncate text-sm">
                        <Highlight text={m.full_name} q={q.trim()} />
                      </b>
                      <span className="text-xs text-[var(--p-dim)]">
                        {titleOf(m)} ·{" "}
                        {dir.team(m.team_id)?.name ??
                          dir.committee(m.committee_id)?.title ??
                          "قيادة المبادرة"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        ) : (
          <motion.div
            key="tree"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            {mine && (
              <button
                type="button"
                onClick={() => onOpen(mine.id)}
                className="group flex items-center gap-4 rounded-[22px] border border-[var(--p-line-strong)] p-4 text-start transition-colors hover:bg-[rgb(200_222_211/0.04)]"
                style={{
                  background: `linear-gradient(90deg, color-mix(in oklab, ${mine.accent} 10%, transparent), transparent)`,
                }}
              >
                <span className="h-10 w-1 rounded-full" style={{ background: mine.accent }} />
                <span className="flex-1">
                  <span className="text-xs text-[var(--p-dim)]">لجنتك</span>
                  <b className="block font-display text-lg">{mine.title}</b>
                </span>
                <span className="text-sm text-[var(--p-soft)]">
                  {dir.membersOf(mine.id).length} عضو ‹
                </span>
              </button>
            )}

            <section aria-label="قيادة المبادرة" className="flex flex-col items-center">
              <p className="mb-3 text-sm font-bold text-[var(--p-dim)]">قيادة المبادرة</p>
              <div className="flex flex-wrap justify-center gap-3">
                {leadership.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.45, ease: EASE }}
                    className={cn(
                      "p-card flex items-center gap-3 px-4 py-3",
                      m.role === "president" && "border-[rgb(198_164_92/0.35)]",
                    )}
                  >
                    <Avatar
                      name={m.full_name}
                      size={42}
                      ring={m.role === "president" ? "var(--p-gold)" : undefined}
                    />
                    <span>
                      <b className="block">{m.full_name}</b>
                      <span className="text-xs text-[var(--p-gold-soft)]">{titleOf(m)}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
              <span aria-hidden="true" className="mt-3 h-6 w-px bg-[var(--p-line-strong)]" />
            </section>

            <section aria-label="اللجان" className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-x-[7%] top-0 h-px bg-[var(--p-line-strong)]"
              />
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-5 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0"
              >
                {dir.committees.map((c) => {
                  const lead = leadOf(dir, c)[0];
                  const teams = dir.teamsOf(c.id);
                  const isExp = expanded === c.id;
                  return (
                    <motion.li
                      key={c.id}
                      variants={itemVariants}
                      className="relative w-[180px] shrink-0 snap-start lg:w-auto"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -top-5 left-1/2 h-5 w-px bg-[var(--p-line-strong)]"
                      />
                      <div
                        className={cn(
                          "p-card flex h-full flex-col overflow-hidden transition-colors",
                          isExp && "border-[var(--p-line-strong)]",
                        )}
                      >
                        <span className="h-1" style={{ background: c.accent }} />
                        <button
                          type="button"
                          onClick={() => onOpen(c.id)}
                          className="flex flex-1 flex-col items-start gap-1.5 p-4 text-start hover:bg-[rgb(200_222_211/0.03)]"
                        >
                          <b className="font-display leading-snug">{c.title}</b>
                          <span className="text-xs text-[var(--p-dim)]">
                            {dir.membersOf(c.id).length} عضو
                          </span>
                          {lead && (
                            <span className="mt-1 flex items-center gap-1 text-xs text-[var(--p-soft)]">
                              <Crown className="size-3 text-[var(--p-gold)]" /> {lead.full_name}
                            </span>
                          )}
                        </button>
                        {teams.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpanded(isExp ? null : c.id)}
                            aria-expanded={isExp}
                            className="flex items-center justify-center gap-1 border-t border-[var(--p-line)] py-2 text-xs font-bold text-[var(--p-soft)] hover:bg-[rgb(200_222_211/0.04)]"
                          >
                            {teams.length} فرق
                            <motion.span
                              animate={{ rotate: isExp ? 180 : 0 }}
                              transition={{ duration: 0.3, ease: EASE }}
                            >
                              <ChevronDown className="size-3.5" />
                            </motion.span>
                          </button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </section>

            <AnimatePresence initial={false}>
              {exp && (
                <motion.section
                  key={exp.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="overflow-hidden"
                  aria-label={`فرق ${exp.title}`}
                >
                  <div
                    className="p-card p-4"
                    style={{ borderColor: `color-mix(in oklab, ${exp.accent} 30%, transparent)` }}
                  >
                    <p className="mb-3 text-sm font-bold" style={{ color: exp.accent }}>
                      فرق {exp.title}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {dir.teamsOf(exp.id).map((t, i) => {
                        const heads = dir.members.filter(
                          (m) => m.team_id === t.id && TEAM_HEADS.includes(m.role),
                        );
                        const count = dir.members.filter((m) => m.team_id === t.id).length;
                        return (
                          <motion.button
                            key={t.id}
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}
                            onClick={() => onOpen(exp.id)}
                            className="p-well flex items-center gap-3 p-3.5 text-start transition-colors hover:bg-[rgb(200_222_211/0.06)]"
                          >
                            <span className="min-w-0 flex-1">
                              <b className="block truncate">{t.name}</b>
                              <span className="block truncate text-xs text-[var(--p-soft)]">
                                <Crown className="me-1 inline size-3 text-[var(--p-gold)]" />
                                {heads.map((h) => h.full_name).join(" · ") || "—"}
                              </span>
                            </span>
                            <span className="text-xs text-[var(--p-dim)]">{count} عضو</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.indexOf(q);
  if (i < 0 || !q) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-[rgb(198_164_92/0.3)] px-0.5 text-[var(--p-text)]">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function CommitteeView({
  dir,
  committee: c,
  focus,
  onBack,
}: {
  dir: Directory;
  committee: Committee;
  focus?: string | undefined;
  onBack: () => void;
}) {
  const tiers = useMemberTiers();
  const members = dir.membersOf(c.id);
  const heads = leadOf(dir, c);
  const teams = dir.teamsOf(c.id);
  const projectLeads = members.filter((m) => m.role === "project_lead");
  const loose = members.filter(
    (m) => !m.team_id && !COMMITTEE_HEADS.includes(m.role) && m.role !== "project_lead",
  );

  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(
      () =>
        document
          .getElementById(`m-${focus}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      450,
    );
    return () => clearTimeout(t);
  }, [focus]);

  const person = (m: Member) => (
    <MemberChip key={m.id} m={m} tier={tiers.data?.[m.id]} focused={m.id === focus} />
  );

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-bold text-[var(--p-soft)] hover:text-[var(--p-text)]"
      >
        <ArrowRight className="size-4" /> المجتمع
      </button>
      <section className="p-card relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 120% at 100% 0%, color-mix(in oklab, ${c.accent} 16%, transparent), transparent 70%)`,
          }}
        />
        <div className="relative">
          <span className="mb-3 block h-1 w-12 rounded-full" style={{ background: c.accent }} />
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{c.title}</h1>
          {c.description && <p className="mt-2 max-w-xl text-[var(--p-soft)]">{c.description}</p>}
          <p className="mt-3 text-sm text-[var(--p-dim)]">
            {members.length} عضو{teams.length ? ` · ${teams.length} فرق` : ""}
          </p>
        </div>
      </section>

      <Block title="قيادة اللجنة">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {heads.map((m) => (
            <div
              key={m.id}
              id={`m-${m.id}`}
              className={cn(
                "p-card flex items-center gap-3 p-4",
                m.id === focus && "ring-2 ring-[var(--p-gold)]",
              )}
            >
              <Avatar
                name={m.full_name}
                size={46}
                ring={m.role === "committee_lead" ? c.accent : undefined}
              />
              <span className="min-w-0 flex-1">
                <b className="block truncate">{m.full_name}</b>
                <span className="text-xs text-[var(--p-gold-soft)]">{titleOf(m)}</span>
              </span>
              {tiers.data?.[m.id] && (
                <TierGem tierId={tiers.data[m.id]!.tier_id} className="size-4" />
              )}
            </div>
          ))}
        </div>
      </Block>

      {projectLeads.length > 0 && (
        <Block title="قادة المشاريع">
          <div className="flex flex-wrap gap-2">{projectLeads.map(person)}</div>
        </Block>
      )}

      {teams.map((t) => {
        const tm = members.filter((m) => m.team_id === t.id);
        const tHeads = tm.filter((m) => TEAM_HEADS.includes(m.role));
        const rest = tm.filter((m) => !TEAM_HEADS.includes(m.role));
        return (
          <Block key={t.id} title={t.name} hint={`${tm.length} عضو`}>
            <div className="p-card p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[var(--p-dim)]">{t.head_title}:</span>
                {tHeads.map((h) => (
                  <span
                    key={h.id}
                    id={`m-${h.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-full bg-[rgb(198_164_92/0.1)] py-1 pe-3 ps-1",
                      h.id === focus && "ring-2 ring-[var(--p-gold)]",
                    )}
                  >
                    <Avatar name={h.full_name} size={26} />
                    <b className="text-sm">{h.full_name}</b>
                    <span className="text-[11px] text-[var(--p-gold-soft)]">{titleOf(h)}</span>
                  </span>
                ))}
              </div>
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="flex flex-wrap gap-2"
              >
                {rest.map(person)}
              </motion.div>
            </div>
          </Block>
        );
      })}

      {loose.length > 0 && (
        <Block title={teams.length ? "أعضاء بدون فريق" : "الأعضاء"} hint={`${loose.length} عضو`}>
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="p-card flex flex-wrap gap-2 p-4 sm:p-5"
          >
            {loose.map(person)}
          </motion.div>
        </Block>
      )}
    </div>
  );
}

function Block({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {hint && <span className="text-xs text-[var(--p-dim)]">{hint}</span>}
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--p-line)]" />
      </div>
      {children}
    </section>
  );
}

function MemberChip({
  m,
  tier,
  focused,
}: {
  m: Member;
  tier?: { tier_id: string; tier_name: string } | undefined;
  focused?: boolean | undefined;
}) {
  const me = useMe();
  return (
    <motion.span
      variants={itemVariants}
      id={`m-${m.id}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[var(--p-line)] bg-[rgb(200_222_211/0.03)] py-1 pe-3 ps-1 text-sm",
        m.id === me.id && "border-[rgb(198_164_92/0.4)]",
        focused && "ring-2 ring-[var(--p-gold)]",
      )}
      title={tier ? `المستوى ${tier.tier_name}` : undefined}
    >
      <Avatar name={m.full_name} size={26} />
      {m.full_name}
      {m.extra_titles.map((t) => (
        <span key={t} title={t}>
          <Chip tone="gold" className="px-2 py-0.5 text-[10px]">
            {t.split(" · ")[0]}
          </Chip>
        </span>
      ))}
      {tier && <TierGem tierId={tier.tier_id} className="size-3.5" />}
    </motion.span>
  );
}
