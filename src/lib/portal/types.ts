// Domain types for the members portal. They mirror the Supabase schema
// (supabase/migrations/20261125200000_core_schema.sql).

export type Role =
  | "member"
  | "team_lead"
  | "team_deputy"
  | "team_supervisor"
  | "project_lead"
  | "committee_lead"
  | "committee_deputy"
  | "vice_president"
  | "president";

export type Audience = "committee" | "team" | "people" | "leaders";
export type TaskMode = "open" | "assigned";
export type TaskStatus = "active" | "closed" | "cancelled";
export type AssignmentStatus = "claimed" | "submitted" | "returned" | "approved";
export type Board = "members" | "leaders";

export interface Committee {
  id: string;
  name: string;
  title: string;
  description: string | null;
  accent: string;
  sort: number;
}

export interface Team {
  id: string;
  committee_id: string;
  name: string;
  head_title: string;
  sort: number;
}

export interface Member {
  id: string;
  full_name: string;
  committee_id: string | null;
  team_id: string | null;
  role: Role;
  title: string | null;
  extra_titles: string[];
  member_code: string | null;
  is_admin: boolean;
  must_change_password: boolean;
  has_account: boolean;
}

export interface Assignment {
  task_id: string;
  member_id: string;
  status: AssignmentStatus;
  assigned_by: string | null;
  claimed_at: string;
  note: string | null;
  link: string | null;
  submitted_at: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  audience: Audience;
  committee_id: string | null;
  team_id: string | null;
  mode: TaskMode;
  seats: number | null;
  hours: number;
  due_date: string; // YYYY-MM-DD
  status: TaskStatus;
  created_by: string;
  created_at: string;
  assignments: Assignment[];
}

export interface NewTask {
  title: string;
  description: string;
  audience: Audience;
  committee_id: string | null;
  team_id: string | null;
  mode: TaskMode;
  seats: number | null;
  hours: number;
  due_date: string;
  targets: string[];
}

export interface Tier {
  id: string;
  name: string;
  min_hours: number;
}

export interface Summary {
  semester: { name: string; starts_on: string; ends_on: string } | null;
  semester_hours: number;
  total_hours: number;
  month_hours: number;
  pending_hours: number;
  completed_tasks: number;
  tier: Tier | null;
  next_tier: Tier | null;
  board: Board | null;
  month_rank: number | null;
  board_size: number | null;
}

export interface LeaderRow {
  /** Null until the member has approved hours in the period. */
  rank: number | null;
  member_id: string;
  full_name: string;
  committee_title: string | null;
  team_name: string | null;
  title: string | null;
  tier_id: string;
  tier_name: string;
  hours: number | null; // only ever set on the viewer's own row
  is_me: boolean;
}

export interface HourEntry {
  id: string;
  member_id: string;
  task_id: string | null;
  hours: number;
  earned_on: string;
  description: string | null;
}

export interface MemberStat {
  member_id: string;
  full_name: string;
  committee_id: string | null;
  team_id: string | null;
  role: Role;
  title: string | null;
  period_hours: number;
  semester_hours: number;
  active_tasks: number;
  awaiting_review: number;
  approved_tasks: number;
  tier_name: string;
}

export interface PortalNotification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Structure {
  committees: Committee[];
  teams: Team[];
  members: Member[];
}

export type LinkType = "invite" | "magiclink" | "recovery";
export interface InviteResult {
  emailed: boolean;
  email: string;
  /** Present when the email couldn't be sent: share it with the member yourself. */
  link?: string;
}

export interface PortalApi {
  /** The signed-in auth user id, or null. */
  currentUserId(): Promise<string | null>;
  onAuthChange(cb: (userId: string | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  changePassword(password: string): Promise<void>;

  me(): Promise<Member | null>;
  structure(): Promise<Structure>;
  memberTiers(): Promise<Record<string, { tier_id: string; tier_name: string }>>;
  tasks(): Promise<Task[]>;
  createTask(input: NewTask): Promise<string>;
  claimTask(taskId: string): Promise<void>;
  unclaimTask(taskId: string): Promise<void>;
  submitTask(taskId: string, note: string, link: string): Promise<void>;
  reviewTask(taskId: string, memberId: string, approve: boolean, note: string): Promise<void>;
  setTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  summary(): Promise<Summary | null>;
  leaderboard(board: Board, from: string, to: string): Promise<LeaderRow[]>;
  myHours(): Promise<HourEntry[]>;
  memberStats(from: string, to: string): Promise<MemberStat[]>;
  notifications(): Promise<PortalNotification[]>;
  markNotificationsRead(ids?: string[]): Promise<void>;
  memberEmails(): Promise<Record<string, string>>;
  /** Creates the member's login and emails an invitation (or returns the link when email isn't set up). */
  inviteMember(memberId: string, email?: string): Promise<InviteResult>;
  /** Emails a link to choose a new password. */
  resetPassword(memberId: string): Promise<InviteResult>;
  /** Signs in from an emailed link (?token_hash=…&type=…). */
  verifyLink(tokenHash: string, type: LinkType): Promise<void>;
  /** Emails everyone a newly created task concerns. Best effort. */
  notifyTask(taskId: string): Promise<{ sent: number }>;
}
