import { Mail, Phone, AtSign, User } from "lucide-react";
import { contact } from "@/data/site";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  return (
    <footer className="bg-deep text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-sm text-sm text-mint/70">مبادرة طلابية للتوعية المالية تحت برنامج الشراكة الطلابية بجامعة الملك سعود.</p>
        </div>
        <ul className="grid gap-3 text-sm text-ivory/80 sm:grid-cols-2">
          <li><a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-mint"><Mail className="h-4 w-4" />{contact.email}</a></li>
          <li><a href="https://x.com/ETHMAR_SPP" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-mint"><AtSign className="h-4 w-4" /><span dir="ltr">{contact.handle}</span></a></li>
          <li><a href={contact.phoneHref} className="flex items-center gap-2 hover:text-mint"><Phone className="h-4 w-4" /><span dir="ltr">{contact.phone}</span></a></li>
          <li className="flex items-center gap-2"><User className="h-4 w-4" />{contact.president}</li>
        </ul>
      </div>
      <div className="border-t border-ivory/10 py-5 text-center text-xs text-ivory/50">© {new Date().getFullYear()} مبادرة إثمار — جامعة الملك سعود</div>
    </footer>
  );
}
