import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Copy,
  History,
  Loader2,
  Printer,
  Search,
  ShieldX,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import logoOnLight from "@/assets/ethmar-logo.png";
import ksuLockup from "@/assets/ksu-spp-lockup.png";
import { Wordmark } from "@/components/site/Wordmark";
import { api } from "@/lib/portal/api";
import type { CertificateCheck } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { EASE, fmt } from "./ui";

const LONG_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const cleanCode = (c: string) => c.replace(/[^0-9a-z]/gi, "").toUpperCase();

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal relative min-h-screen">
      <div aria-hidden="true" className="p-aurora pointer-events-none fixed inset-0 print:hidden" />
      <header className="relative mx-auto flex max-w-[1180px] items-center justify-between px-4 py-5 sm:px-6 print:hidden">
        <a href="/" aria-label="مبادرة إثمار">
          <Wordmark size="sm" affiliation={false} />
        </a>
        <span className="text-sm font-bold text-[var(--p-dim)]">التحقق من الشهادات</span>
      </header>
      <main className="relative mx-auto max-w-[1180px] px-4 pb-16 sm:px-6 print:p-0">
        {children}
      </main>
    </div>
  );
}

/** /verify — type a code. */
export function VerifyLookup() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  function go(e: FormEvent) {
    e.preventDefault();
    const c = cleanCode(code);
    if (c.length < 6) return;
    void navigate({ to: "/verify/$code", params: { code: c } });
  }
  return (
    <Shell>
      <motion.form
        onSubmit={go}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="p-card mx-auto mt-10 max-w-lg space-y-5 p-6 text-center sm:p-8"
      >
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[rgb(198_164_92/0.12)] text-[var(--p-gold-soft)]">
          <BadgeCheck className="size-8" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold">تحقق من شهادة إثمار</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--p-soft)]">
            اكتب رمز الشهادة المطبوع تحت رمز QR، أو امسح الرمز بكاميرا جوالك
          </p>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 start-4 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
          <input
            className="p-input ps-11 text-center font-mono text-lg tracking-[0.3em]"
            dir="ltr"
            placeholder="A1B2C3D4E5"
            value={code}
            maxLength={16}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label="رمز الشهادة"
            autoFocus
          />
        </label>
        <button type="submit" className="p-btn w-full" disabled={cleanCode(code).length < 6}>
          تحقق
        </button>
      </motion.form>
    </Shell>
  );
}

/** /verify/$code — the certificate itself (printable) with its verification status. */
export function VerifyCertificate({ code }: { code: string }) {
  const c = cleanCode(code);
  const q = useQuery({
    queryKey: ["verify", c],
    queryFn: () => api.verifyCertificate(c),
    retry: 1,
  });

  return (
    <Shell>
      {q.isLoading ? (
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="size-8 animate-spin text-[var(--p-gold-soft)]" />
        </div>
      ) : q.isError ? (
        <Missing code={c} error />
      ) : !q.data?.found ? (
        <Missing code={c} />
      ) : (
        <Found cert={q.data} code={c} />
      )}
    </Shell>
  );
}

function Missing({ code, error }: { code: string; error?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-card mx-auto mt-10 max-w-lg space-y-4 p-8 text-center"
    >
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[rgb(242_165_142/0.12)] text-[var(--p-bad)]">
        <ShieldX className="size-8" />
      </span>
      <h1 className="font-display text-2xl font-extrabold">
        {error ? "ما قدرنا نتحقق الحين" : "ما لقينا شهادة بهذا الرمز"}
      </h1>
      <p className="text-sm leading-7 text-[var(--p-soft)]">
        {error ? (
          "تأكد من اتصالك وجرب مرة ثانية"
        ) : (
          <>
            الرمز <b dir="ltr">{code}</b> مو مسجل عندنا. تأكد إنك كتبته صح
          </>
        )}
      </p>
      <Link to="/verify" className="p-btn-ghost mx-auto h-11 w-fit">
        <ArrowLeft className="size-4" /> جرّب رمز ثاني
      </Link>
    </motion.div>
  );
}

