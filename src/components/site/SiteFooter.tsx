import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mail, AtSign } from "lucide-react";
import { contact, siteNav } from "@/data/site";
import ksuLockup from "@/assets/ksu-spp-lockup.png";
import { Wordmark } from "./Wordmark";
import { SocialLinks } from "./SocialIcons";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-deep text-ivory">
      <div
        className="pointer-events-none absolute -start-40 -top-40 h-96 w-96 rounded-full bg-emerald/60 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-12 pt-16 md:grid-cols-12">
        <div className="space-y-5 md:col-span-5">
          <Wordmark size="lg" affiliation={false} />
          <p className="max-w-sm text-sm leading-relaxed text-mint/75">
            مبادرة طلابية للتوعية المالية تحت برنامج الشراكة الطلابية بجامعة الملك سعود
          </p>
          <img
            src={ksuLockup}
            alt="جامعة الملك سعود — عمادة شؤون الطلاب — برنامج الشراكة الطلابية"
            className="h-16 w-auto opacity-90"
            width={242}
            height={145}
            loading="lazy"
          />
        </div>

        <nav aria-label="روابط الموقع" className="md:col-span-3">
          <p className="mb-4 font-display text-sm font-bold text-gold">روابط</p>
          <ul className="grid gap-2.5 text-sm text-ivory/75">
            {siteNav.map((n) => (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className="inline-block transition-all duration-300 hover:-translate-x-1 hover:text-mint"
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/portal"
                className="inline-block transition-all duration-300 hover:-translate-x-1 hover:text-mint"
              >
                بوابة الأعضاء
              </Link>
            </li>
          </ul>
        </nav>

        <div className="md:col-span-4">
          <p className="mb-4 font-display text-sm font-bold text-gold">تواصل معنا</p>
          <ul className="grid gap-3 text-sm text-ivory/80">
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 transition hover:text-mint"
              >
                <IconChip>
                  <Mail className="h-4 w-4" />
                </IconChip>
                <span dir="ltr">{contact.email}</span>
              </a>
            </li>
            <li>
              <a
                href="https://x.com/ETHMAR_SPP"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 transition hover:text-mint"
              >
                <IconChip>
                  <AtSign className="h-4 w-4" />
                </IconChip>
                <span dir="ltr">{contact.handle}</span>
              </a>
            </li>
          </ul>
          <SocialLinks className="mt-5" />
        </div>
      </div>
      <div className="relative border-t border-ivory/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-ivory/50 sm:flex-row">
          <span>© {new Date().getFullYear()} مبادرة إثمار — جامعة الملك سعود</span>
          <span>برنامج الشراكة الطلابية</span>
        </div>
      </div>
    </footer>
  );
}

function IconChip({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ivory/10 bg-ivory/5 text-mint">
      {children}
    </span>
  );
}
