import { Check, Crown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useDirectory } from "@/lib/portal/queries";
import type { Member } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { Avatar, titleOf } from "./ui";

/** Searchable multi-select of members, with an optional "lead" toggle per selected person. */
export function MemberPicker({
  value,
  onChange,
  leads,
  onLeadsChange,
  filter,
  height = "max-h-72",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  leads?: string[] | undefined;
  onLeadsChange?: ((ids: string[]) => void) | undefined;
  filter?: ((m: Member) => boolean) | undefined;
  height?: string | undefined;
}) {
  const { dir } = useDirectory();
  const [q, setQ] = useState("");
  const [committee, setCommittee] = useState<string>("");
  const pool = useMemo(() => {
    let list = (dir?.members ?? []).filter((m) => (filter ? filter(m) : true));
    if (committee) list = list.filter((m) => m.committee_id === committee);
    const t = q.trim();
    if (t) list = list.filter((m) => m.full_name.includes(t) || (m.member_code ?? "").includes(t));
    // Selected first, then by name.
    return list.sort(
      (a, b) =>
        Number(value.includes(b.id)) - Number(value.includes(a.id)) ||
        a.full_name.localeCompare(b.full_name, "ar"),
    );
  }, [dir, q, committee, value, filter]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
          <input
            className="p-input ps-10"
            placeholder="ابحث بالاسم أو الرقم"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[{ id: "", name: "الكل" }, ...(dir?.committees ?? [])].map((c) => (
          <button
            key={c.id || "all"}
            type="button"
            onClick={() => setCommittee(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
              committee === c.id
                ? "border-transparent bg-[var(--p-soft)] text-[var(--p-bg)]"
                : "border-[var(--p-line-strong)] text-[var(--p-soft)] hover:text-[var(--p-text)]",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
      <ul
        className={cn(
          "space-y-1 overflow-y-auto rounded-2xl border border-[var(--p-line)] p-1.5",
          height,
        )}
      >
        {pool.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-[var(--p-dim)]">ما فيه أحد</li>
        )}
        {pool.map((m) => {
          const on = value.includes(m.id);
          const lead = !!leads?.includes(m.id);
          return (
            <li key={m.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id]);
                  if (on && lead && onLeadsChange) onLeadsChange(leads!.filter((x) => x !== m.id));
                }}
                aria-pressed={on}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors",
                  on ? "bg-[rgb(198_164_92/0.1)]" : "hover:bg-[rgb(200_222_211/0.05)]",
                )}
              >
                <Avatar name={m.full_name} size={30} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{m.full_name}</b>
                  <span className="block truncate text-xs text-[var(--p-dim)]">
                    {dir?.committee(m.committee_id)?.name ?? "القيادة"} · {titleOf(m)}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border",
                    on
                      ? "border-transparent bg-[var(--p-gold)] text-[#1d1606]"
                      : "border-[var(--p-line-strong)]",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                </span>
              </button>
              {onLeadsChange && on && (
                <button
                  type="button"
                  onClick={() =>
                    onLeadsChange(
                      lead ? leads!.filter((x) => x !== m.id) : [...(leads ?? []), m.id],
                    )
                  }
                  aria-pressed={lead}
                  title={lead ? "قائد المشروع" : "اجعله قائد"}
                  aria-label={`${m.full_name}: ${lead ? "قائد المشروع" : "اجعله قائد"}`}
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl border transition-colors",
                    lead
                      ? "border-[var(--p-gold)] bg-[rgb(198_164_92/0.16)] text-[var(--p-gold-soft)]"
                      : "border-[var(--p-line)] text-[var(--p-dim)] hover:text-[var(--p-text)]",
                  )}
                >
                  <Crown className="size-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