function Found({ cert, code }: { cert: CertificateCheck; code: string }) {
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/verify/${code}` : `/verify/${code}`;
  const status = cert.valid ? "valid" : cert.superseded ? "old" : "revoked";
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className={cn(
          "mx-auto flex max-w-[1000px] flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 print:hidden",
          status === "valid"
            ? "border-[rgb(143_217_179/0.35)] bg-[rgb(143_217_179/0.08)]"
            : "border-[rgb(240_182_122/0.35)] bg-[rgb(240_182_122/0.08)]",
        )}
      >
        <motion.span
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
        >
          {status === "valid" ? (
            <BadgeCheck className="size-6 text-[var(--p-ok)]" />
          ) : status === "old" ? (
            <History className="size-6 text-[#F0B67A]" />
          ) : (
            <CircleAlert className="size-6 text-[#F0B67A]" />
          )}
        </motion.span>
        <div className="min-w-[200px] flex-1">
          <b className="block">
            {status === "valid"
              ? "شهادة صحيحة وموثّقة من إثمار"
              : status === "old"
                ? "شهادة صحيحة لكنها نسخة قديمة"
                : "هذي الشهادة ملغاة"}
          </b>
          <span className="text-sm text-[var(--p-soft)]">
            {status === "valid"
              ? "البيانات تحت مطابقة لسجلات بوابة أعضاء إثمار"
              : status === "old"
                ? "أصدر صاحبها نسخة أحدث بعدد ساعات محدّث لنفس الفترة"
                : "ما تُعتمد هذي الشهادة"}
          </span>
        </div>
        <div className="flex w-full gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
          <button
            type="button"
            className="p-btn-ghost h-10"
            onClick={() =>
              navigator.clipboard
                .writeText(url)
                .then(() => toast.success("نسخت رابط التحقق"))
                .catch(() => toast.error("ما قدرت أنسخ"))
            }
          >
            <Copy className="size-4" /> الرابط
          </button>
          <button type="button" className="p-btn h-10" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة أو PDF
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        style={{ perspective: 1200 }}
        className="mx-auto max-w-[1000px]"
      >
        <Sheet cert={cert} url={url} code={code} stale={status !== "valid"} />
      </motion.div>
      <style>{PRINT_CSS}</style>
    </div>
  );
}

const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  .portal { background: #fff !important; min-height: 0 !important; }
  .cert-sheet { width: 297mm !important; height: 210mm !important; max-width: none !important;
    border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; aspect-ratio: auto !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  [data-sonner-toaster] { display: none !important; }
}`;

function Sheet({
  cert,
  url,
  code,
  stale,
}: {
  cert: CertificateCheck;
  url: string;
  code: string;
  stale: boolean;
}) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    void QRCode.toString(url, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#0A3A2A", light: "#0000" },
    }).then(setQr);
  }, [url]);
  const hours = cert.hours ?? 0;
  const issued = cert.issued_at ? LONG_DATE.format(new Date(cert.issued_at)) : "";

  return (
    <article
      dir="rtl"
      className="cert-sheet relative mx-auto aspect-[297/210] w-full overflow-hidden rounded-[18px] bg-[#F6F5EF] text-[#0B2A22] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.7)]"
      style={{ containerType: "inline-size" }}
      aria-label={`شهادة ${cert.name ?? ""}`}
    >
      {/* frame */}
      <div className="absolute inset-[2.2cqw] rounded-[1.2cqw] border-[0.25cqw] border-[#C6A45C]" />
      <div className="absolute inset-[2.9cqw] rounded-[0.8cqw] border border-[#C6A45C]/50" />
      {/* corner leaves */}
      {(
        [
          "top-[1.2cqw] start-[1.2cqw]",
          "top-[1.2cqw] end-[1.2cqw] -scale-x-100",
          "bottom-[1.2cqw] start-[1.2cqw] -scale-y-100",
          "bottom-[1.2cqw] end-[1.2cqw] scale-[-1]",
        ] as const
      ).map((pos) => (
        <svg
          key={pos}
          viewBox="0 0 60 60"
          className={cn("absolute size-[7cqw] text-[#0F5132]", pos)}
          aria-hidden="true"
        >
          <path
            d="M6 54C6 28 20 8 54 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity=".55"
          />
          <path d="M18 30c-6-8-4-16 4-20 4 9 2 15-4 20Z" fill="currentColor" opacity=".35" />
          <path d="M30 17c-2-9 3-14 11-14 0 9-4 13-11 14Z" fill="currentColor" opacity=".28" />
          <path d="M11 44c-8-4-9-12-4-18 6 6 7 12 4 18Z" fill="currentColor" opacity=".3" />
        </svg>
      ))}
      {/* watermark emblem */}
      <img
        src={logoOnLight}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 w-[46cqw] -translate-x-1/2 -translate-y-1/2 opacity-[0.045]"
      />

      <div className="relative flex h-full flex-col px-[8cqw] pt-[5.5cqw] pb-[5cqw]">
        <div className="flex items-center justify-between">
          <img src={logoOnLight} alt="إثمار" className="h-[5.2cqw] w-auto" />
          <img
            src={ksuLockup}
            alt="جامعة الملك سعود · برنامج الشراكة الطلابية"
            className="h-[4.4cqw] w-auto"
          />
        </div>

        <div className="my-auto text-center">
          <div className="text-[1.35cqw] font-bold tracking-[0.3em] text-[#C6A45C]">
            CERTIFICATE OF VOLUNTEERING
          </div>
          <h2 className="mt-[0.6cqw] font-display text-[4.1cqw] leading-tight font-extrabold text-[#0A3A2A]">
            شهادة ساعات تطوعية
          </h2>
          <div className="mx-auto mt-[0.8cqw] flex w-[22cqw] items-center gap-[0.8cqw]">
            <span className="h-px flex-1 bg-[#C6A45C]/60" />
            <span className="size-[0.7cqw] rotate-45 bg-[#C6A45C]" />
            <span className="h-px flex-1 bg-[#C6A45C]/60" />
          </div>
          <p className="mt-[1.6cqw] text-[1.6cqw] text-[#3A4F47]">
            تشهد مبادرة إثمار للتوعية المالية بمشاركة
          </p>
          <p className="mt-[0.8cqw] font-display text-[5cqw] leading-tight font-extrabold text-[#0B2A22]">
            {cert.name}
          </p>
          <p className="mt-[0.8cqw] text-[1.6cqw] leading-relaxed text-[#3A4F47]">
            في أعمالها التطوعية{cert.committee ? ` ضمن ${cert.committee}` : ""}
            {cert.title ? ` بصفة ${cert.title}` : ""}
          </p>
          <p className="mt-[0.4cqw] text-[1.6cqw] leading-relaxed text-[#3A4F47]">
            بإجمالي <b className="text-[#0A3A2A]">{fmt(hours)}</b> ساعة تطوعية معتمدة ·{" "}
            {cert.period}
          </p>
        </div>

        <div className="flex items-end justify-between gap-[3cqw]">
          <div className="flex gap-[1.4cqw]">
            {[
              { v: fmt(hours), k: "ساعة تطوعية معتمدة" },
              { v: fmt(cert.tasks ?? 0), k: "مهمة منجزة" },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-[1.2cqw] border border-[#E6E3D9] bg-white/70 px-[2cqw] py-[1.1cqw] text-center"
              >
                <div className="font-display text-[3.2cqw] leading-none font-extrabold text-[#C6A45C]">
                  {x.v}
                </div>
                <div className="mt-[0.5cqw] text-[1.1cqw] text-[#7F918A]">{x.k}</div>
              </div>
            ))}
          </div>
          <div className="pb-[0.4cqw] text-center">
            <div className="mx-auto mb-[0.6cqw] h-px w-[18cqw] bg-[#0B2A22]/30" />
            <div className="text-[1.3cqw] font-bold text-[#0A3A2A]">مبادرة إثمار</div>
            <div className="text-[1.05cqw] text-[#7F918A]">صدرت {issued}</div>
          </div>
          <div className="flex items-end gap-[1cqw]">
            <div className="text-start text-[1cqw] leading-snug text-[#7F918A]">
              امسح للتحقق
              <div
                className="mt-[0.3cqw] font-mono text-[1.2cqw] font-bold tracking-[0.15em] text-[#0A3A2A]"
                dir="ltr"
              >
                {code}
              </div>
            </div>
            <div
              className="size-[9cqw] rounded-[0.8cqw] bg-white p-[0.7cqw] [&>svg]:size-full"
              // QR is generated locally from our own URL.
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {stale && (
          <motion.div
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[1cqw] border-[0.35cqw] border-[#B4532F]/70 px-[3cqw] py-[1cqw] font-display text-[4cqw] font-extrabold text-[#B4532F]/70"
          >
            غير سارية
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
