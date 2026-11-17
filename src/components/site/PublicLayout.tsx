import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <section className="bg-hero grain relative overflow-hidden pb-20 pt-36 text-ivory">
      <div className="absolute -left-24 top-10 h-72 w-72 animate-drift rounded-full bg-mint/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5">
        <p className="mb-3 text-sm font-bold text-mint">{eyebrow}</p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">{title}</h1>
        {text && <p className="mt-5 max-w-2xl text-lg text-ivory/75">{text}</p>}
      </div>
    </section>
  );
}
