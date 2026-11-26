// UI-side mirror of the database rules (supabase/migrations/…_portal_functions.sql).
// The database is the authority — these only decide which buttons to show.
import type { Assignment, Board, Member, Role, Task } from "./types";

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

/** Committee lead/deputy create for their committee; leadership create for committee leads. */
export function canCreateTasks(m: Member | null): boolean {
  return isLeadership(m) || isCommitteeHead(m);
}

/** May see the statistics page (anyone who oversees someone else's hours). */
export function canSeeStats(m: Member | null): boolean {
  return isLeadership(m) || isCommitteeHead(m) || isTeamHead(m);
}

export function canReview(me: Member | null, task: Task, submitter: Member | undefined): boolean {
  if (!me || !submitter || me.id === submitter.id) return false;
  if (task.audience === "leaders") return isLeadership(me);
  if (me.is_admin) return true;
  if (headsCommittee(me, task.committee_id)) return true;
  return (
    isTeamHead(me) &&
    !!me.team_id &&
    me.team_id === submitter.team_id &&
    me.committee_id === task.committee_id
  );
}

export function canManageTask(me: Member | null, task: Task): boolean {
  if (!me) return false;
  if (me.is_admin || task.created_by === me.id) return true;
  if (task.audience === "leaders") return LEADERSHIP.includes(me.role);
  return headsCommittee(me, task.committee_id);
}

export function myAssignment(me: Member | null, task: Task): Assignment | undefined {
  return me ? task.assignments.find((a) => a.member_id === me.id) : undefined;
}

export function seatsLeft(task: Task): number {
  if (task.mode !== "open" || task.seats == null) return 0;
  return Math.max(0, task.seats - task.assignments.length);
}

export function canClaim(me: Member | null, task: Task, today: string): boolean {
  if (!me || task.mode !== "open" || task.status !== "active" || task.due_date < today)
    return false;
  if (task.created_by === me.id || myAssignment(me, task) || seatsLeft(task) === 0) return false;
  if (task.audience === "committee") return me.committee_id === task.committee_id;
  if (task.audience === "team") return !!me.team_id && me.team_id === task.team_id;
  if (task.audience === "leaders") return isCommitteeHead(me);
  return false;
}

/** May open the accounts page (invite people / send password links). */
export function canManageAccounts(m: Member | null): boolean {
  return isLeadership(m) || isCommitteeHead(m) || isTeamHead(m);
}

/** Mirror of SQL `can_manage_account`: leadership → all; committee heads → their committee;
 *  team heads → plain members of their team. */
export function canManageAccount(me: Member | null, t: Member): boolean {
  if (!me) return false;
  if (isLeadership(me)) return true;
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
