// UI-side mirror of the database rules (supabase/migrations/…_portal_functions.sql).
// The database is the authority — these only decide which buttons to show.
import type { Assignment, Board, Capability, Me, Member, Role, Survey, Task } from "./types";

export const COMMITTEE_HEADS: Role[] = ["committee_lead", "committee_deputy"];
export const TEAM_HEADS: Role[] = ["team_lead", "team_deputy", "team_supervisor"];
export const LEADERSHIP: Role[] = ["president", "vice_president"];

export const isLeadership = (m: Member | null) =>
  !!m && (m.is_admin || LEADERSHIP.includes(m.role));
export const isCommitteeHead = (m: Member | null) => !!m && COMMITTEE_HEADS.includes(m.role);
export const isTeamHead = (m: Member | null) => !!m && TEAM_HEADS.includes(m.role);
export const headsCommittee = (m: Member | null, committeeId: string | null) =>
  isCommitteeHead(m) && !!committeeId && m!.committee_id === committeeId;

export function boardOf(role: Role): Board | null {
  if (role === "member") return "members";
  if (LEADERSHIP.includes(role)) return null;
  return "leaders";
}

/** Leadership, or a member holding the given extra power. */
export const hasCap = (m: Member | null, cap: Capability) =>
  isLeadership(m) || (!!m && (m.capabilities ?? []).includes(cap));

const ledProjects = (m: Member | Me | null): string[] => (m as Me | null)?.led_project_ids ?? [];
const myProjects = (m: Member | Me | null): string[] => (m as Me | null)?.project_ids ?? [];

/** Above any single project: create projects, choose their leads. */
export function canRunProjects(m: Member | null): boolean {
  return hasCap(m, "projects") || headsCommittee(m, "projects");
}
export function canManageProject(m: Member | Me | null, projectId: string | null): boolean {
  return !!projectId && (canRunProjects(m) || ledProjects(m).includes(projectId));
}

/** Committee lead/deputy create for their committee; leadership for committee leads; project leads for their project. */
export function canCreateTasks(m: Member | Me | null): boolean {
  return isLeadership(m) || isCommitteeHead(m) || canRunProjects(m) || ledProjects(m).length > 0;
}

/** May create a survey (for some audience). */
export function canCreateSurveys(m: Member | Me | null): boolean {
  return hasCap(m, "surveys") || isCommitteeHead(m) || ledProjects(m).length > 0;
}
export function canManageSurvey(m: Member | null, survey: Pick<Survey, "created_by">): boolean {
  return !!m && (survey.created_by === m.id || isLeadership(m));
}

/** May see the statistics page (anyone who oversees someone else's hours). */
export function canSeeStats(m: Member | null): boolean {
  return isLeadership(m) || isCommitteeHead(m) || isTeamHead(m);
}

export function canReview(
  me: Member | Me | null,
  task: Task,
  submitter: Member | undefined,
): boolean {
  if (!me || !submitter || me.id === submitter.id) return false;
  if (task.audience === "leaders") return isLeadership(me);
  if (task.audience === "project") return canManageProject(me, task.project_id);
  if (me.is_admin) return true;
  if (headsCommittee(me, task.committee_id)) return true;
  return (
    isTeamHead(me) &&
    !!me.team_id &&
    me.team_id === submitter.team_id &&
    me.committee_id === task.committee_id
  );
}

export function canManageTask(me: Member | Me | null, task: Task): boolean {
  if (!me) return false;
  if (me.is_admin || task.created_by === me.id) return true;
  if (task.audience === "leaders") return LEADERSHIP.includes(me.role);
  if (task.audience === "project") return canManageProject(me, task.project_id);
  return headsCommittee(me, task.committee_id);
}

export function myAssignment(me: Member | null, task: Task): Assignment | undefined {
  return me ? task.assignments.find((a) => a.member_id === me.id) : undefined;
}

export function seatsLeft(task: Task): number {
  if (task.mode !== "open" || task.seats == null) return 0;
  return Math.max(0, task.seats - task.assignments.length);
}

export function canClaim(me: Member | Me | null, task: Task, today: string): boolean {
  if (!me || task.mode !== "open" || task.status !== "active" || task.due_date < today)
    return false;
  if (myAssignment(me, task) || seatsLeft(task) === 0) return false;
  if (task.audience === "committee") return me.committee_id === task.committee_id;
  if (task.audience === "team") return !!me.team_id && me.team_id === task.team_id;
  if (task.audience === "leaders") return isCommitteeHead(me);
  if (task.audience === "project") return myProjects(me).includes(task.project_id ?? "");
  return false;
}

/** May open the accounts page (invite people / send password links). */
export function canManageAccounts(m: Member | null): boolean {
  return hasCap(m, "accounts") || hasCap(m, "hours") || isCommitteeHead(m) || isTeamHead(m);
}

/** Mirror of SQL `can_manage_account`: leadership → all; committee heads → their committee;
 *  team heads → plain members of their team. */
export function canManageAccount(me: Member | null, t: Member): boolean {
  if (!me) return false;
  if (hasCap(me, "accounts")) return true;
  if (isCommitteeHead(me))
    return t.committee_id === me.committee_id && !LEADERSHIP.includes(t.role) && !t.is_admin;
  if (isTeamHead(me)) return !!me.team_id && t.team_id === me.team_id && t.role === "member";
  return false;
}

/** Hours privacy: who may see another member's numbers. */
export function canViewHoursOf(me: Member | null, other: Member): boolean {
  if (!me) return false;
  if (me.id === other.id || isLeadership(me)) return true;
  if (isCommitteeHead(me))
    return other.committee_id === me.committee_id && !COMMITTEE_HEADS.includes(other.role);
  if (isTeamHead(me))
    return !!me.team_id && other.team_id === me.team_id && other.role === "member";
  return false;
}

/** Mirrors `survey_audience_ids`: is this member asked to answer the survey? */
export function inSurveyAudience(
  m: Member | Me | null,
  s: Pick<Survey, "audience" | "committee_id" | "project_id">,
): boolean {
  if (!m) return false;
  if (s.audience === "all") return true;
  if (s.audience === "committee") return !!s.committee_id && m.committee_id === s.committee_id;
  if (s.audience === "leaders") return m.role !== "member";
  return !!s.project_id && myProjects(m).includes(s.project_id);
}

/* ───────────── Quality reports (mirror the database rules) ───────────── */

export const QUALITY = "quality";
export const inQuality = (m: Member | null) => !!m && m.committee_id === QUALITY;
export const headsQuality = (m: Member | null) => inQuality(m) && isCommitteeHead(m);

/** Reports page: committee heads (their own committee), the quality committee, leadership. */
export const canSeeReports = (m: Member | null) =>
  isLeadership(m) || inQuality(m) || isCommitteeHead(m);

export const canViewCommitteeReports = (m: Member | null, committeeId: string) =>
  isLeadership(m) || inQuality(m) || headsCommittee(m, committeeId);

/** Quality and leadership review sent reports, never their own committee's (leadership excepted). */
export function canReviewReport(
  m: Member | null,
  r: { author_id: string; committee_id: string; status: string },
): boolean {
  if (!m || !(isLeadership(m) || inQuality(m))) return false;
  if (r.author_id === m.id) return false;
  if (r.committee_id === m.committee_id && !isLeadership(m)) return false;
  return r.status === "submitted" || r.status === "reviewed";
}

export const canWriteMonthly = (m: Member | null) => headsQuality(m);
export const canReadMonthly = (m: Member | null) => inQuality(m) || isLeadership(m);
