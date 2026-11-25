// «مثمرينا» — the public view of Ethmar's official structure (src/data/structure.ts).
// Leadership on top, the committees as a horizontal row of cards; choosing one opens its
// leaders, teams and members below. Names only — no hours or tiers on the public site.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  ChevronDown,
  Cpu,
  Crown,
  FolderKanban,
  Handshake,
  LineChart,
  Megaphone,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  structureCommittees,
  structurePeople,
  structureTeams,
  type StructCommittee,
  type StructPerson,
} from "@/data/structure";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

const ease = [0.22, 1, 0.36, 1] as const;
const ICONS: Record<string, LucideIcon> = {
  tech: Cpu,
  pr: Handshake,
  hr: Users,
  media: Megaphone,
  fin: LineChart,
  quality: BadgeCheck,
  projects: FolderKanban,
};
const COMMITTEE_HEADS = ["committee_lead", "committee_deputy"];
const TEAM_HEADS = ["team_lead", "team_deputy", "team_supervisor"];
const ROLE_TITLE: Record<string, string> = {
  president: "رئيس المبادرة",
  vice_president: "نائب الرئيس",
  committee_lead: "قائد اللجنة",
  committee_deputy: "نائب القائد",
  team_lead: "قائد الفريق",
  team_deputy: "نائب قائد الفريق",
  team_supervisor: "إشراف",
  project_lead: "قائد مشروع",
  member: "عضو",
};
const titleOf = (p: StructPerson) => p.title ?? ROLE_TITLE[p.role] ?? "";
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]!.replace(/^ال/, "")[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]!.replace(/^ال/, "")[0] ?? "") : "";
  return first + last;
};
const inCommittee = (id: string) => structurePeople.filter((p) => p.committee_id === id);

function Avatar({
  name,
  size = 44,
  ring,
}: {
  name: string;
  size?: number;
  ring?: string | undefined;
}) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-[#0f3a2f] font-display font-extrabold text-mint"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        boxShadow: ring ? `0 0 0 2px ${ring}` : "inset 0 0 0 1px rgb(200 222 211 / .14)",
      }}
    >
      {initials(name)}
    </span>
  );
}

