// Ethmar branded email (RTL, table layout, inline styles) — Gmail, iOS Mail, Outlook.
// Built from the site's own language: the green hero with the glowing emblem, the wave into ivory,
// eyebrows with a gold rule, number tiles («أرقام تحكي قصة إثمار»), numbered journey steps, the
// green membership card and the dark footer. No imports so it can be previewed outside Deno.

export const SITE = "https://ethmarspp.vercel.app";

const C = {
  night: "#031F19",
  forest: "#0A3A2A",
  emerald: "#0F5132",
  ivory: "#F6F5EF",
  mint: "#C8DED3",
  mintSoft: "#E4EEE8",
  gold: "#C6A45C",
  ink: "#0B2A22",
  text: "#3A4F47",
  muted: "#7F918A",
  line: "#E6E3D9",
};
const DISPLAY = "'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif";
const BODY = "'Tajawal','Cairo','Segoe UI',Tahoma,Arial,sans-serif";

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Arabic counting for hours: ساعة / ساعتين / ٣ ساعات / ١٢ ساعة. */
export function hoursAr(h: number): string {
  const n = Number(h);
  if (n === 1) return "ساعة وحدة";
  if (n === 2) return "ساعتين";
  const v = Number.isInteger(n) ? String(n) : String(n);
  return n >= 3 && n <= 10 && Number.isInteger(n) ? `${v} ساعات` : `${v} ساعة`;
}

// ------------------------------------------------------------------ building blocks

/** Green membership card (invite / reset). */
export function memberCard(o: {
  name: string;
  place: string;
  code?: string | null;
  email: string;
}) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;background:${C.forest};background-image:linear-gradient(135deg,${C.night} 0%,${C.forest} 100%);border-radius:22px">
<tr><td style="padding:22px 22px 20px" dir="rtl">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="text-align:right;vertical-align:top">
<div style="color:${C.mint};font-family:${BODY};font-size:12px;letter-spacing:.5px">عضوية بوابة إثمار</div>
<div style="color:${C.ivory};font-family:${DISPLAY};font-size:21px;font-weight:800;line-height:1.5;margin-top:6px">${esc(o.name)}</div>
${o.place ? `<div style="color:${C.mint};font-family:${BODY};font-size:14px;line-height:1.7">${esc(o.place)}</div>` : ""}
</td>
${o.code ? `<td style="text-align:left;vertical-align:top;width:90px"><span dir="ltr" style="display:inline-block;border:1px solid rgba(198,164,92,.55);color:${C.gold};font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;padding:5px 10px;border-radius:999px">${esc(o.code)}</span></td>` : ""}
</tr></table>
<div style="height:1px;background:rgba(200,222,211,.18);margin:16px 0 14px;line-height:1px;font-size:0">&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="text-align:right;color:${C.mint};font-family:${BODY};font-size:13px">بريد الدخول</td>
<td dir="ltr" style="text-align:left;color:${C.ivory};font-family:Arial,sans-serif;font-size:14px;font-weight:700">${esc(o.email)}</td>
</tr></table>
</td></tr></table>`;
}

/** Numbered journey (like the site's «رحلة من الاكتشاف إلى المتابعة»). */
export function steps(items: string[]) {
  const w = Math.floor(100 / items.length);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr>
${items
  .map(
    (t, i) => `<td width="${w}%" style="vertical-align:top;text-align:center;padding:0 4px">
<div style="width:34px;height:34px;line-height:34px;border-radius:50%;margin:0 auto 10px;${i === 0 ? `background:${C.forest};color:${C.ivory};` : `background:${C.mintSoft};color:${C.forest};`}font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-align:center">${i + 1}</div>
<div style="color:${C.ink};font-family:${BODY};font-size:13px;font-weight:700;line-height:1.6">${esc(t)}</div>
</td>`,
  )
  .join("")}
</tr></table>`;
}

/** Number tiles (like «أرقام تحكي قصة إثمار»). */
export function stats(items: { value: string; label: string; gold?: boolean }[]) {
  const w = Math.floor(100 / items.length);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;background:#FFFFFF;border:1px solid ${C.line};border-radius:20px;border-collapse:separate">
<tr>
${items
  .map(
    (
      s,
      i,
    ) => `<td width="${w}%" style="padding:18px 8px 16px;text-align:center;vertical-align:top;${i > 0 ? `border-right:1px solid ${C.line};` : ""}">
<div style="color:${s.gold ? C.gold : C.forest};font-family:${DISPLAY};font-size:28px;font-weight:800;line-height:1.2">${esc(s.value)}</div>
<div style="color:${C.muted};font-family:${BODY};font-size:13px;line-height:1.6;margin-top:4px">${esc(s.label)}</div>
</td>`,
  )
  .join("")}
</tr>
</table>`;
}

/** Small pills under the title (committee, team, who posted it…). */
export function chips(items: string[]) {
  return `<div style="margin:12px 0 0;line-height:2.4">${items
    .filter(Boolean)
    .map(
      (t) =>
        `<span style="display:inline-block;margin:0 0 0 6px;padding:3px 12px;border-radius:999px;background:${C.mintSoft};color:${C.forest};font-family:${BODY};font-size:13px;font-weight:700;line-height:1.9">${esc(t)}</span>`,
    )
    .join("")}</div>`;
}

/** Mint card with a heading (task details). */
export function noteCard(title: string, body: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 4px;background:${C.mintSoft};border-radius:20px">
<tr><td style="padding:18px 20px" dir="rtl">
<div style="color:${C.forest};font-family:${DISPLAY};font-size:14px;font-weight:800;margin-bottom:6px">${esc(title)}</div>
<div style="color:${C.text};font-family:${BODY};font-size:15px;line-height:1.9;white-space:pre-line">${esc(body)}</div>
</td></tr></table>`;
}

