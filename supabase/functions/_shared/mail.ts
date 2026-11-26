// Sends Ethmar emails over SMTP (e.g. the initiative's Gmail with an app password).
// Configure with edge-function secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
// When they are missing, `mailConfigured()` is false and callers fall back (e.g. return the link).
import nodemailer from "npm:nodemailer@6.9.16";
import { SITE } from "./template.ts";

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

export {
  chips,
  countWord,
  hoursAr,
  layout,
  memberCard,
  noteCard,
  SITE,
  stats,
  steps,
} from "./template.ts";
export type { EmailCopy } from "./template.ts";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/**
 * The portal's address for links in emails: the calling browser's origin when it is one of ours
 * (production, its Vercel previews, or a local dev server), otherwise the production site.
 * Never trust an arbitrary Origin header: a link with a sign-in token must not point elsewhere.
 */
export function portalOrigin(req: Request): string {
  const fallback = Deno.env.get("PORTAL_URL") ?? SITE;
  const o = req.headers.get("origin") ?? "";
  const ours =
    o === SITE ||
    o === fallback ||
    /^https:\/\/ethmarspp(-[a-z0-9-]+)?\.vercel\.app$/.test(o) ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(o);
  return ours ? o : fallback;
}
