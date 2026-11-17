import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUpLeft, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./Wordmark";
import { RegistrationDialog } from "./RegistrationDialog";
import { contact, siteNav } from "@/data/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [reg, setReg] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduce = useReducedMotion();
  const { pathname } = useLocation();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      // Hide while scrolling down past the hero, reveal on any upward scroll.
      setHidden(y > 480 && y > last + 4);
      if (y < last - 4 || y <= 480) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation, lock page scroll while it is open, close on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-deep/85 py-2.5 shadow-[0_10px_30px_-20px_rgba(0,0,0,.6)] backdrop-blur-xl"
          : "py-5",
        hidden && !open ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-mint focus:px-4 focus:py-2 focus:font-bold focus:text-deep"
      >
        تخطَّ إلى المحتوى
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5">
        <Link to="/" aria-label="إثمار — الرئيسية" className="shrink-0 rounded-lg">
          <Wordmark size={scrolled ? "sm" : "md"} />
        </Link>

        <nav
          aria-label="القائمة الرئيسية"
          className="hidden items-center rounded-full border border-ivory/10 bg-ivory/[0.04] p-1 lg:flex"
        >
          {siteNav.map((n) => {
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "text-deep" : "text-ivory/75 hover:text-ivory",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : "nav-pill"}
                    className="absolute inset-0 rounded-full bg-mint"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setReg(true)}
            className="rounded-full px-4 py-2 text-sm font-medium text-ivory/75 transition-colors hover:text-ivory"
          >
            التسجيل
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="hero" className="hidden h-10 px-5 sm:inline-flex">
            <Link to="/portal">
              بوابة الأعضاء <ArrowUpLeft />
            </Link>
          </Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ivory/15 text-ivory transition hover:bg-ivory/10 lg:hidden"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-3 overflow-hidden rounded-3xl border border-ivory/10 bg-deep/95 p-3 shadow-2xl backdrop-blur-xl lg:hidden"
          >
            <nav aria-label="القائمة الرئيسية (الجوال)" className="grid gap-1">
              {siteNav.map((n) => {
                const active = isActive(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-medium transition",
                      active ? "bg-ivory/10 text-ivory" : "text-ivory/80 hover:bg-ivory/5",
                    )}
                  >
                    {n.label}
                    {active && <span className="h-2 w-2 rounded-full bg-mint" />}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setReg(true);
                }}
                className="rounded-2xl px-4 py-3.5 text-start text-base font-medium text-ivory/80 hover:bg-ivory/5"
              >
                التسجيل
              </button>
              <Link
                to="/portal"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-mint px-4 py-3.5 font-bold text-deep"
              >
                بوابة الأعضاء <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </nav>
            <p className="mt-3 border-t border-ivory/10 px-4 pt-3 text-xs text-ivory/50">
              <span dir="ltr">{contact.handle}</span> · مبادرة طلابية في جامعة الملك سعود
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <RegistrationDialog open={reg} onOpenChange={setReg} />
    </header>
  );
}
