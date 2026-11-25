// Ethmar portal — member accounts (leadership / admins only).
//
// POST { action: "create", member_id, email }  → creates the login for a member who
//   has none yet, with a one-time password the member must change on first sign-in.
// POST { action: "reset", member_id }          → issues a new one-time password.
//
// The caller's own token decides who they are; `is_leadership()` (president, vice
// presidents, admins) decides whether they may do this. Nothing is emailed: the
// one-time password is returned once so the leadership can hand it over privately.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// 12 characters without look-alikes (0/O, 1/l/I), grouped for reading aloud.
function oneTimePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
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
    .select("id, user_id, full_name, active")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || !member.active) return json({ error: "member_not_found" }, 404);

  const password = oneTimePassword();

  if (body.action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_email" }, 400);
    if (member.user_id) return json({ error: "already_has_account" }, 409);

    const { error: emailError } = await admin
      .from("member_emails")
      .upsert({ member_id: memberId, email }, { onConflict: "member_id" });
    if (emailError) return json({ error: "email_in_use" }, 409);

    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !created.user) return json({ error: "email_in_use" }, 409);

    await admin.from("members").update({ user_id: created.user.id, must_change_password: true }).eq("id", memberId);
    return json({ password, email });
  }

  if (body.action === "reset") {
    if (!member.user_id) return json({ error: "no_account" }, 409);
    const { error } = await admin.auth.admin.updateUserById(member.user_id, { password });
    if (error) return json({ error: "reset_failed" }, 500);
    await admin.from("members").update({ must_change_password: true }).eq("id", memberId);
    return json({ password });
  }

  return json({ error: "unknown_action" }, 400);
});
