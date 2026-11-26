// Ethmar portal — "forgot my password" (public, no login needed).
//
// POST { email } → if the email belongs to an active member with a login, emails them a one-time
// link to choose a new password. The answer is the same whether or not the email exists, so the
// endpoint can't be used to find out who is a member. Requests are rate-limited per email and per
// network address through `password_requests` (only this function can read or write it).
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  cors,
  json,
  layout,
  mailConfigured,
  memberCard,
  portalOrigin,
  sendMail,
} from "../_shared/mail.ts";

const PER_EMAIL_HOUR = 3;
const PER_IP_HOUR = 10;
const MIN_GAP_MS = 2 * 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let email = "";
  try {
    email = String((await req.json()).email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "invalid_email" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipKey = `ip:${ip}`;
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const [{ data: recent }, { count: ipCount }] = await Promise.all([
    admin
      .from("password_requests")
      .select("requested_at")
      .eq("email", email)
      .gte("requested_at", hourAgo)
      .order("requested_at", { ascending: false }),
    admin
      .from("password_requests")
      .select("email", { count: "exact", head: true })
      .eq("email", ipKey)
      .gte("requested_at", hourAgo),
  ]);
  const last = recent?.[0] ? Date.parse(recent[0].requested_at) : 0;
  if (
    (recent?.length ?? 0) >= PER_EMAIL_HOUR ||
    Date.now() - last < MIN_GAP_MS ||
    (ipCount ?? 0) >= PER_IP_HOUR
  ) {
    return json({ error: "rate_limited" }, 429);
  }
  await admin.from("password_requests").insert([{ email }, { email: ipKey }]);
  // A day of history is all the limits need.
  await admin
    .from("password_requests")
    .delete()
    .lt("requested_at", new Date(Date.now() - 86400_000).toISOString());

  const ok = () => json({ ok: true });
  const { data: onFile } = await admin
    .from("member_emails")
    .select("member_id, email")
    .eq("email", email)
    .maybeSingle();
  if (!onFile) return ok();
  const { data: member } = await admin
    .from("members")
    .select("id, full_name, user_id, active, committee_id, team_id, title, member_code")
    .eq("id", onFile.member_id)
    .maybeSingle();
  if (!member?.user_id || !member.active) return ok();
  if (!mailConfigured()) {
    console.error("password-help: SMTP not configured");
    return ok();
  }

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: onFile.email,
  });
  if (error || !link) {
    console.error("recovery link failed", error);
    return ok();
  }

  const [{ data: committee }, { data: team }] = await Promise.all([
    member.committee_id
      ? admin.from("committees").select("title").eq("id", member.committee_id).maybeSingle()
      : Promise.resolve({ data: null }),
    member.team_id
      ? admin.from("teams").select("name").eq("id", member.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const fullName = String(member.full_name);
  const place = [
    committee?.title ?? (member.committee_id ? "" : "قيادة المبادرة"),
    team?.name ?? "",
    member.title ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
  const actionUrl = `${portalOrigin(req)}/portal?token_hash=${link.properties.hashed_token}&type=recovery`;
  const { html, text } = layout({
    preheader: "رابط تختار فيه كلمة مرور جديدة لحسابك في بوابة أعضاء إثمار",
    hero: "كلمة مرور جديدة",
    heroSub: "طلبت تغيير كلمة مرور حسابك",
    eyebrow: `مرحبًا ${fullName.split(" ")[0]}`,
    heading: "اختر كلمة مرورك الجديدة",
    intro: "وصلنا طلب «نسيت كلمة المرور». افتح الرابط واختر كلمة جديدة، وتدخل البوابة على طول",
    blocks: [memberCard({ name: fullName, place, code: member.member_code, email: onFile.email })],
    textDetails: [place, `بريد الدخول: ${onFile.email}`],
    button: "اختر كلمة المرور",
    url: actionUrl,
    note: "الرابط يشتغل مرة وحدة ولمدة محدودة. إذا ما طلبت هذا، تجاهل الرسالة وكلمة مرورك تبقى زي ما هي",
  });
  try {
    await sendMail(onFile.email, "كلمة مرور جديدة لبوابة أعضاء إثمار", html, text);
  } catch (e) {
    console.error("mail failed", e);
  }
  return ok();
});
