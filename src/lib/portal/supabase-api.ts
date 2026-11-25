import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Assignment,
  Board,
  Committee,
  InviteResult,
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
  "id, full_name, committee_id, team_id, role, title, extra_titles, member_code, is_admin, must_change_password, user_id";
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
    return row ? toMember(row) : null;
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
    return rows.map((t) => ({ ...t, hours: num(t.hours) }));
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
      }),
    ) as string;
  },
  async claimTask(taskId) {
    check(await sb().rpc("claim_task", { p_task: taskId }));
  },
  async unclaimTask(taskId) {
    check(await sb().rpc("unclaim_task", { p_task: taskId }));
  },
  async submitTask(taskId, note, link) {
    check(await sb().rpc("submit_task", { p_task: taskId, p_note: note, p_link: link }));
  },
  async reviewTask(taskId, memberId, approve, note) {
    check(
      await sb().rpc("review_task", {
        p_task: taskId,
        p_member: memberId,
        p_approve: approve,
        p_note: note,
      }),
    );
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
      rank: num(r.rank),
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