export function StructureTree() {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const reduce = useReducedMotion();
  const leadership = structurePeople.filter(
    (p) => p.role === "president" || p.role === "vice_president",
  );
  const president = leadership.find((p) => p.role === "president");
  const vps = leadership.filter((p) => p.role === "vice_president");
  const leaders = structurePeople.filter((p) => p.role !== "member").length;
  const results = useMemo(() => {
    const s = q.trim();
    return s ? structurePeople.filter((p) => p.name.includes(s)).slice(0, 12) : [];
  }, [q]);
  const current = structureCommittees.find((c) => c.id === open);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 md:pb-28 md:pt-16">
      {/* numbers */}
      <Reveal>
        <dl className="mx-auto grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border text-center sm:grid-cols-4">
          {[
            { k: "لجان", v: structureCommittees.length },
            { k: "فرق عمل", v: structureTeams.length },
            { k: "قائد وقائدة", v: leaders },
            { k: "عضو وعضوة", v: structurePeople.length - leaders },
          ].map((s) => (
            <div key={s.k} className="bg-card px-3 py-5">
              <dt className="text-xs text-muted-foreground sm:text-sm">{s.k}</dt>
              <dd className="mt-1 font-display text-3xl font-black text-mint">{s.v}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* leadership */}
      <section aria-labelledby="lead-h" className="mt-16 flex flex-col items-center">
        <h2 id="lead-h" className="mb-5 text-sm font-bold text-muted-foreground">
          قيادة المبادرة
        </h2>
        {president && (
          <Reveal>
            <div className="flex items-center gap-4 rounded-3xl border border-gold/35 bg-card px-6 py-4">
              <Avatar name={president.name} size={56} ring="var(--gold)" />
              <div>
                <p className="font-display text-xl font-extrabold">{president.name}</p>
                <p className="text-sm text-gold">{titleOf(president)}</p>
              </div>
            </div>
          </Reveal>
        )}
        <span aria-hidden className="h-6 w-px bg-border" />
        <div className="relative grid w-full max-w-xl grid-cols-1 gap-3 pt-6 sm:grid-cols-2">
          <span
            aria-hidden
            className="absolute inset-x-[25%] top-0 hidden h-px bg-border sm:block"
          />
          {vps.map((p, i) => (
            <Reveal key={p.name} delay={0.08 + i * 0.06} className="relative">
              <span
                aria-hidden
                className="absolute -top-6 left-1/2 hidden h-6 w-px bg-border sm:block"
              />
              <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-5 py-4">
                <Avatar name={p.name} size={46} />
                <div>
                  <p className="font-display font-bold">{p.name}</p>
                  <p className="text-xs text-gold">{titleOf(p)}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <span aria-hidden className="mt-6 h-8 w-px bg-border" />
      </section>

      {/* committees */}
      <section aria-labelledby="com-h" className="relative">
        <h2 id="com-h" className="sr-only">
          اللجان
        </h2>
        <div aria-hidden className="absolute inset-x-[7%] top-0 hidden h-px bg-border lg:block" />
        <ul className="scrollbar-none -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-3 pt-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0">
          {structureCommittees.map((c, i) => (
            <CommitteeCard
              key={c.id}
              c={c}
              i={i}
              active={open === c.id}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
            />
          ))}
        </ul>

        <AnimatePresence initial={false} mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.45, ease }}
              className="overflow-hidden"
            >
              <CommitteeDetail c={current} />
            </motion.div>
          )}
        </AnimatePresence>
        {!current && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            اختر لجنة تشوف قادتها وفرقها وأعضاءها
          </p>
        )}
      </section>

      {/* search */}
      <section aria-labelledby="find-h" className="mx-auto mt-20 max-w-2xl">
        <h2 id="find-h" className="mb-4 text-center font-display text-2xl font-extrabold">
          تدوّر على أحد؟
        </h2>
        <label className="relative block">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-12 w-full rounded-2xl border border-input bg-card ps-11 pe-4 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gold"
            placeholder="اكتب الاسم"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="ابحث في مثمرينا"
          />
        </label>
        {q.trim() && (
          <ul
            className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
            aria-live="polite"
          >
            {results.length === 0 && (
              <li className="p-4 text-center text-sm text-muted-foreground">ما لقينا هذا الاسم</li>
            )}
            {results.map((p) => {
              const c = structureCommittees.find((x) => x.id === p.committee_id);
              const t = structureTeams.find((x) => x.id === p.team_id);
              return (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => {
                      if (c) setOpen(c.id);
                      setQ("");
                      document
                        .getElementById("com-h")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-secondary"
                  >
                    <Avatar name={p.name} size={34} />
                    <span>
                      <b className="block text-sm">{p.name}</b>
                      <span className="text-xs text-muted-foreground">
                        {[titleOf(p), t?.name ?? c?.title ?? "قيادة المبادرة"].join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CommitteeCard({
  c,
  i,
  active,
  onToggle,
}: {
  c: StructCommittee;
  i: number;
  active: boolean;
  onToggle: () => void;
}) {
  const Icon = ICONS[c.id] ?? Users;
  const people = inCommittee(c.id);
  const lead = people.find((p) => p.role === "committee_lead");
  const teams = structureTeams.filter((t) => t.committee_id === c.id);
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease, delay: i * 0.05 }}
      className="relative w-[11.5rem] shrink-0 snap-start lg:w-auto"
    >
      <span aria-hidden className="absolute -top-6 left-1/2 hidden h-6 w-px bg-border lg:block" />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={active}
        className={cn(
          "group flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-card text-start transition-all duration-300",
          active
            ? "border-transparent shadow-[0_0_0_1.5px_var(--accent-c)]"
            : "border-border hover:-translate-y-0.5 hover:border-mint/25",
        )}
        style={{ ["--accent-c" as string]: c.accent }}
      >
        <span className="h-1" style={{ background: c.accent }} />
        <span className="flex flex-1 flex-col gap-2 p-4">
          <span
            className="grid size-10 place-items-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${c.accent} 14%, transparent)`,
              color: c.accent,
            }}
          >
            <Icon className="size-5" />
          </span>
          <b className="font-display leading-snug">{c.title}</b>
          <span className="text-xs text-muted-foreground">
            {people.length} عضو{teams.length ? ` · ${teams.length} فرق` : ""}
          </span>
          {lead && (
            <span className="mt-auto flex items-center gap-1 pt-1 text-xs text-mint/85">
              <Crown className="size-3 text-gold" /> {lead.name}
            </span>
          )}
        </span>
        <span className="flex items-center justify-center gap-1 border-t border-border py-2 text-xs font-bold text-mint/80">
          {active ? "إخفاء" : "التفاصيل"}
          <ChevronDown
            className={cn("size-3.5 transition-transform duration-300", active && "rotate-180")}
          />
        </span>
      </button>
    </motion.li>
  );
}

function CommitteeDetail({ c }: { c: StructCommittee }) {
  const people = inCommittee(c.id);
  const heads = people
    .filter((p) => COMMITTEE_HEADS.includes(p.role))
    .sort((a) => (a.role === "committee_lead" ? -1 : 1));
  const teams = structureTeams.filter((t) => t.committee_id === c.id);
  const projectLeads = people.filter((p) => p.role === "project_lead");
  const loose = people.filter((p) => !p.team_id && p.role === "member");

  return (
    <div
      className="mt-6 rounded-[2rem] border bg-card p-5 sm:p-8"
      style={{ borderColor: `color-mix(in oklab, ${c.accent} 30%, transparent)` }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-extrabold">{c.title}</h3>
          {c.description && <p className="mt-1 text-muted-foreground">{c.description}</p>}
        </div>
        <span className="text-sm text-muted-foreground">{people.length} عضو</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {heads.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3.5"
          >
            <Avatar
              name={p.name}
              size={44}
              ring={p.role === "committee_lead" ? c.accent : undefined}
            />
            <div>
              <b className="block">{p.name}</b>
              <span className="text-xs text-gold">{titleOf(p)}</span>
            </div>
          </div>
        ))}
      </div>

      {projectLeads.length > 0 && <Group title="قادة المشاريع" names={projectLeads} />}

      {teams.map((t) => {
        const tm = people.filter((p) => p.team_id === t.id);
        const th = tm.filter((p) => TEAM_HEADS.includes(p.role));
        return (
          <div key={t.id} className="mt-7">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h4 className="font-display text-lg font-bold">{t.name}</h4>
              <span className="text-xs text-muted-foreground">{tm.length} عضو</span>
              <span aria-hidden className="hidden h-px flex-1 bg-border sm:block" />
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {th.map((h) => (
                <span
                  key={h.name}
                  className="flex items-center gap-2 rounded-full bg-gold/10 py-1 pe-3 ps-1 text-sm"
                >
                  <Avatar name={h.name} size={26} />
                  <b>{h.name}</b>
                  <span className="text-[11px] text-gold">{titleOf(h)}</span>
                </span>
              ))}
            </div>
            <Names people={tm.filter((p) => !TEAM_HEADS.includes(p.role))} />
          </div>
        );
      })}

      {loose.length > 0 && (
        <Group title={teams.length ? "أعضاء بدون فريق" : "الأعضاء"} names={loose} />
      )}
    </div>
  );
}

function Group({ title, names }: { title: string; names: StructPerson[] }) {
  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center gap-3">
        <h4 className="font-display text-lg font-bold">{title}</h4>
        <span className="text-xs text-muted-foreground">{names.length}</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <Names people={names} />
    </div>
  );
}

function Names({ people }: { people: StructPerson[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {people.map((p, i) => (
        <motion.li
          key={p.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease, delay: Math.min(i, 20) * 0.015 }}
          className="flex items-center gap-2 rounded-full border border-border bg-background/40 py-1 pe-3 ps-1 text-sm"
        >
          <Avatar name={p.name} size={26} />
          {p.name}
        </motion.li>
      ))}
    </ul>
  );
}
