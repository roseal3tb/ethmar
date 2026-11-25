// Ethmar branded email (RTL, table layout, inline styles) — renders in Gmail, iOS Mail and Outlook.
// No imports so it can be previewed outside Deno.

export const SITE = "https://ethmarspp.vercel.app";

const C = {
  page: "#F3F1EA",
  card: "#FFFFFF",
  band: "#062B22",
  gold: "#C6A45C",
  ivory: "#F6F5EF",
  ink: "#0B2A22",
  text: "#31463F",
  muted: "#8A9A93",
  line: "#ECE9E1",
  well: "#F7F6F1",
};
const FONT = "'Tajawal','Cairo','Segoe UI',Tahoma,Arial,sans-serif";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Arabic counting for hours: ساعة / ساعتين / ٣ ساعات / ١٢ ساعة. */
export function hoursAr(h: number): string {
  const n = Number(h);
  if (n === 1) return "ساعة وحدة";
  if (n === 2) return "ساعتين";
  const v = Number.isInteger(n) ? String(n) : String(n).replace(".", "٫");
  return n >= 3 && n <= 10 && Number.isInteger(n) ? `${v} ساعات` : `${v} ساعة`;
}

export type EmailCopy = {
  /** Short line shown in the inbox list next to the subject. */
  preheader: string;
  /** Full name of the recipient (for «مرحبًا …،»). */
  name: string;
  intro: string;
  rows?: [label: string, value: string][];
  /** Optional free text (e.g. task details) shown in a soft box under the table. */
  body?: string;
  button: string;
  url: string;
  note?: string;
};

export function layout(o: EmailCopy) {
  const rows = (o.rows ?? []).filter(([, v]) => v && v.trim());
  const table = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border-collapse:collapse">
${rows
  .map(
    ([label, value], i) => `<tr>
<td style="padding:16px 0;${i < rows.length - 1 ? `border-bottom:1px solid ${C.line};` : ""}width:30%;vertical-align:top;text-align:right;color:${C.muted};font-size:15px;font-family:${FONT}">${esc(label)}</td>
<td style="padding:16px 0;${i < rows.length - 1 ? `border-bottom:1px solid ${C.line};` : ""}vertical-align:top;text-align:right;color:${C.ink};font-size:16px;font-weight:700;line-height:1.6;font-family:${FONT}">${esc(value)}</td>
</tr>`,
  )
  .join("\n")}
</table>`
    : "";
  const body = o.body
    ? `<div style="margin:16px 0 4px;padding:16px 18px;background:${C.well};border-radius:14px;color:${C.text};font-size:15px;line-height:1.9;white-space:pre-line;font-family:${FONT}">${esc(o.body)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<title>${esc(o.preheader)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}">
<tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="max-width:560px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line}">
<tr><td align="center" style="background:${C.band};padding:36px 24px 30px">
<img src="${SITE}/email/ethmar-logo-light.png" width="180" height="66" alt="إثمار" style="display:block;border:0;width:180px;height:auto;margin:0 auto">
<div style="width:56px;height:2px;background:${C.gold};margin:24px auto 18px;line-height:2px;font-size:0">&nbsp;</div>
<div style="color:${C.ivory};font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:1px">بوابة أعضاء إثمار</div>
<div dir="ltr" style="color:${C.gold};font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:6px;margin-top:8px">ETHMAR PORTAL</div>
</td></tr>
<tr><td dir="rtl" style="padding:36px 32px 12px;text-align:right">
<h1 style="margin:0 0 14px;color:${C.ink};font-family:${FONT};font-size:24px;font-weight:800;line-height:1.5">مرحبًا ${esc(o.name)}،</h1>
<p style="margin:0 0 12px;color:${C.text};font-family:${FONT};font-size:16px;line-height:1.9">${esc(o.intro)}</p>
${table}
${body}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 8px">
<tr><td align="center" style="background:${C.band};border-radius:16px">
<a href="${esc(o.url)}" target="_blank" style="display:block;padding:18px 20px;color:${C.ivory};font-family:${FONT};font-size:17px;font-weight:800;text-decoration:none;text-align:center">${esc(o.button)}</a>
</td></tr>
</table>
${o.note ? `<p style="margin:14px 0 0;color:${C.muted};font-family:${FONT};font-size:14px;line-height:1.8;text-align:right">${esc(o.note)}</p>` : ""}
</td></tr>
<tr><td align="center" style="padding:22px 32px 30px">
<div style="width:44px;height:2px;background:${C.gold};margin:0 auto 16px;line-height:2px;font-size:0">&nbsp;</div>
<div style="color:${C.muted};font-family:${FONT};font-size:13px;line-height:1.8">مبادرة إثمار · جامعة الملك سعود</div>
<div style="color:#B3BDB8;font-family:${FONT};font-size:12px;line-height:1.8">وصلك هذا الإيميل لأنك عضو في مبادرة إثمار</div>
</td></tr>
</table>
<div dir="rtl" style="max-width:560px;margin:14px auto 0;color:#A2ABA6;font-family:${FONT};font-size:12px;line-height:1.7;text-align:center">إذا الزر ما اشتغل، انسخ الرابط هذا وافتحه:<br><a href="${esc(o.url)}" style="color:#7C8C85;word-break:break-all" dir="ltr">${esc(o.url)}</a></div>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `مرحبًا ${o.name}،`,
    "",
    o.intro,
    "",
    ...rows.map(([l, v]) => `${l}: ${v}`),
    ...(o.body ? ["", o.body] : []),
    "",
    `${o.button}: ${o.url}`,
    ...(o.note ? ["", o.note] : []),
    "",
    "مبادرة إثمار · جامعة الملك سعود",
  ].join("\n");
  return { html, text };
}
