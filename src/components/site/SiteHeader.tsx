import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./Wordmark";
import { RegistrationDialog } from "./RegistrationDialog";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "الرئيسية" },
  { to: "/about", label: "من نحن" },
  { to: "/projects", label: "مشاريعنا" },
  { to: "/partners", label: "شركاء النجاح" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [reg, setReg] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20);
    f(); window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all", scrolled ? "bg-deep/85 py-3 backdrop-blur-xl" : "py-5")}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5">
        <Link to="/" aria-label="إثمار — الرئيسية"><Wordmark /></Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="rounded-full px-4 py-2 text-sm text-ivory/75 transition hover:text-ivory"
              activeProps={{ className: "bg-ivory/10 text-ivory" }}>{n.label}</Link>
          ))}
          <button onClick={() => setReg(true)} className="rounded-full px-4 py-2 text-sm text-ivory/75 transition hover:text-ivory">التسجيل</button>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="hero" className="hidden sm:inline-flex"><Link to="/portal">بوابة الأعضاء</Link></Button>
          <button className="rounded-full p-2 text-ivory lg:hidden" aria-label="القائمة" onClick={() => setOpen((o) => !o)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 rounded-2xl bg-deep/95 p-3 backdrop-blur-xl lg:hidden">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-ivory/85 hover:bg-ivory/10">{n.label}</Link>
            ))}
            <button onClick={() => { setOpen(false); setReg(true); }} className="block w-full rounded-xl px-4 py-3 text-start text-ivory/85 hover:bg-ivory/10">التسجيل</button>
            <Link to="/portal" onClick={() => setOpen(false)} className="mt-2 block rounded-xl bg-mint px-4 py-3 text-center font-bold text-deep">بوابة الأعضاء</Link>
          </motion.nav>
        )}
      </AnimatePresence>
      <RegistrationDialog open={reg} onOpenChange={setReg} />
    </header>
  );
}
