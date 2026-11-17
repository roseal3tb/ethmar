import { cn } from "@/lib/utils";

// Temporary text wordmark until the official Ethmar logo file is provided.
export function Wordmark({ className, light = true }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span className={cn("font-display text-2xl font-black leading-none", light ? "text-ivory" : "text-primary")}>إثمار</span>
      <span className={cn("hidden border-s ps-3 text-[11px] leading-tight sm:block", light ? "border-ivory/25 text-mint/80" : "border-border text-muted-foreground")}>
        جامعة الملك سعود
        <br />
        برنامج الشراكة الطلابية
      </span>
    </span>
  );
}
