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

export type Audience = "committee" | "team" | "people" | "leaders" | "project";
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
  /** Extra powers: hours · surveys · projects · accounts */
  capabilities: Capability[];
}

export type Capability = "hours" | "surveys" | "projects" | "accounts";

/** The signed-in member plus what only they need (their projects). */
export interface Me extends Member {
  project_ids: string[];
  led_project_ids: string[];
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
  files: SubmissionFile[];
  extra_hours: number | null;
  extra_reason: string | null;
  extra_status: "pending" | "approved" | "declined" | null;
}

export interface SubmissionFile {
  path: string;
  name: string;
  size: number;
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
  project_id: string | null;
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
  project_id?: string | null | undefined;
}

export interface Submission {
  note: string;
  link: string;
  files: SubmissionFile[];
  extra?: { hours: number; reason: string } | null | undefined;
}

export interface TaskComment {
  id: string;
  task_id: string;
  member_id: string;
  body: string;
  created_at: string;
  reactions: { emoji: string; member_id: string }[];
}

export interface Achievement {
  id: string;
  unlocked: boolean;
  unlocked_at: string | null;
  progress: number;
  goal: number;
}

export interface Semester {
  id: number;
  name: string;
  starts_on: string;
  ends_on: string;
}

export interface Certificate {
  id: string;
  code: string;
  semester_id: number | null;
  period_label: string;
  hours: number;
  tasks: number;
  issued_at: string;
  revoked_at: string | null;
}

export interface CertificateCheck {
  found: boolean;
  valid?: boolean;
  superseded?: boolean;
  code?: string;
  name?: string;
  committee?: string;
  title?: string | null;
  period?: string;
  hours?: number;
  tasks?: number;
  issued_at?: string;
}

export type ProjectStage = "planning" | "prep" | "execution" | "review" | "done";
export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  situation: string;
  problem: string;
  goal: string;
  success: string;
  location: string;
  stage: ProjectStage;
  starts_on: string | null;
  ends_on: string | null;
  sort: number;
  members: { member_id: string; is_lead: boolean }[];
  log: {
    stage: ProjectStage;
    note: string | null;
    changed_by: string | null;
    changed_at: string;
  }[];
}
export type ProjectFields = Partial<
  Pick<
    Project,
    | "name"
    | "tagline"
    | "situation"
    | "problem"
    | "goal"
    | "success"
    | "location"
    | "starts_on"
    | "ends_on"
  >
>;

export type QuestionType = "short" | "long" | "single" | "multi" | "rating";
export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  title: string;
  options?: string[] | undefined;
  required?: boolean | undefined;
}
export type SurveyAudience = "all" | "committee" | "leaders" | "project";
export interface Survey {
  id: string;
  title: string;
  description: string;
  audience: SurveyAudience;
  committee_id: string | null;
  project_id: string | null;
  questions: SurveyQuestion[];
  anonymous: boolean;
  deadline: string | null;
  status: "open" | "closed";
  created_by: string;
  created_at: string;
}
export type Answers = Record<string, string | string[] | number>;
export interface SurveyListItem extends Survey {
  mine: { answers: Answers; submitted_at: string | null } | null;
  can_manage: boolean;
  submitted: number | null;
  audience_size: number | null;
}
export interface NewSurvey {
  title: string;
  description: string;
  audience: SurveyAudience;
  committee_id: string | null;
  project_id: string | null;
  questions: SurveyQuestion[];
  anonymous: boolean;
  deadline: string | null;
}
export interface SurveyResults {
  audience: number;
  responses: {
    member_id: string | null;
    name: string | null;
    committee: string | null;
    answers: Answers;
    submitted_at: string | null;
  }[];
}

