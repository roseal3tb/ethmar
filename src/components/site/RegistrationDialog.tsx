import { CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
        className="max-w-sm overflow-hidden rounded-3xl border-0 bg-card p-0 text-center"
      >
        <div className="bg-hero grain relative px-8 pb-10 pt-10">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-ivory/20 bg-ivory/10 text-mint">
            <CalendarClock className="h-8 w-8" />
          </div>
        </div>
        <div className="-mt-5 rounded-t-3xl bg-card px-8 pb-8 pt-7">
          <DialogTitle className="text-center font-display text-2xl font-extrabold text-primary">
            التسجيل مغلق حاليًا
          </DialogTitle>
          <DialogDescription className="mt-2 text-center text-base text-muted-foreground">
            التسجيل مغلق حاليًا، شيك على السمستر الجاي!
          </DialogDescription>
          <Button
            variant="brand"
            size="lg"
            className="mt-6 w-full"
            onClick={() => onOpenChange(false)}
          >
            تمام، أنتظركم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
