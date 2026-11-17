import { BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { contact, socials } from "@/data/site";
import { SocialIcon } from "./SocialIcons";

export function RegistrationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-sm overflow-hidden rounded-[1.75rem] border-0 bg-card p-0 text-center"
      >
        <div className="bg-hero grain relative px-8 pb-12 pt-10">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ivory/20 bg-ivory/10 text-mint">
            <BellRing className="h-8 w-8" />
          </div>
        </div>
        <div className="-mt-6 rounded-t-[1.75rem] bg-card px-7 pb-7 pt-7">
          <DialogTitle className="text-center font-display text-2xl font-extrabold text-primary">
            التسجيل مغلق حاليًا
          </DialogTitle>
          <DialogDescription className="mt-2 text-center text-base leading-relaxed text-muted-foreground">
            تابع حساباتنا عشان يوصلك الخبر أول ما يفتح التسجيل
          </DialogDescription>

          <ul className="mt-6 grid gap-2">
            {socials.map((s) => (
              <li key={s.id}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm font-bold text-foreground transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-ivory/15 group-hover:text-mint">
                      <SocialIcon id={s.id} />
                    </span>
                    {s.label}
                  </span>
                  <span
                    dir="ltr"
                    className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-mint"
                  >
                    {contact.handle}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <Button
            variant="ghost"
            className="mt-4 w-full rounded-full"
            onClick={() => onOpenChange(false)}
          >
            تمام
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
