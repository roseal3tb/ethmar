// Ethmar portal — emails everyone a new task concerns.
//
// POST { task_id } — called by the portal right after `create_task`. Only the task's creator may
// call it. Recipients are exactly the members `create_task` notified inside the portal (assigned
// people, or everyone who may claim an open task), so the database stays the single rule-keeper.
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, json, layout, mailConfigured, portalOrigin, sendMail } from "../_shared/mail.ts";

const AUDIENCE: Record<string, string> = {
  committee: "مهمة جماعية للجنة",
  team: "مهمة لفريقك",
  people: "مهمة مسندة لك",
  leaders: "مهمة لقادة اللجان",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  let taskId = "";
  try {
    taskId = String((await req.json()).task_id ?? "");
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) return json({ error: "invalid_task" }, 400);

  const { data: meId } = await caller.rpc("me_id");
  const { data: task } = await caller
    .from("tasks")
    .select("id, title, description, audience, mode, hours, due_date, created_by, committee_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || !meId || task.created_by !== meId) return json({ error: "forbidden" }, 403);
  if (!mailConfigured()) return json({ sent: 0, reason: "smtp_not_configured" });

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: notes } = await admin
    .from("notifications")
    .select("member_id")
    .eq("link", `/portal/tasks?task=${taskId}`);
  const ids = [...new Set((notes ?? []).map((n) => n.member_id))];
  if (!ids.length) return json({ sent: 0 });

  const [{ data: emails }, { data: people }, { data: creator }] = await Promise.all([
    admin.from("member_emails").select("member_id, email").in("member_id", ids),
    admin.from("members").select("id, full_name, user_id").in("id", ids),
    admin.from("members").select("full_name").eq("id", task.created_by).maybeSingle(),
  ]);
  const nameOf = new Map((people ?? []).map((p) => [p.id, String(p.full_name).split(" ")[0]]));
  const due = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date(task.due_date + "T00:00:00"));
  const link = `${portalOrigin(req)}/portal/tasks?task=${taskId}`;
  const assigned = task.mode === "assigned";

  let sent = 0;
  // Only members who have been invited to the portal; the others would land on a login they can't use.
  const invited = new Set((people ?? []).filter((p) => p.user_id).map((p) => p.id));
  for (const e of (emails ?? []).filter((x) => invited.has(x.member_id))) {
    const { html, text } = layout({
      title: task.title,
      intro: `أهلًا ${nameOf.get(e.member_id) ?? ""}، ${assigned ? "أُسندت لك مهمة جديدة" : "نزلت مهمة جديدة تقدر تسحبها"} من ${creator?.full_name ?? "قائد اللجنة"}.`,
      lines: [
        `${AUDIENCE[task.audience] ?? "مهمة"} · ${Number(task.hours)} ساعة · التسليم ${due}`,
        ...(task.description ? [String(task.description).slice(0, 400)] : []),
      ],
      button: assigned ? "فتح المهمة" : "اسحب المهمة",
      note: assigned ? undefined : "المقاعد محدودة، وأول من يسحب ياخذ مقعده.",
    });
    try {
      await sendMail(e.email, `مهمة جديدة: ${task.title}`, html, text);
      sent++;
    } catch (err) {
      console.error("mail failed", e.member_id, err);
    }
  }
  return json({ sent, total: ids.length });
});
