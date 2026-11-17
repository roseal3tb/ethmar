import {
  BookOpen,
  Cpu,
  FlaskConical,
  Hourglass,
  LineChart,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { labs } from "@/data/demo";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader } from "./shared";
import { Stagger, StaggerItem } from "./motion";

// Icon per lab, keyed by id with a generic fallback so new labs still render.
const labIcons: Record<string, LucideIcon> = {
  l1: LineChart,
  l2: PenLine,
  l3: Cpu,
  l4: BookOpen,
};

export function LabsPage() {
  const available = labs.filter((l) => l.status === "متاح").length;

  return (
    <div>
      <PageHeader title="اللابات" text="مساحات تعلّم وتجربة داخلية لأعضاء إثمار" />

      <div className="bg-emerald-soft grain relative mb-6 overflow-hidden rounded-[2rem] p-6 text-ivory md:p-8">
        <div
          className="pointer-events-none absolute -end-10 -top-16 h-56 w-56 rounded-full bg-mint/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ivory/15 bg-ivory/10 text-mint">
              <Hourglass className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-xl font-extrabold">اللابات قيد الإعداد</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-ivory/75">
                تُعلن الأنشطة الرسمية لكل لاب عند جاهزيتها، حاليًا{" "}
                {available === 0 ? "لا يوجد لاب متاح" : `${available} متاح`} من أصل {labs.length}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {labs.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="لا توجد لابات بعد"
          text="ستظهر هنا اللابات عند إضافتها"
        />
      ) : (
        <Stagger as="ul" className="grid gap-4 sm:grid-cols-2">
          {labs.map((l) => {
            const Icon = labIcons[l.id] ?? FlaskConical;
            const open = l.status === "متاح";
            return (
              <StaggerItem
                as="li"
                key={l.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-card p-6 shadow-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-soft",
                  open ? "border-primary/25" : "border-border/70 hover:border-primary/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110",
                      open ? "bg-primary text-mint" : "bg-secondary text-primary/70",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold",
                      open
                        ? "bg-primary text-primary-foreground"
                        : "border border-dashed border-gold/60 bg-gold/10 text-[oklch(0.45_0.08_75)]",
                    )}
                  >
                    {l.status}
                  </span>
                </div>
                <p className="mt-5 text-xs font-bold text-muted-foreground">{l.kind}</p>
                <h2 className="mt-1 font-display text-xl font-extrabold text-primary">{l.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {l.description}
                </p>
                <Button
                  variant={open ? "brand" : "outline"}
                  disabled={!open}
                  onClick={() =>
                    open &&
                    toast.info(l.title, {
                      description: "يُربط محتوى اللاب هنا عند نشر أنشطته الرسمية",
                    })
                  }
                  className="mt-5 self-start rounded-full"
                  aria-label={open ? `فتح ${l.title}` : `${l.title} — قريبًا`}
                >
                  {open ? "فتح اللاب" : "قريبًا"}
                </Button>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
