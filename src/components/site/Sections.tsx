import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowUpLeft, Award, Eye, Target, Compass, Megaphone, Rocket, LineChart } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Counter, Reveal } from "./Reveal";
import { awards, mission, objectives, partners, projects, stats, vision, type Project } from "@/data/site";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="bg-hero grain relative flex min-h-[92vh] items-center overflow-hidden pt-28 text-ivory">
      <div className="absolute -right-32 top-24 h-[28rem] w-[28rem] animate-drift rounded-full bg-mint/10 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-80 w-80 animate-drift rounded-[40%] bg-emerald blur-2xl [animation-delay:-6s]" />
      <svg className="absolute bottom-0 left-0 w-full text-background" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0,80 C360,140 720,10 1080,60 C1260,85 1380,70 1440,60 L1440,120 L0,120 Z" />
      </svg>
      <div className="relative mx-auto w-full max-w-7xl px-5 pb-32">
        <Reveal>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm text-mint">
            <span className="h-2 w-2 rounded-full bg-mint" /> مبادرة طلابية · جامعة الملك سعود
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.15] md:text-7xl">
            صناعة جيل <span className="text-mint">واعٍ</span> ومتمكن ماليًا
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ivory/75 md:text-xl">
            مبادرة إثمار، المبادرة الطلابية الأولى في جامعة الملك سعود الهادفة إلى تعزيز الوعي المالي، وتمكين الجيل الصاعد من اكتساب المعرفة والمهارات اللازمة لصناعة قرارات مالية واعية.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="xl"><Link to="/about">اكتشف إثمار</Link></Button>
            <Button asChild variant="heroGhost" size="xl"><Link to="/portal">بوابة الأعضاء</Link></Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Impact() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24">
      <Reveal><SectionHead eyebrow="أثرنا" title="أرقام تحكي قصة إثمار" /></Reveal>
      <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-border lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="bg-card p-8">
            <div className="font-display text-4xl font-black text-primary md:text-5xl"><Counter to={s.value} suffix={s.suffix} /></div>
            <div className="mt-2 text-muted-foreground">{s.label}</div>
          </Reveal>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {awards.map((a, i) => (
          <Reveal key={a} delay={0.1 + i * 0.08}>
            <div className="bg-deep-gradient flex h-full items-center gap-4 rounded-3xl p-6 text-ivory">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/40 text-gold"><Award /></span>
              <p className="font-display text-lg font-bold">{a}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function About() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <div className="grid gap-6 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <div className="bg-hero grain relative h-full overflow-hidden rounded-[2rem] p-10 text-ivory md:p-14">
            <Eye className="mb-6 h-10 w-10 text-mint" />
            <p className="mb-3 text-sm font-bold text-mint">الرؤية</p>
            <p className="font-display text-2xl font-bold leading-relaxed md:text-3xl">{vision}</p>
          </div>
        </Reveal>
        <Reveal delay={0.12} className="lg:col-span-2">
          <div className="relative h-full rounded-[2rem] border-2 border-primary/15 bg-secondary/50 p-10 md:p-12">
            <Target className="mb-6 h-10 w-10 text-primary" />
            <p className="mb-3 text-sm font-bold text-primary/70">الرسالة</p>
            <p className="text-xl font-medium leading-relaxed text-foreground">{mission}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const objIcons = [Compass, Megaphone, Rocket, LineChart];

export function Objectives() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [active, setActive] = useState(0);
  return (
    <section className="mx-auto max-w-7xl px-5 py-24">
      <Reveal><SectionHead eyebrow="أهدافنا" title="رحلة من الاكتشاف إلى المتابعة" /></Reveal>
      <div ref={ref} className="relative mt-14">
        <div className="absolute inset-x-8 top-8 hidden h-0.5 bg-border md:block" />
        <motion.div style={{ scaleX: reduce ? 1 : scale }} className="absolute inset-x-8 top-8 hidden h-0.5 origin-right bg-primary md:block" />
        <div className="grid gap-6 md:grid-cols-4">
          {objectives.map((o, i) => {
            const Icon = objIcons[i];
            return (
              <button key={o.title} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)}
                className="group relative text-start">
                <span className={cn("relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 transition-all",
                  active === i ? "border-primary bg-primary text-primary-foreground shadow-lift" : "border-border bg-card text-primary")}>
                  <Icon className="h-7 w-7" />
                </span>
                <p className="mt-5 text-xs font-bold text-muted-foreground">0{i + 1}</p>
                <h3 className="mt-1 text-2xl font-extrabold text-primary">{o.title}</h3>
                <p className={cn("mt-2 text-muted-foreground transition-opacity", active === i ? "opacity-100" : "opacity-70")}>{o.text}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Projects({ withHead = true }: { withHead?: boolean }) {
  const [sel, setSel] = useState<Project | null>(null);
  return (
    <section className="mx-auto max-w-7xl px-5 py-24">
      {withHead && <Reveal><SectionHead eyebrow="مشاريع إثمار" title="خمسة مشاريع، أثر واحد" /></Reveal>}
      <div className="mt-12 grid gap-5 md:grid-cols-6">
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.06} className={i < 2 ? "md:col-span-3" : "md:col-span-2"}>
            <button onClick={() => setSel(p)} className="group relative block h-80 w-full overflow-hidden rounded-[1.75rem] text-start shadow-soft">
              <img src={p.image} alt={p.title} loading="lazy" width={1024} height={768}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-ivory">
                <span className="font-display text-sm font-bold text-mint">{p.num}</span>
                <h3 className="mt-1 text-2xl font-extrabold">{p.title}</h3>
                <p className="mt-1 text-sm text-ivory/75">{p.short}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-mint opacity-80 transition group-hover:gap-2 group-hover:opacity-100">
                  اكتشف المشروع <ArrowUpLeft className="h-4 w-4" />
                </span>
              </div>
            </button>
          </Reveal>
        ))}
      </div>
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent dir="rtl" className="max-w-lg overflow-hidden rounded-3xl border-0 p-0">
          {sel && (
            <>
              <img src={sel.image} alt={sel.title} className="h-56 w-full object-cover" />
              <div className="p-7">
                <span className="font-display text-sm font-bold text-primary/60">{sel.num}</span>
                <DialogTitle className="font-display text-2xl font-extrabold text-primary">{sel.title}</DialogTitle>
                <DialogDescription className="mt-3 text-base leading-relaxed text-foreground/80">{sel.long}</DialogDescription>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function Partners({ withHead = true }: { withHead?: boolean }) {
  const row = [...partners, ...partners, ...partners, ...partners];
  return (
    <section className="bg-deep-gradient overflow-hidden py-24 text-ivory">
      {withHead && (
        <div className="mx-auto max-w-7xl px-5">
          <Reveal><SectionHead eyebrow="شركاء النجاح" title="شركاء صنعوا الأثر معنا" light /></Reveal>
        </div>
      )}
      <div className="relative mt-12 [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
        <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {row.map((p, i) => (
            <div key={i} className="glass flex h-28 w-64 shrink-0 flex-col items-center justify-center rounded-2xl px-6 text-center">
              {p.logo ? <img src={p.logo} alt={p.name} className="max-h-14" /> : (
                <>
                  <span className="font-display text-lg font-bold">{p.nameAr}</span>
                  <span className="text-xs text-mint/70" dir="ltr">{p.name}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, light }: { eyebrow: string; title: string; light?: boolean }) {
  return (
    <div>
      <p className={cn("mb-2 text-sm font-bold", light ? "text-mint" : "text-primary/60")}>{eyebrow}</p>
      <h2 className={cn("text-3xl font-black md:text-5xl", light ? "text-ivory" : "text-primary")}>{title}</h2>
    </div>
  );
}
