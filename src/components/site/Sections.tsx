import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowUpLeft,
  Award,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  LineChart,
  MapPin,
  Megaphone,
  Rocket,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Counter, Reveal } from "./Reveal";
import { Wave } from "./PublicLayout";
import logoOnDark from "@/assets/ethmar-logo-light.png";
import {
  aboutIntro,
  aboutIntroMore,
  audience,
  awards,
  contact,
  mission,
  objectives,
  partners,
  projects,
  stats,
  vision,
  type Project,
} from "@/data/site";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ Hero */

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-hero grain relative flex min-h-[100svh] items-center overflow-hidden pb-28 pt-32 text-ivory lg:pt-28">
      <div
        className="absolute -end-32 top-24 h-[30rem] w-[30rem] animate-drift rounded-full bg-mint/10 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -start-20 bottom-10 h-80 w-80 animate-drift rounded-[40%] bg-emerald blur-2xl [animation-delay:-6s]"
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <p className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-ivory/15 bg-ivory/5 px-4 py-1.5 text-sm text-mint backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint/60 motion-reduce:hidden" />
                <span className="relative h-2 w-2 rounded-full bg-mint" />
              </span>
              أول مبادرة طلابية للوعي المالي · جامعة الملك سعود
            </p>
          </Reveal>
          <h1 className="text-balance font-display text-[2.6rem] font-black leading-[1.18] sm:text-6xl lg:text-[4.6rem]">
            {["صناعة جيل", "واعٍ", "ومتمكن ماليًا"].map((w, i) => (
              <Fragment key={w}>
                <motion.span
                  className={cn("inline-block", i === 1 && "relative text-mint")}
                  initial={reduce ? false : { opacity: 0, y: 34, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.14, ease }}
                >
                  {w}
                  {i === 1 && (
                    <svg
                      className="absolute -bottom-2 start-0 h-3 w-full text-gold"
                      viewBox="0 0 100 12"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <motion.path
                        d="M2 9 C 30 2, 70 2, 98 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, delay: 0.8, ease }}
                      />
                    </svg>
                  )}
                </motion.span>
                {i < 2 && " "}
              </Fragment>
            ))}
          </h1>
          <Reveal delay={0.45}>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ivory/75 md:text-xl">
              مبادرة إثمار، المبادرة الطلابية الأولى في جامعة الملك سعود الهادفة إلى تعزيز الوعي
              المالي، وتمكين الجيل الصاعد من اكتساب المعرفة والمهارات اللازمة لصناعة قرارات مالية
              واعية
            </p>
          </Reveal>
          <Reveal delay={0.55}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild variant="hero" size="xl" className="h-14 px-8 text-base">
                <Link to="/about">
                  اكتشف إثمار <ArrowUpLeft />
                </Link>
              </Button>
              <Button asChild variant="heroGhost" size="xl" className="h-14 px-8 text-base">
                <Link to="/portal">بوابة الأعضاء</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.65}>
            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-ivory/10 pt-6 text-sm text-ivory/60">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rotate-45 bg-copper" aria-hidden />
                تحت مظلة برنامج الشراكة الطلابية
              </li>
              <li className="flex items-center gap-2">
                <Award className="h-4 w-4 text-gold" aria-hidden />
                {awards[0]}
              </li>
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-5">
          <HeroEmblem />
        </div>
      </div>
      <Wave />
    </section>
  );
}

const objIcons = [Compass, Megaphone, Rocket, LineChart];

