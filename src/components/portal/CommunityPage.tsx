import { useMemo, useState } from "react";
import { Crown, Lightbulb, Search, ShieldCheck, UserRoundSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { committees, members, roleLabels, type Member, type Role } from "@/data/demo";
import { useDemoAuth } from "@/lib/demo-auth";
import { cn } from "@/lib/utils";
import { EmptyState, MemberAvatar, PageHeader, SampleBadge, TierBadge, roleStyle } from "./shared";

const leadership: { role: Role; icon: typeof Crown }[] = [
  { role: "القائدة", icon: Crown },
  { role: "النائب", icon: ShieldCheck },
  { role: "المستشار", icon: Lightbulb },
];

// Normalise Arabic letter variants so searches like "اسامه" find "أسامة".
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ْ]/g, "")
    .trim();

export function CommunityPage() {
  const { member: me } = useDemoAuth();
  const [committee, setCommittee] = useState<string>("all");
  const [query, setQuery] = useState("");
  const q = norm(query);

  const groups = useMemo(
    () =>
      committees
        .filter((c) => committee === "all" || c.id === committee)
        .map((c) => {
          const all = members.filter((m) => m.committee === c.id);
          const matches = q ? all.filter((m) => norm(m.name).includes(q)) : all;
          return { committee: c, all, matches };
        })
        .filter((g) => !q || g.matches.length > 0),
    [committee, q],
  );

  const resultCount = groups.reduce((n, g) => n + g.matches.length, 0);

  return (
    <div>
      <PageHeader title="المجتمع" text="دليل لجان إثمار وقياداتها وأعضائها.">
        <SampleBadge>أسماء نموذجية للعرض</SampleBadge>
      </PageHeader>

      <div className="space-y-4 rounded-3xl border border-border bg-card p-4 shadow-card md:p-5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم العضو…"
            aria-label="البحث عن عضو بالاسم"
            className="h-12 w-full rounded-2xl border border-input bg-background pe-11 ps-11 text-base shadow-sm transition placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="مسح البحث"
              className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div
          role="group"
          aria-label="تصفية حسب اللجنة"
          className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          <FilterChip
            on={committee === "all"}
            onClick={() => setCommittee("all")}
            label="كل اللجان"
            count={members.length}
          />
          {committees.map((c) => (
            <FilterChip
              key={c.id}
              on={committee === c.id}
              onClick={() => setCommittee(c.id)}
              label={c.name}
              count={members.filter((m) => m.committee === c.id).length}
            />
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {q
          ? `${resultCount} نتيجة للبحث عن "${query.trim()}"`
          : `${groups.length} ${groups.length === 1 ? "لجنة" : "لجان"} · ${resultCount} عضو`}
      </p>

      {groups.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={UserRoundSearch}
            title="لا يوجد عضو بهذا الاسم"
            text="جرّب كتابة جزء من الاسم، أو اختر «كل اللجان»."
            action={
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setQuery("");
                  setCommittee("all");
                }}
              >
                مسح البحث والتصفية
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {groups.map(({ committee: c, all, matches }) => {
            const mine = me?.committee === c.id;
            const leaders = leadership.map((l) => ({
              ...l,
              person: all.find((m) => m.role === l.role),
            }));
            const shownLeaders = q
              ? leaders.filter((l) => l.person && matches.includes(l.person))
              : leaders;
            const regular = matches.filter((m) => m.role === "عضو");
            return (
              <article
                key={c.id}
                className={cn(
                  "flex flex-col rounded-3xl border bg-card p-5 shadow-card md:p-6",
                  mine ? "border-primary/30" : "border-border",
                )}
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-primary">{c.title}</h2>
                    {c.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {mine && (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                        لجنتك
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{all.length} أعضاء</span>
                  </div>
                </header>

                {shownLeaders.length > 0 && (
                  <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                    {shownLeaders.map(({ role, icon: Icon, person }) => (
                      <li
                        key={role}
                        className={cn(
                          "rounded-2xl border p-3",
                          person
                            ? "border-border bg-[oklch(0.985_0.006_100)]"
                            : "border-dashed border-border",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                            roleStyle[role],
                          )}
                        >
                          <Icon className="h-3 w-3" /> {roleLabels[role]}
                        </span>
                        {person ? (
                          <div className="mt-2.5 flex items-center gap-2">
                            <MemberAvatar name={person.name} id={person.id} size="sm" />
                            <PersonName m={person} me={me?.id} q={q} />
                          </div>
                        ) : (
                          <p className="mt-2.5 text-sm text-muted-foreground">غير محدد</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {(regular.length > 0 || !q) && (
                  <div className="mt-5">
                    <p className="mb-2.5 text-xs font-bold text-muted-foreground">الأعضاء</p>
                    {regular.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        لا يوجد أعضاء آخرون في هذه اللجنة حاليًا.
                      </p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {regular.map((m) => (
                          <li
                            key={m.id}
                            className={cn(
                              "flex items-center gap-2 rounded-full border py-1 pe-3 ps-1",
                              m.id === me?.id
                                ? "border-primary/40 bg-secondary/60"
                                : "border-border",
                            )}
                          >
                            <MemberAvatar name={m.name} id={m.id} size="sm" className="ring-0" />
                            <PersonName m={m} me={me?.id} q={q} />
                            <TierBadge hours={m.totalHours} size="sm" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonName({ m, me, q }: { m: Member; me?: string; q: string }) {
  return (
    <span className="min-w-0 truncate text-sm font-bold text-foreground">
      {q ? <Highlight text={m.name} q={q} /> : m.name}
      {m.id === me && (
        <span className="ms-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">
          أنت
        </span>
      )}
    </span>
  );
}

/** Highlights the first match of q (normalised) inside text. Character positions are preserved by norm(). */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = norm(text).indexOf(q);
  // norm() drops diacritics, which could shift positions; demo names have none, so fall back safely.
  if (i < 0 || norm(text).length !== text.toLowerCase().trim().length) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-gold/30 px-0.5 text-foreground">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function FilterChip({
  on,
  onClick,
  label,
  count,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground/75 hover:border-primary/40",
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 text-xs", on ? "bg-ivory/20" : "bg-muted")}>
        {count}
      </span>
    </button>
  );
}
