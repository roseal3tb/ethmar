import { useState } from "react";
import logoOnLight from "@/assets/ethmar-logo.png";
import logoOnDark from "@/assets/ethmar-logo-light.png";
import { cn } from "@/lib/utils";

// Official Ethmar logo. `ethmar-logo.png` is the approved colour logo (for light surfaces);
// `ethmar-logo-light.png` is the ivory version used in Ethmar's official profile (for dark surfaces).
// If an image fails to load, the original text wordmark is shown as a fallback.
export function Wordmark({
  className,
  light = true,
  affiliation = true,
  size = "md",
}: {
  className?: string;
  /** true = placed on a dark/green surface */
  light?: boolean;
  /** show the KSU / Student Partnership Program line next to the logo */
  affiliation?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const h = size === "sm" ? "h-7" : size === "lg" ? "h-14" : "h-9";

  return (
    <span className={cn("flex items-center gap-3", className)}>
      {failed ? (
        <span
          className={cn(
            "font-display font-black leading-none",
            size === "lg" ? "text-4xl" : "text-2xl",
            light ? "text-ivory" : "text-primary",
          )}
        >
          إثمار
        </span>
      ) : (
        <img
          src={light ? logoOnDark : logoOnLight}
          alt="إثمار"
          className={cn(h, "w-auto select-none")}
          width={720}
          height={267}
          onError={() => setFailed(true)}
        />
      )}
      {affiliation && (
        <span
          className={cn(
            "hidden border-s ps-3 text-[11px] leading-tight sm:block",
            light ? "border-ivory/25 text-mint/80" : "border-border text-muted-foreground",
          )}
        >
          جامعة الملك سعود
          <br />
          برنامج الشراكة الطلابية
        </span>
      )}
    </span>
  );
}