/** Glowing emblem echoing Ethmar's profile: the logo at the centre, the four objectives orbiting it. */
function HeroEmblem() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.3, ease }}
      className="relative mx-auto aspect-square w-full max-w-[19rem] sm:max-w-sm lg:max-w-[28rem]"
      aria-hidden
    >
      <div className="absolute inset-[6%] animate-glow rounded-full bg-mint/20 blur-3xl" />
      <div className="absolute inset-[14%] rounded-full bg-deep shadow-[0_0_80px_10px_color-mix(in_oklab,var(--mint)_25%,transparent),inset_0_0_60px_color-mix(in_oklab,var(--mint)_12%,transparent)]" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        <circle
          cx="200"
          cy="200"
          r="190"
          fill="none"
          stroke="currentColor"
          className="text-ivory/10"
        />
        <circle
          cx="200"
          cy="200"
          r="160"
          fill="none"
          stroke="currentColor"
          strokeDasharray="2 8"
          className="text-mint/40"
        />
      </svg>
      <div className="absolute inset-0 animate-orbit">
        {objIcons.map((Icon, i) => {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 4;
          return (
            <span
              key={i}
              className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-ivory/15 bg-forest/90 text-mint shadow-lg backdrop-blur sm:h-12 sm:w-12"
              style={{ left: `${50 + 47.5 * Math.cos(a)}%`, top: `${50 + 47.5 * Math.sin(a)}%` }}
            >
              <Icon className="h-5 w-5" />
            </span>
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={logoOnDark} alt="" className="w-[46%] select-none" />
      </div>
      <span className="absolute end-[4%] top-[12%] h-2.5 w-2.5 rotate-45 bg-copper" />
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Impact */

export function Impact() {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-24 md:py-28">
      <div className="grid items-end gap-6 md:grid-cols-2">
        <Reveal>
          <SectionHead eyebrow="أثرنا" title="أرقام تحكي قصة إثمار" />
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground md:ms-auto">
            أثر يتجدد كل فصل دراسي، بجهود أعضاء وقادة يؤمنون بأن الوعي المالي يبدأ من الجامعة
          </p>
        </Reveal>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] border border-border bg-border shadow-card lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="group relative bg-card p-7 md:p-10">
            <div className="flex items-baseline gap-2 font-display font-black leading-none text-primary">
              <span className="text-[2.4rem] md:text-6xl" dir="ltr">
                <span className="text-gold">+</span>
                <Counter to={s.value} prefix="" />
              </span>
              {s.suffix.trim() && <span className="text-xl md:text-3xl">{s.suffix.trim()}</span>}
            </div>
            <div className="mt-3 text-base font-medium text-foreground/75 md:text-lg">
              {s.label}
            </div>
            <span className="absolute bottom-0 start-7 h-1 w-10 rounded-t-full bg-mint transition-all duration-500 group-hover:w-20 md:start-10" />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="bg-deep-gradient relative mt-6 overflow-hidden rounded-[2rem] p-7 text-ivory md:p-10">
          <div
            className="pointer-events-none absolute -end-20 -top-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="lg:w-56 lg:shrink-0">
              <p className="text-sm font-bold text-gold">جوائز وتكريمات</p>
              <p className="mt-1 font-display text-2xl font-extrabold">تميّز موثّق</p>
            </div>
            <ul className="grid flex-1 gap-4 md:grid-cols-3">
              {awards.map((a) => (
                <li
                  key={a}
                  className="group flex items-center gap-4 rounded-2xl border border-ivory/10 bg-ivory/[0.04] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-ivory/[0.08]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-gold transition-transform duration-500 group-hover:rotate-[12deg] group-hover:scale-110">
                    <Award className="h-6 w-6" />
                  </span>
                  <span className="font-display text-base font-bold leading-snug">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------------------------------------------- About */

export function AboutIntro() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-6 pt-20">
      <div className="grid gap-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <SectionHead eyebrow="من نحن" title="مبادرة طلابية تصنع وعيًا ماليًا" />
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <p className="font-display text-xl font-bold leading-loose text-primary md:text-2xl">
            {aboutIntro}
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{aboutIntroMore}</p>
        </Reveal>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {audience.map((a, i) => (
          <Reveal key={a.title} delay={i * 0.08}>
            <div className="group flex h-full items-start gap-5 rounded-3xl border border-border bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-soft">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-xl font-black text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-deep">
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-bold text-primary/60">فئتنا المستهدفة</p>
                <h3 className="mt-1 text-xl font-extrabold text-primary">{a.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{a.text}</p>
              </div>
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
          <div className="bg-hero grain group relative h-full overflow-hidden rounded-[2rem] p-10 text-ivory transition-shadow duration-500 hover:shadow-lift md:p-14">
            <img
              src={logoOnDark}
              alt=""
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -end-10 w-72 opacity-[0.07]"
            />
            <span className="relative mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-ivory/15 bg-ivory/10 text-mint">
              <Eye className="h-7 w-7" />
            </span>
            <p className="relative mb-3 text-sm font-bold text-gold">رؤيتنا</p>
            <p className="relative font-display text-2xl font-bold leading-relaxed md:text-[1.9rem] md:leading-relaxed">
              {vision}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.12} className="lg:col-span-2">
          <div className="bg-sage-wash group relative h-full overflow-hidden rounded-[2rem] border border-primary/10 p-10 transition-all duration-500 hover:border-primary/25 hover:shadow-soft md:p-12">
            <span className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-deep">
              <Target className="h-7 w-7" />
            </span>
            <p className="mb-3 text-sm font-bold text-primary/70">رسالتنا</p>
            <p className="text-xl font-medium leading-relaxed text-foreground">{mission}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Objectives */

// Station positions on the wavy path (viewBox 1000×160). RTL: the journey starts on the right.
const stations = [
  { x: 875, y: 35 },
  { x: 625, y: 125 },
  { x: 375, y: 35 },
  { x: 125, y: 125 },
];

export function Objectives() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [active, setActive] = useState(0);

  return (
    <section className="bg-deep-gradient grain relative overflow-hidden py-24 text-ivory md:py-28">
      <div
        className="pointer-events-none absolute -start-32 top-0 h-96 w-96 rounded-full bg-emerald blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid items-end gap-6 md:grid-cols-2">
          <Reveal>
            <SectionHead eyebrow="أهدافنا" title="رحلة من الاكتشاف إلى المتابعة" light />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-md text-lg text-ivory/65 md:ms-auto">
              أربع محطات مترابطة، تبني كل منها على ما قبلها
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="relative mt-16">
          {/* Desktop: connected wavy journey */}
          <div className="relative hidden aspect-[1000/160] md:block" aria-hidden>
            <svg viewBox="0 0 1000 160" className="absolute inset-0 h-full w-full">
              <path
                d="M1000,80 C937,20 812,20 750,80 S562,140 500,80 S312,20 250,80 S62,140 0,80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-ivory/10"
              />
              <motion.path
                d="M1000,80 C937,20 812,20 750,80 S562,140 500,80 S312,20 250,80 S62,140 0,80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-mint"
                style={{ pathLength: reduce ? 1 : draw }}
              />
            </svg>
            {stations.map((s, i) => (
              <span
                key={i}
                className={cn(
                  "absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-display text-xl font-black transition-all duration-300",
                  active === i
                    ? "scale-110 border-mint bg-mint text-deep shadow-[0_0_40px_color-mix(in_oklab,var(--mint)_50%,transparent)]"
                    : "border-ivory/25 bg-deep text-mint",
                )}
                style={{ left: `${s.x / 10}%`, top: `${(s.y / 160) * 100}%` }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          <ol className="relative grid gap-4 md:mt-10 md:grid-cols-4">
            {/* Mobile connector line */}
            <span
              className="absolute bottom-6 start-[1.6rem] top-6 w-px bg-ivory/15 md:hidden"
              aria-hidden
            />
            {objectives.map((o, i) => {
              const Icon = objIcons[i] ?? Compass;
              const on = active === i;
              return (
                <li key={o.title} className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-pressed={on}
                    className={cn(
                      "group flex h-full w-full items-start gap-4 rounded-3xl border p-5 text-start transition-all duration-300 md:flex-col md:p-6",
                      on
                        ? "border-mint/40 bg-ivory/[0.07]"
                        : "border-transparent hover:bg-ivory/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "relative z-10 flex h-[3.2rem] w-[3.2rem] shrink-0 items-center justify-center rounded-2xl border transition-colors",
                        on ? "border-mint bg-mint text-deep" : "border-ivory/20 bg-deep text-mint",
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="inline-flex items-center gap-2 rounded-lg border border-ivory/20 px-3 py-1 font-display text-lg font-extrabold">
                        <span className="text-mint">{i + 1}</span>
                        {o.title}
                      </span>
                      <span
                        className={cn(
                          "mt-3 block leading-relaxed transition-colors",
                          on ? "text-ivory/90" : "text-ivory/60",
                        )}
                      >
                        {o.text}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Projects */

export function Projects({ withHead = true }: { withHead?: boolean }) {
  const [selIdx, setSelIdx] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-5 py-24 md:py-28">
      {withHead && (
        <div className="grid items-end gap-6 md:grid-cols-2">
          <Reveal>
            <SectionHead eyebrow="مشاريع إثمار" title="خمسة مشاريع، أثر واحد" />
          </Reveal>
          <Reveal delay={0.1} className="md:justify-self-end">
            <Button
              asChild
              variant="outline"
              className="group rounded-full border-primary/20 px-5 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Link to="/projects">
                كل المشاريع
                <ArrowUpLeft className="transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Button>
          </Reveal>
        </div>
      )}
      <div className={cn("grid gap-5 md:grid-cols-6", withHead && "mt-12")}>
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.06} className={i < 2 ? "md:col-span-3" : "md:col-span-2"}>
            <ProjectCard project={p} large={i < 2} onOpen={() => setSelIdx(i)} />
          </Reveal>
        ))}
      </div>

      <Dialog open={selIdx !== null} onOpenChange={(o) => !o && setSelIdx(null)}>
        <DialogContent
          dir="rtl"
          className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto overflow-x-hidden rounded-[1.75rem] border-0 p-0"
        >
          {selIdx !== null && <ProjectViewer index={selIdx} onIndexChange={setSelIdx} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Project details with direction-aware slides, arrow keys and swipe. */
function ProjectViewer({
  index,
  onIndexChange,
}: {
  index: number;
  onIndexChange: (i: number) => void;
}) {
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(0);
  const sel = projects[index]!;
  const go = (d: number) => {
    setDir(d);
    onIndexChange((index + d + projects.length) % projects.length);
  };
  const jump = (i: number) => {
    if (i === index) return;
    setDir(i > index ? 1 : -1);
    onIndexChange(i);
  };

  // RTL: the "next" project sits to the left, so ArrowLeft moves forward
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const slide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d >= 0 ? -48 : 48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d >= 0 ? 48 : -48 }),
  };

  return (
    <>
      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={sel.id}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          drag={reduce ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x < -70) go(1);
            else if (info.offset.x > 70) go(-1);
          }}
          className="touch-pan-y"
        >
          <div className="relative h-60 overflow-hidden sm:h-72">
            <motion.img
              src={sel.image}
              alt={sel.title}
              draggable={false}
              className="h-full w-full select-none object-cover"
              initial={reduce ? false : { scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-ivory">
              <span className="font-display text-sm font-bold text-mint">مشروع {sel.num}</span>
              <DialogTitle className="mt-1 font-display text-3xl font-black">
                {sel.title}
              </DialogTitle>
            </div>
          </div>
          <div className="px-7 pt-7">
            <DialogDescription className="text-base leading-loose text-foreground/80">
              {sel.long}
            </DialogDescription>
            {(sel.outcomes || sel.location) && (
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                {sel.outcomes && (
                  <div className="rounded-2xl bg-sage p-4 transition-colors hover:bg-secondary/70">
                    <dt className="flex items-center gap-2 text-xs font-bold text-primary/70">
                      <Sparkles className="h-4 w-4" /> المخرجات
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                      {sel.outcomes}
                    </dd>
                  </div>
                )}
                {sel.location && (
                  <div className="rounded-2xl bg-sage p-4 transition-colors hover:bg-secondary/70">
                    <dt className="flex items-center gap-2 text-xs font-bold text-primary/70">
                      <MapPin className="h-4 w-4" /> الموقع
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                      {sel.location}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mx-7 mb-7 mt-7 flex items-center justify-between border-t border-border pt-5">
        <Button
          variant="ghost"
          className="group rounded-full hover:bg-secondary"
          onClick={() => go(-1)}
        >
          <ChevronRight className="transition-transform group-hover:translate-x-0.5" /> السابق
        </Button>
        <div className="flex items-center gap-1.5" role="group" aria-label="اختيار المشروع">
          {projects.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => jump(i)}
              aria-label={p.title}
              aria-current={i === index ? "true" : undefined}
              className="relative flex h-6 items-center justify-center px-0.5"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-primary/20 hover:bg-primary/50",
                )}
              />
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="group rounded-full hover:bg-secondary"
          onClick={() => go(1)}
        >
          التالي <ChevronLeft className="transition-transform group-hover:-translate-x-0.5" />
        </Button>
      </div>
    </>
  );
}

function ProjectCard({
  project: p,
  large,
  onOpen,
}: {
  project: Project;
  large: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${p.title} — عرض التفاصيل`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-[1.75rem] text-start shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-lift",
        large ? "h-[22rem] md:h-[26rem]" : "h-[22rem]",
      )}
    >
      <img
        src={p.image}
        alt=""
        loading="lazy"
        width={1024}
        height={768}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/55 to-deep/5" />
      <div className="absolute inset-0 bg-emerald/20 mix-blend-multiply" />
      <span
        className="absolute end-6 top-5 font-display text-6xl font-black text-transparent opacity-70 [-webkit-text-stroke:1.5px_color-mix(in_oklab,var(--ivory)_55%,transparent)]"
        aria-hidden
      >
        {p.num}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-7 text-ivory">
        <h3 className={cn("font-extrabold leading-tight", large ? "text-3xl" : "text-2xl")}>
          {p.title}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ivory/75">{p.short}</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-ivory/25 bg-ivory/10 px-4 py-2 text-sm font-bold text-ivory backdrop-blur transition-all group-hover:border-mint group-hover:bg-mint group-hover:text-deep">
          اكتشف المشروع{" "}
          <ArrowUpLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------- Partners */

function PartnerCard({
  name,
  nameAr,
  index,
}: {
  name: string;
  nameAr?: string | undefined;
  index?: number | undefined;
}) {
  return (
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25">
      {index !== undefined && (
        <span className="font-display text-xs font-bold text-muted-foreground" dir="ltr">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      <div className="mt-6">
        <p className="font-display text-xl font-extrabold text-primary">{nameAr ?? name}</p>
        <span className="mt-3 block h-px w-10 bg-gold transition-all duration-500 group-hover:w-20" />
        <p
          className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
          dir="ltr"
        >
          {name}
        </p>
      </div>
    </div>
  );
}

export function Partners({ withHead = true }: { withHead?: boolean }) {
  const reduce = useReducedMotion();

  // Full page: a calm, readable grid. Home page: a slow marquee strip.
  if (!withHead) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-20 md:py-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              {p.logo ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-border bg-card p-8 shadow-card">
                  <img src={p.logo} alt={p.nameAr ?? p.name} className="max-h-16" />
                </div>
              ) : (
                <PartnerCard name={p.name} nameAr={p.nameAr} index={i} />
              )}
            </Reveal>
          ))}
          <Reveal delay={partners.length * 0.06}>
            <div className="bg-hero grain relative flex h-full min-h-48 flex-col justify-between overflow-hidden rounded-3xl p-6 text-ivory">
              <Users className="relative h-7 w-7 text-mint" />
              <div className="relative">
                <p className="font-display text-4xl font-black" dir="ltr">
                  <span className="text-gold">+</span>50
                </p>
                <p className="mt-1 text-ivory/75">شريك نجاح سابق صنعوا الأثر مع إثمار</p>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-primary/10 bg-sage-wash p-8 md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-primary md:text-3xl">
                كن شريكًا في صناعة الأثر
              </h2>
              <p className="mt-2 text-muted-foreground">
                تواصل مع فريق الشراكات لاستكشاف فرص التعاون مع إثمار
              </p>
            </div>
            <Button asChild variant="brand" size="xl">
              <a href={`mailto:${contact.email}`}>
                تواصل معنا <ArrowUpLeft />
              </a>
            </Button>
          </div>
        </Reveal>
      </section>
    );
  }

  const row = reduce ? partners : [...partners, ...partners, ...partners, ...partners];
  return (
    <section className="bg-sage-wash overflow-hidden py-24 md:py-28">
      <div className="mx-auto grid max-w-7xl items-end gap-6 px-5 md:grid-cols-2">
        <Reveal>
          <SectionHead eyebrow="شركاء النجاح" title="شركاء صنعوا الأثر معنا" />
        </Reveal>
        <Reveal delay={0.1} className="md:justify-self-end">
          <Link
            to="/partners"
            className="inline-flex items-center gap-2 font-bold text-primary transition hover:gap-3"
          >
            أكثر من 50 شريك نجاح سابق <ArrowUpLeft className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
      <div className="relative mt-12 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <ul
          className={cn(
            "flex gap-4",
            reduce
              ? "flex-wrap justify-center px-5"
              : "w-max animate-marquee hover:[animation-play-state:paused]",
          )}
        >
          {row.map((p, i) => (
            <li key={i} className="w-60 shrink-0" aria-hidden={i >= partners.length || undefined}>
              {p.logo ? (
                <div className="flex h-36 items-center justify-center rounded-3xl border border-border bg-card p-6">
                  <img src={p.logo} alt={p.nameAr ?? p.name} className="max-h-14" />
                </div>
              ) : (
                <div className="h-36">
                  <PartnerCard name={p.name} nameAr={p.nameAr} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Shared */

export function SectionHead({
  eyebrow,
  title,
  light,
}: {
  eyebrow: string;
  title: string;
  light?: boolean;
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-3 flex items-center gap-2 text-sm font-bold",
          light ? "text-mint" : "text-primary/70",
        )}
      >
        <span className={cn("h-px w-8", light ? "bg-gold" : "bg-gold")} aria-hidden />
        {eyebrow}
      </p>
      <h2
        className={cn(
          "text-balance text-3xl font-black leading-tight md:text-5xl",
          light ? "text-ivory" : "text-primary",
        )}
      >
        {title}
      </h2>
    </div>
  );
}
