// Dropdown in the portal's own look (dark card, gold check, soft hover) instead of the OS menu.
import * as S from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export type PSelectOption = {
  value: string;
  label: string;
  /** Small text under the label (e.g. a count). */
  hint?: string | undefined;
  /** Options sharing a group are shown together under that heading. */
  group?: string | undefined;
};

export function PSelect({
  value,
  onChange,
  options,
  label,
  icon: Icon,
  size = "md",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: PSelectOption[];
  /** Accessible name (also shown as the menu's heading on small screens). */
  label: string;
  icon?: ComponentType<{ className?: string }> | undefined;
  size?: "sm" | "md";
  className?: string | undefined;
}) {
  const current = options.find((o) => o.value === value);
  const groups: { name: string | undefined; items: PSelectOption[] }[] = [];
  for (const o of options) {
    const last = groups[groups.length - 1];
    if (last && last.name === o.group) last.items.push(o);
    else groups.push({ name: o.group, items: [o] });
  }

  return (
    <S.Root value={value} onValueChange={onChange} dir="rtl">
      <S.Trigger
        aria-label={label}
        className={cn(
          "group inline-flex items-center gap-2 rounded-[14px] border border-[var(--p-line-strong)] bg-[rgb(200_222_211/0.04)] text-start text-[var(--p-text)] transition-colors",
          "hover:border-[rgb(200_222_211/0.32)] hover:bg-[rgb(200_222_211/0.07)]",
          "focus-visible:border-[var(--p-gold)] focus-visible:outline-none data-[state=open]:border-[var(--p-gold)] data-[state=open]:bg-[rgb(198_164_92/0.06)]",
          size === "sm" ? "h-10 px-3.5 text-sm" : "min-h-11 w-full px-4 text-[15px]",
          className,
        )}
      >
        {Icon && <Icon className="size-4 shrink-0 text-[var(--p-dim)]" />}
        <span className="min-w-0 flex-1 truncate font-bold">
          <S.Value>{current?.label}</S.Value>
        </span>
        <ChevronDown className="size-4 shrink-0 text-[var(--p-dim)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={8}
          align="start"
          className={cn(
            "portal-menu z-[80] max-h-[min(380px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[var(--p-line-strong)] bg-[#0a2e24]/95 p-1.5 text-[var(--p-text)] shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6),0_0_0_1px_rgb(198_164_92/0.06)] backdrop-blur-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1",
          )}
        >
          <S.Viewport className="max-h-[inherit] overflow-y-auto">
            {groups.map((g, gi) => (
              <S.Group key={gi}>
                {gi > 0 && <div className="mx-2 my-1.5 h-px bg-[var(--p-line)]" />}
                {g.name && (
                  <S.Label className="px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-[var(--p-dim)]">
                    {g.name}
                  </S.Label>
                )}
                {g.items.map((o) => (
                  <S.Item
                    key={o.value}
                    value={o.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center gap-3 rounded-xl py-2.5 ps-3 pe-9 text-sm outline-none transition-colors",
                      "text-[var(--p-soft)] data-[highlighted]:bg-[rgb(200_222_211/0.08)] data-[highlighted]:text-[var(--p-text)]",
                      "data-[state=checked]:bg-[rgb(198_164_92/0.1)] data-[state=checked]:font-bold data-[state=checked]:text-[var(--p-gold-soft)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <S.ItemText>{o.label}</S.ItemText>
                      {o.hint && (
                        <span className="block text-[11px] font-normal text-[var(--p-dim)]">
                          {o.hint}
                        </span>
                      )}
                    </span>
                    <S.ItemIndicator className="absolute end-3 grid size-5 place-items-center rounded-full bg-[var(--p-gold)] text-[#1d1606]">
                      <Check className="size-3" strokeWidth={3} />
                    </S.ItemIndicator>
                  </S.Item>
                ))}
              </S.Group>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
