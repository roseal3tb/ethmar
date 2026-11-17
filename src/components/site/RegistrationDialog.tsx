import { CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function RegistrationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm rounded-3xl border-0 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary">
          <CalendarClock className="h-8 w-8" />
        </div>
        <DialogTitle className="text-center font-display text-2xl font-extrabold text-primary">التسجيل مغلق حاليًا</DialogTitle>
        <DialogDescription className="text-center text-base text-muted-foreground">
          التسجيل مغلق حاليًا، شيك على السمستر الجاي!
        </DialogDescription>
        <Button variant="brand" size="lg" className="mt-4 w-full" onClick={() => onOpenChange(false)}>تمام، أنتظركم</Button>
      </DialogContent>
    </Dialog>
  );
}
