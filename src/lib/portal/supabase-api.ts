import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Achievement,
  Assignment,
  Board,
  Certificate,
  CertificateCheck,
  Committee,
  HourImport,
  InactiveMember,
  InviteResult,
  Me,
  Project,
  Semester,
  SurveyListItem,
  SurveyResults,
  TaskComment,
  Team,
  HourEntry,
  LeaderRow,
  Member,
  MemberStat,
  NewTask,
  PortalApi,
  PortalNotification,
  Structure,
  Summary,
  Survey,
  Answers,
  Task,
  TaskStatus,
} from "./types";
import { PortalError } from "./errors";

// Public values: the publishable key only grants what the database's RLS allows.
const SUPABASE_URL =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ??
  "https://lycuogzobscabfhozicw.supabase.co";
const SUPABASE_KEY =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ??
  "sb_publishable_G8tMR97tFVBtpKTQcCEUog_3d9BF8gJ";

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client)
    client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true } });
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new PortalError(res.error.message);
  return res.data;
}

const MEMBER_COLS =
  "id, full_name, committee_id, team_id, role, title, extra_titles, member_code, is_admin, must_change_password, user_id, capabilities";
type MemberRow = Omit<Member, "has_account"> & { user_id: string | null };
const toMember = ({ user_id, ...m }: MemberRow): Member => ({ ...m, has_account: !!user_id });
const num = (v: unknown) => (v == null ? 0 : Number(v));