/** Noun after a number: «3 ساعات»، «11 ساعة». */
export const countWord = (n: number, plural: string, single: string) =>
  Number.isInteger(n) && n >= 2 && n <= 10 ? plural : single;

// ------------------------------------------------------------------ page

export type EmailCopy = {
  /** Line shown in the inbox list next to the subject. */
  preheader: string;
  /** Big title inside the green hero. */
  hero: string;
  heroSub?: string;
  /** Eyebrow above the heading (gold rule + label), e.g. «مرحبًا روز». */
  eyebrow: string;
  heading: string;
  intro: string;
  /** Ready-made HTML from the blocks above. */
  blocks?: string[];
  /** Plain-text version of the blocks (for clients that don't show HTML). */
  textDetails?: string[];
  button: string;
  url: string;
  note?: string;
};

export function layout(o: EmailCopy) {
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<title>${esc(o.preheader)}</title>
</head>
<body style="margin:0;padding:0;background:#ECEAE2;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECEAE2">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="max-width:600px;background:${C.ivory};border-radius:28px;overflow:hidden">

<tr><td align="center" style="background:${C.forest};background-image:linear-gradient(180deg,${C.night} 0%,${C.forest} 100%);padding:26px 24px 6px">
<span style="display:inline-block;padding:5px 14px;border:1px solid rgba(200,222,211,.28);border-radius:999px;color:${C.mint};font-family:${BODY};font-size:12px;line-height:1.8"><span style="color:${C.gold}">●</span>&nbsp; بوابة أعضاء إثمار · جامعة الملك سعود</span>
<img src="${SITE}/email/emblem.png" width="190" height="190" alt="إثمار" style="display:block;border:0;width:190px;height:190px;margin:14px auto 4px">
<div style="color:${C.ivory};font-family:${DISPLAY};font-size:28px;font-weight:800;line-height:1.5">${esc(o.hero)}</div>
${o.heroSub ? `<div style="color:${C.mint};font-family:${BODY};font-size:15px;line-height:1.8;margin-top:4px">${esc(o.heroSub)}</div>` : ""}
<div style="height:18px;line-height:18px;font-size:0">&nbsp;</div>
</td></tr>
<tr><td style="padding:0;line-height:0;font-size:0;background:${C.ivory}"><img src="${SITE}/email/wave.png" width="600" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>

<tr><td dir="rtl" style="padding:14px 30px 8px;text-align:right">
<div style="color:${C.emerald};font-family:${BODY};font-size:13px;font-weight:700"><span style="display:inline-block;width:26px;height:2px;background:${C.gold};vertical-align:middle;margin-left:8px"></span>${esc(o.eyebrow)}</div>
<h1 style="margin:8px 0 10px;color:${C.ink};font-family:${DISPLAY};font-size:25px;font-weight:800;line-height:1.55">${esc(o.heading)}</h1>
<p style="margin:0;color:${C.text};font-family:${BODY};font-size:16px;line-height:1.95">${esc(o.intro)}</p>
${(o.blocks ?? []).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 6px">
<tr><td align="center" style="background:${C.forest};border-radius:999px">
<a href="${esc(o.url)}" target="_blank" style="display:inline-block;padding:16px 38px;color:${C.ivory};font-family:${DISPLAY};font-size:16px;font-weight:800;text-decoration:none">${esc(o.button)}&nbsp;&nbsp;<span style="color:${C.gold}">↖</span></a>
</td></tr>
</table>
${o.note ? `<p style="margin:12px 0 0;color:${C.muted};font-family:${BODY};font-size:13px;line-height:1.8;text-align:center">${esc(o.note)}</p>` : ""}
<div style="height:26px;line-height:26px;font-size:0">&nbsp;</div>
</td></tr>

<tr><td style="background:${C.night};padding:26px 30px 24px" dir="rtl">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="text-align:right;vertical-align:middle"><img src="${SITE}/email/ethmar-logo-light.png" width="96" alt="إثمار" style="display:block;border:0;width:96px;height:auto"></td>
<td style="text-align:left;vertical-align:middle;color:${C.mint};font-family:Arial,sans-serif;font-size:12px;line-height:1.9" dir="ltr">ethmar.spp@gmail.com<br>@ETHMAR_SPP</td>
</tr></table>
<div style="color:${C.mint};opacity:.85;font-family:${BODY};font-size:12px;line-height:1.9;margin-top:14px">مبادرة طلابية للتوعية المالية تحت برنامج الشراكة الطلابية بجامعة الملك سعود. وصلك هذا الإيميل لأنك عضو في المبادرة</div>
</td></tr>
</table>
<div dir="rtl" style="max-width:600px;margin:14px auto 0;color:#97A29C;font-family:${BODY};font-size:12px;line-height:1.7;text-align:center">إذا الزر ما اشتغل، انسخ الرابط وافتحه:<br><a href="${esc(o.url)}" dir="ltr" style="color:#6F807A;word-break:break-all">${esc(o.url)}</a></div>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    o.hero,
    "",
    o.eyebrow,
    o.heading,
    "",
    o.intro,
    ...(o.textDetails?.length ? ["", ...o.textDetails] : []),
    "",
    `${o.button}: ${o.url}`,
    ...(o.note ? ["", o.note] : []),
    "",
    "مبادرة إثمار · جامعة الملك سعود",
  ].join("\n");
  return { html, text };
}
