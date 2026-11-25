// Dates are handled as local YYYY-MM-DD strings (Riyadh time for every member).
const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(y!, m! - 1, d! + days));
}
export function daysBetween(fromISO: string, toISO_: string): number {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO_ + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
export const monthStart = (iso: string) => iso.slice(0, 8) + "01";

const DAY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "long" });
const SHORT = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  day: "numeric",
  month: "long",
});
const parse = (iso: string) => new Date(iso + "T00:00:00");
export const weekday = (iso: string) => DAY.format(parse(iso));
export const shortDate = (iso: string) => SHORT.format(parse(iso));

/** «اليوم», «بكرة», «بعد ٣ أيام», «متأخرة يومين» … */
export function dueLabel(iso: string, today = todayISO()): string {
  const d = daysBetween(today, iso);
  if (d === 0) return "اليوم";
  if (d === 1) return "بكرة";
  if (d === -1) return "أمس";
  if (d > 1) return d <= 10 ? `بعد ${d} أيام` : `بعد ${d} يومًا`;
  return `قبل ${-d} ${-d <= 10 ? "أيام" : "يومًا"}`;
}

export function relativeTime(ts: string): string {
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "الحين";
  if (mins < 60) return `قبل ${mins} د`;
  const h = Math.round(mins / 60);
  if (h < 24) return `قبل ${h} س`;
  const d = Math.round(h / 24);
  return d === 1 ? "أمس" : `قبل ${d} أيام`;
}