export const supabaseApi: PortalApi = {
  async currentUserId() {
    const { data } = await sb().auth.getSession();
    return data.session?.user.id ?? null;
  },
  onAuthChange(cb) {
    const { data } = sb().auth.onAuthStateChange((_e, session) => cb(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await sb().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new PortalError(error.status === 400 ? "invalid_credentials" : "network");
  },
  async signOut() {
    await sb().auth.signOut();
  },
  async changePassword(password) {
    const { error } = await sb().auth.updateUser({ password });
    if (error)
      throw new PortalError(/same/i.test(error.message) ? "same_password" : "weak_password");
    check(await sb().rpc("clear_must_change_password"));
  },

  async me() {
    const { data: session } = await sb().auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) return null;
    const row = check(
      await sb().from("members").select(MEMBER_COLS).eq("user_id", uid).maybeSingle(),
    ) as MemberRow | null;
    if (!row) return null;
    const pm = check(
      await sb().from("project_members").select("project_id, is_lead").eq("member_id", row.id),
    ) as { project_id: string; is_lead: boolean }[];
    const me: Me = {
      ...toMember(row),
      project_ids: pm.map((p) => p.project_id),
      led_project_ids: pm.filter((p) => p.is_lead).map((p) => p.project_id),
    };
    return me;
  },
  async structure(): Promise<Structure> {
    const [c, t, m] = await Promise.all([
      sb().from("committees").select("*").order("sort"),
      sb().from("teams").select("*").order("sort"),
      sb().from("members").select(MEMBER_COLS).eq("active", true).order("sort"),
    ]);
    return {
      committees: (check(c) ?? []) as Committee[],
      teams: (check(t) ?? []) as Team[],
      members: (check(m) as MemberRow[]).map(toMember),
    };
  },
  async memberTiers() {
    const rows = check(await sb().rpc("member_tiers")) as {
      member_id: string;
      tier_id: string;
      tier_name: string;
    }[];
    return Object.fromEntries(
      rows.map((r) => [r.member_id, { tier_id: r.tier_id, tier_name: r.tier_name }]),
    );
  },
  async tasks() {
    const rows = check(
      await sb().from("tasks").select("*, assignments:task_assignments(*)").order("due_date"),
    ) as (Omit<Task, "assignments" | "hours"> & { hours: unknown; assignments: Assignment[] })[];
    return rows.map((t) => ({
      ...t,
      hours: num(t.hours),
      assignments: t.assignments.map((a) => ({
        ...a,
        files: a.files ?? [],
        extra_hours: a.extra_hours == null ? null : num(a.extra_hours),
      })),
    }));
  },
  async createTask(input: NewTask) {
    return check(
      await sb().rpc("create_task", {
        p_title: input.title,
        p_description: input.description,
        p_audience: input.audience,
        p_committee: input.committee_id,
        p_team: input.team_id,
        p_mode: input.mode,
        p_seats: input.seats,
        p_hours: input.hours,
        p_due: input.due_date,
        p_targets: input.targets,
        p_project: input.project_id ?? null,
      }),
    ) as string;
  },
  async claimTask(taskId) {
    check(await sb().rpc("claim_task", { p_task: taskId }));
  },
  async unclaimTask(taskId) {
    check(await sb().rpc("unclaim_task", { p_task: taskId }));
  },
  async submitTask(taskId, sub) {
    check(
      await sb().rpc("submit_task", {
        p_task: taskId,
        p_note: sub.note,
        p_link: sub.link,
        p_files: sub.files,
        p_extra: sub.extra?.hours ?? null,
        p_extra_reason: sub.extra?.reason ?? null,
      }),
    );
  },
  async reviewTask(taskId, memberId, approve, note, extraOk) {
    check(
      await sb().rpc("review_task", {
        p_task: taskId,
        p_member: memberId,
        p_approve: approve,
        p_note: note,
        p_extra_ok: extraOk ?? null,
      }),
    );
  },
  async uploadTaskFile(taskId, file) {
    const me = await this.me();
    if (!me) throw new PortalError("not_a_member");
    if (file.size > 10 * 1024 * 1024) throw new PortalError("file_too_big");
    const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80) || "file";
    const path = `${taskId}/${me.id}/${Date.now().toString(36)}-${safe}`;
    const { error } = await sb().storage.from("task-files").upload(path, file, { upsert: false });
    if (error) throw new PortalError("upload_failed");
    return { path, name: file.name.slice(0, 120), size: file.size };
  },
  async fileUrl(path) {
    const { data, error } = await sb().storage.from("task-files").createSignedUrl(path, 600);
    if (error || !data) throw new PortalError("not_found");
    return data.signedUrl;
  },
  async comments(taskId) {
    const rows = check(
      await sb()
        .from("task_comments")
        .select(
          "id, task_id, member_id, body, created_at, reactions:comment_reactions(emoji, member_id)",
        )
        .eq("task_id", taskId)
        .order("created_at"),
    ) as TaskComment[];
    return rows;
  },
  async addComment(taskId, body) {
    check(await sb().rpc("add_task_comment", { p_task: taskId, p_body: body }));
  },
  async deleteComment(commentId) {
    check(await sb().rpc("delete_task_comment", { p_comment: commentId }));
  },
  async toggleReaction(commentId, emoji) {
    check(await sb().rpc("toggle_comment_reaction", { p_comment: commentId, p_emoji: emoji }));
  },
  async setTaskStatus(taskId, status: TaskStatus) {
    check(await sb().rpc("set_task_status", { p_task: taskId, p_status: status }));
  },
  async summary() {
    const s = check(await sb().rpc("my_summary")) as Record<string, unknown> | null;
    if (!s) return null;
    return {
      ...(s as unknown as Summary),
      semester_hours: num(s["semester_hours"]),
      total_hours: num(s["total_hours"]),
      month_hours: num(s["month_hours"]),
      pending_hours: num(s["pending_hours"]),
      completed_tasks: num(s["completed_tasks"]),
    };
  },
  async leaderboard(board: Board, from, to) {
    const rows = check(
      await sb().rpc("leaderboard", { p_board: board, p_from: from, p_to: to }),
    ) as LeaderRow[];
    return rows.map((r) => ({
      ...r,
      rank: r.rank == null ? null : Number(r.rank),
      hours: r.hours == null ? null : num(r.hours),
    }));
  },
  async myHours() {
    const { data: session } = await sb().auth.getSession();
    const me = await this.me();
    if (!session.session || !me) return [];
    const rows = check(
      await sb()
        .from("hour_entries")
        .select("id, member_id, task_id, hours, earned_on, description")
        .eq("member_id", me.id)
        .order("earned_on", { ascending: false }),
    ) as HourEntry[];
    return rows.map((r) => ({ ...r, hours: num(r.hours) }));
  },
  async memberStats(from, to) {
    const rows = check(await sb().rpc("member_stats", { p_from: from, p_to: to })) as MemberStat[];
    return rows.map((r) => ({
      ...r,
      period_hours: num(r.period_hours),
      semester_hours: num(r.semester_hours),
      active_tasks: num(r.active_tasks),
      awaiting_review: num(r.awaiting_review),
      approved_tasks: num(r.approved_tasks),
    }));
  },
  async notifications() {
    return check(
      await sb()
        .from("notifications")
        .select("id, title, body, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ) as PortalNotification[];
  },
  async markNotificationsRead(ids) {
    check(await sb().rpc("mark_notifications_read", { p_ids: ids ?? null }));
  },
  async memberEmails() {
    const rows = check(await sb().from("member_emails").select("member_id, email")) as {
      member_id: string;
      email: string;
    }[];
    return Object.fromEntries(rows.map((r) => [r.member_id, r.email]));
  },
  async inviteMember(memberId, email) {
    const { data, error } = await sb().functions.invoke("member-accounts", {
      body: { action: "invite", member_id: memberId, ...(email ? { email } : {}) },
    });
    if (error) throw new PortalError(await edgeError(error));
    return data as InviteResult;
  },
  async resetPassword(memberId) {
    const { data, error } = await sb().functions.invoke("member-accounts", {
      body: { action: "reset", member_id: memberId },
    });
    if (error) throw new PortalError(await edgeError(error));
    return data as InviteResult;
  },
  async verifyLink(tokenHash, type) {
    const { error } = await sb().auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) throw new PortalError("link_expired");
  },
  async notifyTask(taskId) {
    const { data, error } = await sb().functions.invoke("task-emails", {
      body: { task_id: taskId },
    });
    if (error) return { sent: 0 };
    return { sent: Number((data as { sent?: number })?.sent ?? 0) };
  },

  async requestPasswordHelp(email) {
    const { error } = await sb().functions.invoke("password-help", {
      body: { email: email.trim().toLowerCase() },
    });
    if (error) {
      const code = await edgeError(error);
      throw new PortalError(code === "rate_limited" ? "rate_limited" : "network");
    }
  },
  async changeOwnPassword(current, next) {
    const { data } = await sb().auth.getSession();
    const email = data.session?.user.email;
    if (!email) throw new PortalError("not_a_member");
    const { error } = await sb().auth.signInWithPassword({ email, password: current });
    if (error) throw new PortalError("wrong_password");
    await this.changePassword(next);
  },

  async achievements() {
    const rows = check(await sb().rpc("my_achievements")) as Achievement[];
    return rows.map((r) => ({ ...r, progress: num(r.progress), goal: num(r.goal) }));
  },
  async semesters() {
    return check(
      await sb().from("semesters").select("*").order("starts_on", { ascending: false }),
    ) as Semester[];
  },
  async saveSemester(x) {
    return check(
      await sb().rpc("save_semester", {
        p_id: x.id,
        p_name: x.name,
        p_starts: x.starts_on,
        p_ends: x.ends_on,
      }),
    ) as number;
  },
  async myCertificates() {
    const me = await this.me();
    if (!me) return [];
    const rows = check(
      await sb()
        .from("certificates")
        .select("id, code, semester_id, period_label, hours, tasks, issued_at, revoked_at")
        .eq("member_id", me.id)
        .order("issued_at", { ascending: false }),
    ) as Certificate[];
    return rows.map((c) => ({ ...c, hours: num(c.hours) }));
  },
  async issueCertificate(semesterId) {
    return check(await sb().rpc("issue_certificate", { p_semester: semesterId })) as string;
  },
  async verifyCertificate(code) {
    const r = check(await sb().rpc("verify_certificate", { p_code: code })) as CertificateCheck;
    return r.hours == null ? r : { ...r, hours: num(r.hours) };
  },

  async projects() {
    const rows = check(
      await sb()
        .from("projects")
        .select(
          "*, members:project_members(member_id, is_lead), log:project_stage_log(stage, note, changed_by, changed_at)",
        )
        .order("sort"),
    ) as Project[];
    return rows.map((p) => ({
      ...p,
      log: [...p.log].sort((a, b) => a.changed_at.localeCompare(b.changed_at)),
    }));
  },
  async createProject(name, tagline) {
    return check(await sb().rpc("create_project", { p_name: name, p_tagline: tagline })) as string;
  },
  async updateProject(id, fields) {
    check(await sb().rpc("update_project", { p_project: id, p_fields: fields }));
  },
  async setProjectStage(id, stage, note) {
    check(await sb().rpc("set_project_stage", { p_project: id, p_stage: stage, p_note: note }));
  },
  async setProjectTeam(id, members, leads) {
    check(
      await sb().rpc("set_project_team", { p_project: id, p_members: members, p_leads: leads }),
    );
  },

  async surveys() {
    const [list, mine, overview] = await Promise.all([
      sb().from("surveys").select("*").order("created_at", { ascending: false }),
      sb().from("survey_responses").select("survey_id, answers, submitted_at"),
      sb().rpc("survey_overview"),
    ]);
    const responses = new Map(
      (check(mine) as { survey_id: string; answers: Answers; submitted_at: string | null }[]).map(
        (r) => [r.survey_id, r],
      ),
    );
    const over = new Map(
      (
        check(overview) as {
          survey_id: string;
          submitted: unknown;
          audience: unknown;
          can_manage: boolean;
        }[]
      ).map((o) => [o.survey_id, o]),
    );
    return (check(list) as Survey[]).map((x): SurveyListItem => {
      const o = over.get(x.id);
      const r = responses.get(x.id);
      return {
        ...x,
        mine: r ? { answers: r.answers, submitted_at: r.submitted_at } : null,
        can_manage: !!o?.can_manage,
        submitted: o?.submitted == null ? null : num(o.submitted),
        audience_size: o?.audience == null ? null : num(o.audience),
      };
    });
  },
  async createSurvey(x) {
    return check(
      await sb().rpc("create_survey", {
        p_title: x.title,
        p_description: x.description,
        p_audience: x.audience,
        p_committee: x.committee_id,
        p_project: x.project_id,
        p_questions: x.questions,
        p_anonymous: x.anonymous,
        p_deadline: x.deadline,
      }),
    ) as string;
  },
  async saveSurveyResponse(id, answers, submit) {
    check(
      await sb().rpc("save_survey_response", {
        p_survey: id,
        p_answers: answers,
        p_submit: submit,
      }),
    );
  },
  async setSurveyStatus(id, status) {
    check(await sb().rpc("set_survey_status", { p_survey: id, p_status: status }));
  },
  async deleteSurvey(id) {
    check(await sb().rpc("delete_survey", { p_survey: id }));
  },
  async surveyResults(id) {
    const r = check(await sb().rpc("survey_results", { p_survey: id })) as SurveyResults;
    return { ...r, audience: num(r.audience) };
  },
  async remindSurvey(id) {
    return num(check(await sb().rpc("remind_survey", { p_survey: id })));
  },

  async hourImports() {
    const rows = check(
      await sb().from("hour_imports").select("*").order("created_at", { ascending: false }),
    ) as HourImport[];
    return rows.map((r) => ({ ...r, total_hours: num(r.total_hours) }));
  },
  async importHours(label, rows) {
    return check(await sb().rpc("import_hours", { p_label: label, p_rows: rows })) as string;
  },
  async undoHourImport(id) {
    check(await sb().rpc("undo_hour_import", { p_import: id }));
  },
  async inactiveMembers() {
    return check(await sb().rpc("inactive_members")) as InactiveMember[];
  },
  async setMemberActive(id, active) {
    check(await sb().rpc("set_member_active", { p_member: id, p_active: active }));
  },
  async setMemberCapabilities(id, caps) {
    check(await sb().rpc("set_member_capabilities", { p_member: id, p_caps: caps }));
  },
};

async function edgeError(error: { context?: unknown }): Promise<string> {
  try {
    const res = error.context as Response | undefined;
    const body = res ? await res.json() : null;
    return (body as { error?: string } | null)?.error ?? "network";
  } catch {
    return "network";
  }
}