export interface HourImportRow {
  member_id: string;
  hours: number;
  earned_on: string;
  description?: string | undefined;
}
export interface HourImport {
  id: string;
  label: string;
  rows: number;
  total_hours: number;
  created_by: string;
  created_at: string;
  undone_at: string | null;
}
export interface InactiveMember {
  id: string;
  full_name: string;
  committee_id: string | null;
  team_id: string | null;
  role: Role;
  title: string | null;
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

/* ───────────── Quality reports ───────────── */

export type ReportStatus = "draft" | "submitted" | "reviewed" | "returned";

export interface MemberEvaluation {
  member_id: string;
  score: number | null;
  standout: boolean;
  note: string;
}

export interface ReportFields {
  done: string;
  next_plan: string;
  challenges: string;
  support: string;
  link: string;
  self_score: number | null;
}

/** A committee's weekly report to the quality committee (week = Sunday → Saturday). */
export interface CommitteeReport extends ReportFields {
  id: string;
  committee_id: string;
  week_start: string;
  author_id: string;
  status: ReportStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  quality_score: number | null;
  quality_note: string;
  updated_at: string;
  evaluations: MemberEvaluation[];
}

export interface MonthlyFields {
  summary: string;
  highlights: string;
  issues: string;
  recommendations: string;
  /** Free note per committee id. */
  committee_notes: Record<string, string>;
}

export interface MonthlyReport extends MonthlyFields {
  id: string;
  month: string;
  author_id: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
}

/** Numbers behind a month, per committee. */
export interface CommitteeMonth {
  committee_id: string;
  weeks: number;
  sent: number;
  on_time: number;
  quality_avg: number | null;
  self_avg: number | null;
  members_avg: number | null;
  standouts: string[];
  hours: number;
  members: number;
}

export interface PortalApi {
  /** The signed-in auth user id, or null. */
  currentUserId(): Promise<string | null>;
  onAuthChange(cb: (userId: string | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  changePassword(password: string): Promise<void>;

  me(): Promise<Me | null>;
  structure(): Promise<Structure>;
  memberTiers(): Promise<Record<string, { tier_id: string; tier_name: string }>>;
  tasks(): Promise<Task[]>;
  createTask(input: NewTask): Promise<string>;
  claimTask(taskId: string): Promise<void>;
  unclaimTask(taskId: string): Promise<void>;
  submitTask(taskId: string, s: Submission): Promise<void>;
  reviewTask(
    taskId: string,
    memberId: string,
    approve: boolean,
    note: string,
    extraOk?: boolean,
  ): Promise<void>;
  uploadTaskFile(taskId: string, file: File): Promise<SubmissionFile>;
  fileUrl(path: string): Promise<string>;
  comments(taskId: string): Promise<TaskComment[]>;
  addComment(taskId: string, body: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
  toggleReaction(commentId: string, emoji: string): Promise<void>;
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

  /** Emails a password link to the address if it belongs to a member. Always resolves the same way. */
  requestPasswordHelp(email: string): Promise<void>;
  /** Signed-in member changes their own password after confirming the current one. */
  changeOwnPassword(current: string, next: string): Promise<void>;

  achievements(): Promise<Achievement[]>;
  semesters(): Promise<Semester[]>;
  saveSemester(s: Omit<Semester, "id"> & { id: number | null }): Promise<number>;
  myCertificates(): Promise<Certificate[]>;
  issueCertificate(semesterId: number | null): Promise<string>;
  verifyCertificate(code: string): Promise<CertificateCheck>;

  projects(): Promise<Project[]>;
  createProject(name: string, tagline: string): Promise<string>;
  updateProject(id: string, fields: ProjectFields): Promise<void>;
  setProjectStage(id: string, stage: ProjectStage, note: string): Promise<void>;
  setProjectTeam(id: string, members: string[], leads: string[] | null): Promise<void>;

  surveys(): Promise<SurveyListItem[]>;
  createSurvey(s: NewSurvey): Promise<string>;
  saveSurveyResponse(id: string, answers: Answers, submit: boolean): Promise<void>;
  setSurveyStatus(id: string, status: "open" | "closed"): Promise<void>;
  deleteSurvey(id: string): Promise<void>;
  surveyResults(id: string): Promise<SurveyResults>;
  remindSurvey(id: string): Promise<number>;

  hourImports(): Promise<HourImport[]>;
  importHours(label: string, rows: HourImportRow[]): Promise<string>;
  undoHourImport(id: string): Promise<void>;
  inactiveMembers(): Promise<InactiveMember[]>;
  setMemberActive(id: string, active: boolean): Promise<void>;
  setMemberCapabilities(id: string, caps: Capability[]): Promise<void>;

  /** Weekly reports the caller may see, for weeks starting between the two Sundays. */
  reports(fromWeek: string, toWeek: string): Promise<CommitteeReport[]>;
  saveReport(
    committeeId: string,
    week: string,
    fields: ReportFields,
    evaluations: MemberEvaluation[],
    submit: boolean,
  ): Promise<string>;
  reviewReport(
    id: string,
    action: "review" | "return",
    score: number | null,
    note: string,
  ): Promise<void>;
  remindReports(week: string): Promise<number>;
  monthlyReports(): Promise<MonthlyReport[]>;
  monthlyOverview(month: string): Promise<CommitteeMonth[]>;
  saveMonthly(month: string, fields: MonthlyFields, publish: boolean): Promise<string>;
}
