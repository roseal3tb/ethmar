// Ethmar portal — member accounts (leadership / admins only).
//
// POST { action: "invite", member_id, email? } → creates the login for a member who has none yet
//   (email from the request, or the one already on file) and emails them an invitation link.
//   Opening the link signs them in and the portal asks them to choose their password.
// POST { action: "reset", member_id }          → emails a link to choose a new password.
//
// If SMTP isn't configured yet the link is returned instead (`emailed: false`), so the
// leadership can send it themselves. The caller's own token decides who they are;
// `is_leadership()` (president, vice presidents, admins) decides whether they may do this.
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, json, layout, mailConfigured, portalOrigin, sendMail } from "../_shared/mail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: allowed, error: roleError } = await caller.rpc("is_leadership");
  if (roleError || allowed !== true) return json({ error: "forbidden" }, 403);

  let body: { action?: string; member_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  const memberId = String(body.member_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return json({ error: "invalid_member" }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: member } = await admin
    .from("members")
    .select("id, user_id, full_name, active, must_change_password")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || !member.active) return json({ error: "member_not_found" }, 404);
  const { data: onFile } = await admin.from("member_emails").select("email").eq("member_id", memberId).maybeSingle();

  const origin = portalOrigin(req);
  const firstName = String(member.full_name).split(" ")[0];

  if (body.action === "invite") {
    const email = String(body.email || onFile?.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_email" }, 400);

    const { error: emailError } = await admin
      .from("member_emails")
      .upsert({ member_id: memberId, email }, { onConflict: "member_id" });
    if (emailError) return json({ error: "email_in_use" }, 409);

    // A member who already has a login (e.g. a lost invitation) gets a fresh sign-in link instead.
    let type: "invite" | "magiclink" = member.user_id ? "magiclink" : "invite";
    let { data: link, error } = await admin.auth.admin.generateLink({ type, email });
    if (error && type === "invite") {
      // The email already has a login (made earlier): sign them in with it instead.
      type = "magiclink";
      ({ data: link, error } = await admin.auth.admin.generateLink({ type, email }));
    }
    if (error || !link?.user) return json({ error: "email_in_use" }, 409);
    // Someone who already chose a password just gets signed in; only new or pending members choose one.
    const choosePassword = !member.user_id || member.must_change_password;
    await admin
      .from("members")
      .update({ user_id: link.user.id, must_change_password: choosePassword })
      .eq("id", memberId);

    const actionUrl = `${origin}/portal?token_hash=${link.properties.hashed_token}&type=${type}`;
    return await deliver(email, actionUrl, {
      title: "حياك الله في بوابة أعضاء إثمار",
      intro: `أهلًا ${firstName}، انضافت لك عضوية في بوابة أعضاء مبادرة إثمار.`,
      lines: ["من البوابة تتابع مهامك وساعاتك التطوعية وترتيبك بين الأعضاء."],
      button: "تفعيل الحساب واختيار كلمة المرور",
      note: "الرابط صالح لمدة محدودة ولمرة وحدة. إذا انتهى اطلب رابط جديد من قيادة المبادرة.",
    });
  }

  if (body.action === "reset") {
    if (!member.user_id || !onFile?.email) return json({ error: "no_account" }, 409);
    const { data: link, error } = await admin.auth.admin.generateLink({ type: "recovery", email: onFile.email });
    if (error || !link) return json({ error: "reset_failed" }, 500);
    await admin.from("members").update({ must_change_password: true }).eq("id", memberId);
    const actionUrl = `${origin}/portal?token_hash=${link.properties.hashed_token}&type=recovery`;
    return await deliver(onFile.email, actionUrl, {
      title: "تعيين كلمة مرور جديدة",
      intro: `أهلًا ${firstName}، هذا رابط تختار فيه كلمة مرور جديدة لبوابة أعضاء إثمار.`,
      button: "اختيار كلمة مرور جديدة",
      note: "إذا ما طلبت هذا، تجاهل الرسالة.",
    });
  }

  return json({ error: "unknown_action" }, 400);
});

async function deliver(
  email: string,
  actionUrl: string,
  copy: { title: string; intro: string; lines?: string[]; button: string; note?: string },
) {
  if (!mailConfigured()) return json({ emailed: false, email, link: actionUrl });
  try {
    const { html, text } = layout({ ...copy, url: actionUrl });
    await sendMail(email, copy.title, html, text);
    return json({ emailed: true, email });
  } catch (e) {
    console.error("mail failed", e);
    return json({ emailed: false, email, link: actionUrl, mail_error: true });
  }
}
