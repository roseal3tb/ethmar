// Ethmar portal — emails everyone a new task concerns.
//
// POST { task_id } — called by the portal right after `create_task`. Only the task's creator may
// call it. Recipients are exactly the members `create_task` notified inside the portal (assigned
// people, or everyone who may claim an open task), so the database stays the single rule-keeper.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  chips,
  cors,
  countWord,
  hoursAr,
  json,
  layout,
  mailConfigured,
  noteCard,
  portalOrigin,
  sendMail,
  stats,
} from "../_shared/mail.ts";

const AUDIENCE: Record<string, string> = {
  committee: "جماعية لكل اللجنة",
  team: "لفريقك",
  people: "لك بالاسم",
  leaders: "لقادة اللجان",
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
    .select("id, title, description, audience, mode, hours, seats, due_date, created_by, committee_id, team_id")
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

  const [{ data: emails }, { data: people }, { data: creator }, { data: committee }, { data: team }] =
    await Promise.all([
      admin.from("member_emails").select("member_id, email").in("member_id", ids),
      admin.from("members").select("id, full_name, user_id").in("id", ids),
      admin.from("members").select("full_name").eq("id", task.created_by).maybeSingle(),
      task.committee_id
        ? admin.from("committees").select("title").eq("id", task.committee_id).maybeSingle()
        : Promise.resolve({ data: null }),
      task.team_id
        ? admin.from("teams").select("name").eq("id", task.team_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  const nameOf = new Map((people ?? []).map((p) => [p.id, String(p.full_name)]));
  const dueDate = new Date(task.due_date + "T00:00:00");
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", o).format(dueDate);
  const due = fmt({ weekday: "long", day: "numeric", month: "long" });
  const dueDay = fmt({ weekday: "long" });
  const dueMonth = fmt({ month: "long" });
  const link = `${portalOrigin(req)}/portal/tasks?task=${taskId}`;
  const assigned = task.mode === "assigned";

  let sent = 0;
  // Only members who have been invited to the portal; the others would land on a login they can't use.
  const invited = new Set((people ?? []).filter((p) => p.user_id).map((p) => p.id));
  for (const e of (emails ?? []).filter((x) => invited.has(x.member_id))) {
    const from = creator?.full_name ?? "قيادة المبادرة";
    const first = String(nameOf.get(e.member_id) ?? "").split(" ")[0];
    const hours = Number(task.hours);
    const seats = Number(task.seats ?? 0);
    const where =
      task.audience === "leaders"
        ? "من قيادة المبادرة"
        : committee?.title
          ? `من ${committee.title}`
          : "";
    const tiles = [
      { value: String(hours), label: `${countWord(hours, "ساعات", "ساعة")} عند الاعتماد`, gold: true },
      { value: String(Number(task.due_date.slice(8))), label: `${dueDay} · ${dueMonth}` },
      ...(!assigned && seats
        ? [{ value: String(seats), label: countWord(seats, "مقاعد متاحة", "مقعد متاح") }]
        : []),
    ];
    const { html, text } = layout({
      preheader: `${task.title} · ${hoursAr(hours)} · التسليم ${due}`,
      hero: assigned ? "مهمة جديدة لك" : "مهمة جديدة تنتظرك",
      heroSub: where || undefined,
      eyebrow: `مرحبًا ${first}`,
      heading: String(task.title),
      intro: assigned
        ? `أسند لك ${from} هذي المهمة، وتنحسب ساعاتها أول ما ينعتمد تسليمك.`
        : `نزّل ${from} مهمة جديدة ${task.audience === "team" ? "لفريقك" : task.audience === "leaders" ? "لقادة اللجان" : "للجنة"}، وتقدر تسحبها الحين.`,
      blocks: [
        chips([
          task.audience === "team" && team?.name ? String(team.name) : (AUDIENCE[task.audience] ?? ""),
          assigned ? "مسندة مباشرة" : "مفتوحة للسحب",
        ]),
        stats(tiles),
        ...(task.description ? [noteCard("وش المطلوب؟", String(task.description).slice(0, 600))] : []),
      ],
      textDetails: [
        `الساعات: ${hoursAr(hours)} عند الاعتماد`,
        `التسليم: ${due}`,
        ...(!assigned && seats ? [`المقاعد: ${seats}`] : []),
        ...(task.description ? ["", String(task.description).slice(0, 600)] : []),
      ],
      button: assigned ? "افتح المهمة" : "اسحب المهمة",
      url: link,
      note: assigned ? undefined : "المقاعد محدودة وأول من يسحب ياخذ مقعده.",
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
