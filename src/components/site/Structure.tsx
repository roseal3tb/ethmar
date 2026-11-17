import { Link } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  BadgeCheck,
  ChevronLeft,
  Cpu,
  FolderKanban,
  Handshake,
  LineChart,
  Megaphone,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { affiliation, committees, leadership, type Committee, type Person } from "@/data/site";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SectionHead } from "./Sections";

const committeeIcons: Record<string, LucideIcon> = {
  pr: Handshake,
  hr: Users,
  media: Megaphone,
  fincontent: LineChart,
  quality: BadgeCheck,
  tech: Cpu,
  projects: FolderKanban,
};

const leaderCount =
  1 +
  leadership.vicePresidents.length +
  committees.reduce(
    (n, c) => n + c.leads.length + c.teams.reduce((m, t) => m + t.people.length, 0),
    0,
  );

/* ---------------------------------------------------------------- Person */

function PersonCard({
  person,
  size = "sm",
  featured,
}: {
  person: Person;
  size?: "sm" | "md" | "lg";
  featured?: boolean;
}) {
  const w =
    size === "lg"
      ? "w-[13.5rem] sm:w-60"
      : size === "md"
        ? "w-[10.5rem] sm:w-44"
        : "w-[8.75rem] sm:w-[9.5rem]";
  return (
    <article className={cn("group", w)}>
      <div
        className={cn(
          "relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border text-center transition-all duration-500 hover:-translate-y-1",
          size === "lg" ? "aspect-[5/4] p-6" : "aspect-square p-4",
          featured
            ? "bg-hero grain border-transparent text-ivory shadow-lift"
            : "border-border bg-card shadow-card hover:border-primary/25 hover:shadow-soft",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-center scale-x-0 bg-gold transition-transform duration-500 ease-out group-hover:scale-x-100"
        />
        <span
          className={cn(
            "relative grid shrink-0 place-items-center rounded-full transition-transform duration-500 group-hover:scale-105",
            size === "lg" ? "size-16" : size === "md" ? "size-12 sm:size-14" : "size-10 sm:size-11",
            featured
              ? "border border-gold/50 bg-gold/10 text-gold"
              : "border border-primary/15 bg-secondary/60 text-primary",
          )}
        >
          <User
            aria-hidden
            strokeWidth={1.6}
            className={size === "lg" ? "size-8" : size === "md" ? "size-6" : "size-5"}
          />
        </span>
        <div className="relative min-w-0">
          <h4
            className={cn(
              "font-display font-extrabold leading-tight",
              size === "lg"
                ? "text-xl"
                : size === "md"
                  ? "text-[0.95rem] sm:text-base"
                  : "text-[0.8rem] sm:text-sm",
              featured ? "text-ivory" : "text-foreground",
            )}
          >
            {person.name}
          </h4>
          <p
            className={cn(
              "mt-1 leading-normal",
              size === "sm" ? "text-[0.7rem] sm:text-xs" : "text-xs",
              featured ? "text-mint" : "text-muted-foreground",
            )}
          >
            {person.role}
          </p>
        </div>
      </div>
    </article>
  );
}

function CardRow({
  people,
  size,
  className,
}: {
  people: Person[];
  size: "sm" | "md";
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-stretch justify-center gap-3 sm:gap-4", className)}>
      {people.map((p, i) => (
        <li key={p.name} className="flex">
          <Reveal delay={Math.min(i, 8) * 0.05} className="flex">
            <PersonCard person={p} size={size} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- Committee */

function CommitteeBlock({ committee: c }: { committee: Committee }) {
  const Icon = committeeIcons[c.id] ?? Users;
  return (
    <section id={c.id} aria-labelledby={`${c.id}-title`} className="scroll-mt-28">
      <Reveal>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-mint shadow-soft">
            <Icon aria-hidden className="size-6" />
          </span>
          <h2
            id={`${c.id}-title`}
            className="font-display text-2xl font-black text-primary md:text-[1.7rem]"
          >
            {c.title}
          </h2>
          <span
            aria-hidden
            className="h-px w-20 bg-gradient-to-l from-transparent via-gold to-transparent"
          />
        </div>
      </Reveal>

      <CardRow people={c.leads} size="md" className="mt-7" />

      {c.teams.length > 0 && (
        <div
          className={cn(
            "mt-8 grid gap-8",
            c.teams.length > 1 && "lg:grid-cols-2",
            c.teams.length > 2 && "xl:grid-cols-3",
          )}
        >
          {c.teams.map((t) => (
            <div
              key={t.name}
              className={cn(
                "rounded-[1.75rem] border border-dashed border-primary/15 bg-sage/60 p-5",
                c.teams.length === 1 && "mx-auto w-full max-w-5xl",
              )}
            >
              <p className="mb-4 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 font-display text-sm font-bold text-primary shadow-sm">
                  <span className="h-1.5 w-1.5 rotate-45 bg-copper" aria-hidden />
                  {t.name}
                </span>
              </p>
              <CardRow people={t.people} size="sm" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Page */

export function StructureTree() {
  const { president, vicePresidents } = leadership;
  return (
    <>
      {/* Initiative leadership */}
      <section aria-labelledby="leadership-title" className="mx-auto max-w-7xl px-5 pt-16 md:pt-20">
        <Reveal>
          <ol
            aria-label="الجهة المشرفة"
            className="mx-auto flex max-w-fit flex-wrap items-center justify-center gap-x-1.5 gap-y-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-card sm:text-sm"
          >
            {affiliation.map((a, i) => (
              <li key={a} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-3 py-1",
                    i === affiliation.length - 1 && "bg-secondary font-bold text-primary",
                  )}
                >
                  {a}
                </span>
                {i < affiliation.length - 1 && (
                  <ChevronLeft className="h-3.5 w-3.5 text-gold" aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </Reveal>

        <h2 id="leadership-title" className="sr-only">
          قيادة المبادرة
        </h2>
        <div className="mt-10 flex flex-col items-center">
          <span
            aria-hidden
            className="mb-4 h-8 w-px bg-gradient-to-b from-transparent to-primary/40"
          />
          <Reveal>
            <PersonCard person={president} size="lg" featured />
          </Reveal>
          <span aria-hidden className="h-8 w-px bg-primary/30" />
          <div className="relative flex flex-wrap justify-center gap-3 pt-6 sm:gap-4">
            <span
              aria-hidden
              className="absolute inset-x-[25%] top-0 hidden h-px bg-primary/30 sm:block"
            />
            {vicePresidents.map((p, i) => (
              <Reveal key={p.name} delay={0.1 + i * 0.08} className="relative">
                <span
                  aria-hidden
                  className="absolute -top-6 left-1/2 hidden h-6 w-px bg-primary/30 sm:block"
                />
                <PersonCard person={p} size="md" />
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal>
          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 divide-x divide-border overflow-hidden rounded-3xl border border-border bg-card text-center shadow-card">
            {[
              { k: "لجان", v: committees.length },
              { k: "فرق عمل", v: committees.reduce((n, c) => n + c.teams.length, 0) },
              { k: "قائد وقائدة", v: leaderCount },
            ].map((s) => (
              <div key={s.k} className="px-3 py-5">
                <dt className="text-xs text-muted-foreground sm:text-sm">{s.k}</dt>
                <dd className="mt-1 font-display text-3xl font-black text-primary">{s.v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* Quick committee navigation */}
      <nav aria-label="اللجان" className="sticky top-3 z-30 mx-auto mt-12 max-w-7xl px-5">
        <ul className="scrollbar-none mx-auto flex max-w-fit gap-1.5 overflow-x-auto rounded-full border border-border bg-card/90 p-1.5 shadow-card backdrop-blur-xl">
          {committees.map((c) => (
            <li key={c.id} className="shrink-0">
              <a
                href={`#${c.id}`}
                className="block rounded-full px-3.5 py-2 text-sm font-bold text-foreground/70 transition hover:bg-secondary hover:text-primary"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Committees */}
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 md:pb-28">
        {committees.map((c, i) => (
          <div key={c.id}>
            {i > 0 && (
              <div aria-hidden className="my-14 flex items-center justify-center gap-3 md:my-16">
                <span className="h-px w-full max-w-[10rem] bg-border" />
                <span className="h-2 w-2 rotate-45 bg-gold/70" />
                <span className="h-px w-full max-w-[10rem] bg-border" />
              </div>
            )}
            <CommitteeBlock committee={c} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Teaser */

export function StructureTeaser() {
  const { president, vicePresidents } = leadership;
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:py-24">
      <div className="bg-sage-wash relative overflow-hidden rounded-[2.25rem] border border-primary/10 p-7 md:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <SectionHead eyebrow="الهيكلة" title="الأشخاص خلف إثمار" />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                قيادة واحدة و{committees.length} لجان تعمل بتكامل لصناعة الأثر، تحت مظلة برنامج
                الشراكة الطلابية.
              </p>
              <Button asChild variant="brand" size="xl" className="mt-7">
                <Link to="/structure">
                  استعرض الهيكلة كاملة <ArrowUpLeft />
                </Link>
              </Button>
            </Reveal>
          </div>
          <div className="lg:col-span-7">
            <Reveal delay={0.1}>
              <div className="flex flex-col items-center">
                <PersonCard person={president} size="lg" featured />
                <span aria-hidden className="h-6 w-px bg-primary/30" />
                <div className="flex flex-wrap justify-center gap-3">
                  {vicePresidents.map((p) => (
                    <PersonCard key={p.name} person={p} size="md" />
                  ))}
                </div>
                <ul className="mt-6 flex flex-wrap justify-center gap-2">
                  {committees.map((c) => {
                    const Icon = committeeIcons[c.id] ?? Users;
                    return (
                      <li key={c.id}>
                        <Link
                          to="/structure"
                          hash={c.id}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground/75 transition hover:border-primary/30 hover:text-primary"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                          {c.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
