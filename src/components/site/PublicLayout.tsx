import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import logoOnDark from "@/assets/ethmar-logo-light.png";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { Reveal } from "./Reveal";
import { PageTransition } from "./PageTransition";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <section className="bg-hero grain relative overflow-hidden pb-28 pt-36 text-ivory md:pt-44">
      <div
        className="absolute -start-24 top-10 h-72 w-72 animate-drift rounded-full bg-mint/10 blur-3xl"
        aria-hidden
      />
      <img
        src={logoOnDark}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -end-16 bottom-10 hidden w-[34rem] select-none opacity-[0.06] md:block"
      />
      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal>
          <nav
            aria-label="مسار التصفح"
            className="mb-5 flex items-center gap-1.5 text-sm text-ivory/60"
          >
            <Link to="/" className="transition hover:text-mint">
              الرئيسية
            </Link>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="font-bold text-mint" aria-current="page">
              {eyebrow}
            </span>
          </nav>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-balance max-w-3xl text-4xl font-black leading-[1.2] md:text-6xl">
            {title}
          </h1>
        </Reveal>
        {text && (
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ivory/75">{text}</p>
          </Reveal>
        )}
      </div>
      <Wave />
    </section>
  );
}

export function Wave({ className = "text-background" }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-x-0 -bottom-px w-full ${className}`}
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0,60 C320,100 620,10 960,40 C1180,60 1340,70 1440,50 L1440,90 L0,90 Z"
      />
    </svg>
  );
}
