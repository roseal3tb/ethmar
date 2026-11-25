import { socials } from "@/data/site";
import { cn } from "@/lib/utils";

type SocialId = (typeof socials)[number]["id"];

// Minimal brand glyphs (24×24, currentColor) for Ethmar's official accounts
const paths: Record<SocialId, string> = {
  x: "M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.57l11.1 14.45Z",
  instagram:
    "M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85C2.42 3.92 3.94 2.37 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2Zm0 4.86a4.94 4.94 0 1 0 0 9.88 4.94 4.94 0 0 0 0-9.88Zm0 8.15a3.21 3.21 0 1 1 0-6.42 3.21 3.21 0 0 1 0 6.42Zm5.14-9.5a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z",
  tiktok:
    "M16.6 2h-3.4v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6.05.9.14V9.2a6.3 6.3 0 1 0 5.4 6.2V8.6a8.1 8.1 0 0 0 4.7 1.5V6.7A4.7 4.7 0 0 1 16.6 2Z",
};

export function SocialIcon({ id, className }: { id: SocialId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn("h-4 w-4", className)}>
      <path d={paths[id]} />
    </svg>
  );
}

/** Row of round social buttons. `tone` adapts colours to light or dark surfaces */
export function SocialLinks({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {socials.map((s) => (
        <li key={s.id}>
          <a
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${s.label} — @ETHMAR_SPP`}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5",
              tone === "dark"
                ? "border-ivory/15 bg-ivory/5 text-ivory/80 hover:border-mint/60 hover:bg-mint hover:text-deep"
                : "border-border bg-card text-primary hover:border-primary hover:bg-primary hover:text-deep",
            )}
          >
            <SocialIcon id={s.id} />
          </a>
        </li>
      ))}
    </ul>
  );
}
