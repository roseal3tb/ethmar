// Sends Ethmar emails over SMTP (e.g. the initiative's Gmail with an app password).
// Configure with edge-function secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
// When they are missing, `mailConfigured()` is false and callers fall back (e.g. return the link).
import nodemailer from "npm:nodemailer@6.9.16";

export function mailConfigured(): boolean {
  return !!(Deno.env.get("SMTP_USER") && Deno.env.get("SMTP_PASS"));
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
function smtp() {
  if (!transport) {
    const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
    transport = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: Deno.env.get("SMTP_USER")!, pass: Deno.env.get("SMTP_PASS")! },
    });
  }
  return transport;
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  const from = Deno.env.get("MAIL_FROM") ?? `مبادرة إثمار <${Deno.env.get("SMTP_USER")}>`;
  await smtp().sendMail({ from, to, subject, html, text });
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, RTL, table-based layout that renders in Gmail / Outlook / iOS Mail. */
export function layout(opts: { title: string; intro: string; lines?: string[]; button: string; url: string; note?: string }) {
  const lines = (opts.lines ?? [])
    .map((l) => `<p style="margin:0 0 8px;color:#C8DED3;font-size:15px;line-height:1.8">${esc(l)}</p>`)
    .join("");
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#031F19;font-family:Tahoma,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#031F19;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#08291F;border:1px solid #1d4337;border-radius:20px;padding:32px" dir="rtl">
<tr><td style="text-align:right">
<p style="margin:0 0 24px;color:#C6A45C;font-size:20px;font-weight:bold">إثمار</p>
<h1 style="margin:0 0 12px;color:#F6F5EF;font-size:22px">${esc(opts.title)}</h1>
<p style="margin:0 0 16px;color:#F6F5EF;font-size:15px;line-height:1.8">${esc(opts.intro)}</p>
${lines}
<p style="margin:24px 0"><a href="${esc(opts.url)}" style="display:inline-block;background:#C8DED3;color:#031F19;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:12px">${esc(opts.button)}</a></p>
${opts.note ? `<p style="margin:0;color:#9DB8AB;font-size:12px;line-height:1.7">${esc(opts.note)}</p>` : ""}
</td></tr></table>
<p style="margin:16px 0 0;color:#5f7d70;font-size:11px">مبادرة إثمار · جامعة الملك سعود</p>
</td></tr></table></body></html>`;
  const text = [opts.title, "", opts.intro, ...(opts.lines ?? []), "", `${opts.button}: ${opts.url}`, opts.note ?? ""].join("\n");
  return { html, text };
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/** The portal's address, taken from the browser that called us (works for preview and production domains). */
export function portalOrigin(req: Request): string {
  const o = req.headers.get("origin") ?? "";
  return /^https?:\/\/[^/]+$/.test(o) ? o : (Deno.env.get("PORTAL_URL") ?? "https://ethmarspp.vercel.app");
}
