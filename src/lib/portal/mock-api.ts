// In-memory portal backend for local previews, screenshots and tests
// (VITE_PORTAL_MOCK=1). It follows the same rules as the database functions,
// using the shared helpers in ./permissions — the real authority stays in SQL.
import { structureCommittees, structurePeople, structureTeams } from "@/data/structure";
import {
  boardOf,
  canClaim,
  canReview,
  canViewHoursOf,
  headsCommittee,
  isCommitteeHead,
  isLeadership,
  isTeamHead,
  myAssignment,
  seatsLeft,
} from "./permissions";
import type {
  Assignment,
  Board,
  HourEntry,
  LeaderRow,
  Member,
  NewTask,
  PortalApi,
  PortalNotification,
  Structure,
  Task,
  Tier,
} from "./types";
import { PortalError } from "./errors";
import { addDays, todayISO } from "./dates";

const TIERS: Tier[] = [
  { id: "bronze", name: "برونزي", min_hours: 0 },
  { id: "silver", name: "فضي", min_hours: 20 },
  { id: "gold", name: "ذهبي", min_hours: 40 },
  { id: "platinum", name: "بلاتيني", min_hours: 70 },
  { id: "diamond", name: "ماسي", min_hours: 100 },
];
const SEMESTER = {
  name: "الفصل الدراسي الأول 1448",
  starts_on: "2026-08-23",
  ends_on: "2027-01-14",
};
export const MOCK_PASSWORD = "ethmar123";

/** Preview logins: e-mail → member name. */
export const MOCK_LOGINS: Record<string, string> = {
  "rose@ethmar.test": "روز العتيبي",
  "member@ethmar.test": "منى الروقي",
  "teamlead@ethmar.test": "فهد العقيل",
  "lead@ethmar.test": "الوليد الرشيد",
  "vp@ethmar.test": "غادة العتيبي",
};

/** Emails on file in the preview (member id → email). */
const MOCK_EMAILS: Record<string, string> = {};

const tierFor = (h: number) => [...TIERS].reverse().find((t) => h >= t.min_hours) ?? TIERS[0]!;
const nextTier = (h: number) => TIERS.find((t) => t.min_hours > h) ?? null;

interface State {
  members: Member[];
  tasks: Task[];
  hours: HourEntry[];
  notes: (PortalNotification & { member_id: string })[];
  uid: string | null;
}

function seed(): State {
  const members: Member[] = structurePeople.map((p, i) => ({
    id: `m${i + 1}`,
    full_name: p.name,
    committee_id: p.committee_id,
    team_id: p.team_id,
    role: p.role,
    title: p.title,
    extra_titles: p.extra_titles,
    member_code: `ETH-${1001 + i}`,
    is_admin: p.name === "روز العتيبي",
    must_change_password: false,
    has_account: Object.values(MOCK_LOGINS).includes(p.name) || i % 3 === 0,
  }));
  const by = (name: string) => members.find((m) => m.full_name === name)!.id;
  const today = todayISO();
  const t = (
    o: Partial<Task> &
      Pick<Task, "id" | "title" | "audience" | "mode" | "hours" | "due_date" | "created_by">,
  ): Task => ({
    description: "",
    committee_id: null,
    team_id: null,
    seats: null,
    status: "active",
    created_at: new Date().toISOString(),
    assignments: [],
    ...o,
  });
  const a = (
    task_id: string,
    member_id: string,
    status: Assignment["status"],
    extra: Partial<Assignment> = {},
  ): Assignment => ({
    task_id,
    member_id,
    status,
    assigned_by: null,
    claimed_at: new Date().toISOString(),
    note: null,
    link: null,
    submitted_at: null,
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    ...extra,
  });
  const lead = by("الوليد الرشيد");
  const tasks: Task[] = [
    t({
      id: "t1",
      title: "تنسيق زيارة تداول السعودية",
      audience: "team",
      committee_id: "pr",
      team_id: "pr-outreach",
      mode: "open",
      seats: 3,
      hours: 3,
      due_date: addDays(today, 1),
      created_by: lead,
      description:
        "التواصل مع الجهة المستضيفة وتأكيد الموعد وعدد الطلاب، ثم مشاركة جدول الزيارة مع اللجنة.",
      assignments: [
        a("t1", by("عبدالله الفليح"), "claimed"),
        a("t1", by("ياسر العمرو"), "submitted", {
          note: "تم التأكيد مع الجهة",
          submitted_at: new Date().toISOString(),
        }),
      ],
    }),
    t({
      id: "t2",
      title: "تجهيز معرض Impact by Ethmar",
      audience: "committee",
      committee_id: "pr",
      mode: "open",
      seats: 6,
      hours: 4,
      due_date: addDays(today, 6),
      created_by: lead,
      description: "مهمة جماعية للفريقين: استقبال الجهات المشاركة وتجهيز أركانها يوم المعرض.",
      assignments: [a("t2", by("يزيد الرويتع"), "claimed"), a("t2", by("رنا الفارس"), "claimed")],
    }),
    t({
      id: "t3",
      title: "قائمة احتياجات المعرض",
      audience: "team",
      committee_id: "pr",
      team_id: "pr-support",
      mode: "open",
      seats: 2,
      hours: 2,
      due_date: addDays(today, 3),
      created_by: lead,
      description: "حصر المستلزمات وتسعيرها ورفع القائمة للقائد.",
    }),
    t({
      id: "t4",
      title: "خطاب شكر لشركاء الفصل",
      audience: "people",
      committee_id: "pr",
      mode: "assigned",
      hours: 2,
      due_date: addDays(today, 9),
      created_by: lead,
      description: "صياغة خطاب شكر موحّد لشركاء النجاح.",
      assignments: [a("t4", by("منى الروقي"), "claimed", { assigned_by: lead })],
    }),
    t({
      id: "t5",
      title: "تحديث صفحة «مشاريعنا»",
      audience: "committee",
      committee_id: "tech",
      mode: "open",
      seats: 2,
      hours: 3,
      due_date: addDays(today, 4),
      created_by: by("عالية البليهي"),
      description: "إضافة مشاريع الفصل وتحديث الصور.",
      assignments: [],
    }),
    t({
      id: "t6",
      title: "خطة اللجنة للفصل القادم",
      audience: "leaders",
      mode: "assigned",
      hours: 5,
      due_date: addDays(today, 12),
      created_by: by("غادة العتيبي"),
      description: "خطة مختصرة بأهداف اللجنة ومشاريعها وعدد أعضائها المتوقع.",
      assignments: [
        a("t6", lead, "claimed", { assigned_by: by("غادة العتيبي") }),
        a("t6", by("عالية البليهي"), "claimed", { assigned_by: by("غادة العتيبي") }),
      ],
    }),
    t({
      id: "t7",
      title: "حصر الجهات المهتمة بالرعاية",
      audience: "team",
      committee_id: "pr",
      team_id: "pr-outreach",
      mode: "open",
      seats: 2,
      hours: 2,
      due_date: addDays(today, -6),
      created_by: lead,
      status: "active",
      assignments: [
        a("t7", by("منى الروقي"), "approved", {
          review_note: "شغل مرتب، يعطيك العافية",
          reviewed_by: by("فهد العقيل"),
        }),
      ],
    }),
  ];
  const hours: HourEntry[] = [];
  const add = (
    name: string,
    h: number,
    daysAgo: number,
    desc: string,
    task: string | null = null,
  ) =>
    hours.push({
      id: `h${hours.length + 1}`,
      member_id: by(name),
      task_id: task,
      hours: h,
      earned_on: addDays(today, -daysAgo),
      description: desc,
    });
  add("منى الروقي", 2, 5, "حصر الجهات المهتمة بالرعاية", "t7");
  add("منى الروقي", 12, 40, "تنظيم الجلسة الحوارية");
  add("منى الروقي", 9, 70, "سفراء إثمار — كلية الهندسة");
  [
    "عبدالله الفليح",
    "يزيد الرويتع",
    "رنا الفارس",
    "فارس العتيبي",
    "ريما العتيبي",
    "دماث اليمني",
    "آسيا النافع",
    "ليان الغامدي",
  ].forEach((n, i) => add(n, 4 + ((i * 7) % 11), 3 + i, "مهام الفصل"));
  [
    "فهد العقيل",
    "عبدالعزيز الدعفس",
    "الوليد الرشيد",
    "عالية البليهي",
    "روز العتيبي",
    "غيداء أبو حيد",
    "شادن الغنام",
  ].forEach((n, i) => add(n, 6 + ((i * 5) % 13), 2 + i, "مهام القيادة"));
  add("روز العتيبي", 30, 45, "بناء بوابة الأعضاء");
  return { members, tasks, hours, notes: [], uid: null };
}

// The preview keeps its data for the browser tab (sessionStorage), so a reload doesn't lose your clicks.
const STORE = "ethmar-mock-state-v1";
let state: State | null = null;
function s(): State {
  if (!state) {
    state = seed();
    try {
      const saved = sessionStorage.getItem(STORE);
      if (saved) Object.assign(state, JSON.parse(saved));
      state.uid = sessionStorage.getItem("ethmar-mock-uid");
    } catch {
      // no storage (tests / SSR)
    }
  }
  return state;
}
function save() {
  try {
    const { members, tasks, hours, notes } = s();
    sessionStorage.setItem(STORE, JSON.stringify({ members, tasks, hours, notes }));
  } catch {
    // ignore
  }
}
const listeners = new Set<(id: string | null) => void>();
const meOrThrow = (): Member => {
  const m = s().members.find((x) => x.id === s().uid);
  if (!m) throw new PortalError("not_a_member");
  return m;
};
const notify = (memberId: string, title: string, body: string, link: string) =>
  s().notes.unshift({
    id: `n${s().notes.length + 1}`,
    member_id: memberId,
    title,
    body,
    link,
    read_at: null,
    created_at: new Date().toISOString(),
  });
const pause = () => new Promise((r) => setTimeout(r, 120));

function canView(me: Member, t: Task): boolean {
  if (isLeadership(me) || t.created_by === me.id || myAssignment(me, t)) return true;
  if (t.audience === "committee") return t.committee_id === me.committee_id;
  if (t.audience === "team")
    return t.committee_id === me.committee_id && (t.team_id === me.team_id || isCommitteeHead(me));
  if (t.audience === "people")
    return (
      t.committee_id === me.committee_id &&
      (isCommitteeHead(me) ||
        (isTeamHead(me) &&
          t.assignments.some(
            (a) => s().members.find((m) => m.id === a.member_id)?.team_id === me.team_id,
          )))
    );
  return t.mode === "open" && isCommitteeHead(me);
}
const sumHours = (memberId: string, from: string, to: string) =>
  s()
    .hours.filter((h) => h.member_id === memberId && h.earned_on >= from && h.earned_on <= to)
    .reduce((n, h) => n + h.hours, 0);

export const mockApi: PortalApi = {
  async currentUserId() {
    return s().uid;
  },
  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async signIn(email, password) {
    await pause();
    const name = MOCK_LOGINS[email.trim().toLowerCase()];
    const m = s().members.find((x) => x.full_name === name);
    if (!m || password !== MOCK_PASSWORD) throw new PortalError("invalid_credentials");
    s().uid = m.id;
    try {
      sessionStorage.setItem("ethmar-mock-uid", m.id);
    } catch {
      // ignore
    }
    listeners.forEach((l) => l(m.id));
  },
  async signOut() {
    s().uid = null;
    try {
      sessionStorage.removeItem("ethmar-mock-uid");
    } catch {
      // ignore
    }
    listeners.forEach((l) => l(null));
  },
  async changePassword(password) {
    if (password.length < 8) throw new PortalError("weak_password");
    meOrThrow().must_change_password = false;
    save();
  },
  async me() {
    return s().members.find((x) => x.id === s().uid) ?? null;
  },
  async structure(): Promise<Structure> {
    return {
      committees: structureCommittees.map((c, i) => ({ ...c, sort: i })),
      teams: structureTeams.map((t, i) => ({ ...t, sort: i })),
      members: s().members,
    };
  },
  async memberTiers() {
    return Object.fromEntries(
      s().members.map((m) => {
        const t = tierFor(sumHours(m.id, SEMESTER.starts_on, SEMESTER.ends_on));
        return [m.id, { tier_id: t.id, tier_name: t.name }];
      }),
    );
  },
  async tasks() {
    await pause();
    const me = meOrThrow();
    return structuredClone(
      s()
        .tasks.filter((t) => canView(me, t))
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    );
  },
  async createTask(input: NewTask) {
    const me = meOrThrow();
    if (
      input.audience === "leaders"
        ? !isLeadership(me)
        : !(me.is_admin || headsCommittee(me, input.committee_id))
    )
      throw new PortalError("forbidden");
    if (input.due_date < todayISO()) throw new PortalError("due_in_past");
    const id = `t${s().tasks.length + 100}`;
    const mode = input.audience === "people" ? "assigned" : input.mode;
    const task: Task = {
      id,
      title: input.title.trim(),
      description: input.description.trim(),
      audience: input.audience,
      committee_id: input.audience === "leaders" ? null : input.committee_id,
      team_id: input.audience === "team" ? input.team_id : null,
      mode,
      seats: mode === "open" ? input.seats : null,
      hours: input.hours,
      due_date: input.due_date,
      status: "active",
      created_by: me.id,
      created_at: new Date().toISOString(),
      assignments:
        mode === "assigned"
          ? input.targets.map((m) => ({
              task_id: id,
              member_id: m,
              status: "claimed" as const,
              assigned_by: me.id,
              claimed_at: new Date().toISOString(),
              note: null,
              link: null,
              submitted_at: null,
              review_note: null,
              reviewed_by: null,
              reviewed_at: null,
            }))
          : [],
    };
    s().tasks.push(task);
    task.assignments.forEach((x) =>
      notify(x.member_id, "أُسندت لك مهمة جديدة", task.title, `/portal/tasks?task=${id}`),
    );
    save();
    return id;
  },
  async claimTask(taskId) {
    await pause();
    const me = meOrThrow();
    const t = s().tasks.find((x) => x.id === taskId);
    if (!t || !canView(me, t)) throw new PortalError("not_found");
    if (myAssignment(me, t)) throw new PortalError("already_claimed");
    if (seatsLeft(t) === 0) throw new PortalError("no_seats");
    if (!canClaim(me, t, todayISO())) throw new PortalError("forbidden");
    t.assignments.push({
      task_id: taskId,
      member_id: me.id,
      status: "claimed",
      assigned_by: null,
      claimed_at: new Date().toISOString(),
      note: null,
      link: null,
      submitted_at: null,
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
    });
    save();
  },
  async unclaimTask(taskId) {
    const me = meOrThrow();
    const t = s().tasks.find((x) => x.id === taskId);
    const mine = t && myAssignment(me, t);
    if (!t || !mine || mine.status !== "claimed" || mine.assigned_by)
      throw new PortalError("cannot_unclaim");
    t.assignments = t.assignments.filter((x) => x !== mine);
    save();
  },
  async submitTask(taskId, note, link) {
    await pause();
    const me = meOrThrow();
    const t = s().tasks.find((x) => x.id === taskId);
    const mine = t && myAssignment(me, t);
    if (!t || !mine || !["claimed", "returned"].includes(mine.status))
      throw new PortalError("cannot_submit");
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) throw new PortalError("invalid_link");
    Object.assign(mine, {
      status: "submitted",
      note: note.trim() || null,
      link: link.trim() || null,
      submitted_at: new Date().toISOString(),
      review_note: null,
    });
    save();
  },
  async reviewTask(taskId, memberId, approve, note) {
    await pause();
    const me = meOrThrow();
    const t = s().tasks.find((x) => x.id === taskId)!;
    const sub = s().members.find((m) => m.id === memberId);
    if (!canReview(me, t, sub)) throw new PortalError("forbidden");
    const as = t.assignments.find((x) => x.member_id === memberId);
    if (!as || as.status !== "submitted") throw new PortalError("not_submitted");
    if (!approve && !note.trim()) throw new PortalError("note_required");
    Object.assign(as, {
      status: approve ? "approved" : "returned",
      review_note: note.trim() || null,
      reviewed_by: me.id,
      reviewed_at: new Date().toISOString(),
    });
    if (approve) {
      s().hours.push({
        id: `h${s().hours.length + 1}`,
        member_id: memberId,
        task_id: taskId,
        hours: t.hours,
        earned_on: todayISO(),
        description: t.title,
      });
      notify(
        memberId,
        "اعتُمدت مهمتك",
        `+${t.hours} ساعات · ${t.title}`,
        `/portal/tasks?task=${taskId}`,
      );
    } else notify(memberId, "رجعت لك مهمة للتعديل", t.title, `/portal/tasks?task=${taskId}`);
    save();
  },
  async setTaskStatus(taskId, status) {
    const t = s().tasks.find((x) => x.id === taskId);
    if (t) t.status = status;
    save();
  },
  async summary() {
    const me = meOrThrow();
    const today = todayISO();
    const monthStart = today.slice(0, 8) + "01";
    const sem = sumHours(me.id, SEMESTER.starts_on, SEMESTER.ends_on);
    const board = boardOf(me.role);
    const rank = board
      ? ((await this.leaderboard(board, monthStart, today)).find((r) => r.is_me)?.rank ?? null)
      : null;
    return {
      semester: SEMESTER,
      semester_hours: sem,
      total_hours: sumHours(me.id, "2000-01-01", "2999-01-01"),
      month_hours: sumHours(me.id, monthStart, today),
      pending_hours: s()
        .tasks.filter((t) => myAssignment(me, t)?.status === "submitted")
        .reduce((n, t) => n + t.hours, 0),
      completed_tasks: s().tasks.filter((t) => myAssignment(me, t)?.status === "approved").length,
      tier: tierFor(sem),
      next_tier: nextTier(sem),
      board,
      month_rank: rank,
      board_size: board ? s().members.filter((m) => boardOf(m.role) === board).length : null,
    };
  },
  async leaderboard(board: Board, from, to): Promise<LeaderRow[]> {
    const me = meOrThrow();
    const rows = s()
      .members.filter((m) => boardOf(m.role) === board)
      .map((m) => ({
        m,
        h: sumHours(m.id, from, to),
        sem: sumHours(m.id, SEMESTER.starts_on, SEMESTER.ends_on),
      }))
      .sort((a, b) => b.h - a.h || a.m.full_name.localeCompare(b.m.full_name, "ar"));
    return rows.map((r) => {
      const tier = tierFor(r.sem);
      return {
        rank: 1 + rows.filter((x) => x.h > r.h).length,
        member_id: r.m.id,
        full_name: r.m.full_name,
        committee_title: structureCommittees.find((c) => c.id === r.m.committee_id)?.title ?? null,
        team_name: structureTeams.find((t) => t.id === r.m.team_id)?.name ?? null,
        title: r.m.title,
        tier_id: tier.id,
        tier_name: tier.name,
        hours: r.m.id === me.id ? r.h : null,
        is_me: r.m.id === me.id,
      };
    });
  },
  async myHours() {
    const me = meOrThrow();
    return s()
      .hours.filter((h) => h.member_id === me.id)
      .sort((a, b) => b.earned_on.localeCompare(a.earned_on));
  },
  async memberStats(from, to) {
    const me = meOrThrow();
    return s()
      .members.filter((m) => m.id !== me.id && canViewHoursOf(me, m))
      .map((m) => {
        const mine = s()
          .tasks.map((t) => t.assignments.find((x) => x.member_id === m.id))
          .filter(Boolean) as Assignment[];
        const sem = sumHours(m.id, SEMESTER.starts_on, SEMESTER.ends_on);
        return {
          member_id: m.id,
          full_name: m.full_name,
          committee_id: m.committee_id,
          team_id: m.team_id,
          role: m.role,
          title: m.title,
          period_hours: sumHours(m.id, from, to),
          semester_hours: sem,
          active_tasks: mine.filter((x) => x.status === "claimed" || x.status === "returned")
            .length,
          awaiting_review: mine.filter((x) => x.status === "submitted").length,
          approved_tasks: mine.filter((x) => x.status === "approved").length,
          tier_name: tierFor(sem).name,
        };
      });
  },
  async notifications() {
    const me = meOrThrow();
    const mine = s().notes.filter((n) => n.member_id === me.id);
    if (mine.length === 0)
      return [
        {
          id: "welcome",
          title: "حياك الله في بوابة إثمار",
          body: "هنا تلقى مهامك وساعاتك وترتيبك",
          link: "/portal",
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ];
    return mine;
  },
  async markNotificationsRead(ids) {
    const me = meOrThrow();
    s()
      .notes.filter((n) => n.member_id === me.id && (!ids || ids.includes(n.id)))
      .forEach((n) => (n.read_at = new Date().toISOString()));
    save();
  },
  async memberEmails() {
    const me = meOrThrow();
    if (!isLeadership(me)) return {};
    for (const [email, name] of Object.entries(MOCK_LOGINS)) {
      const id = s().members.find((m) => m.full_name === name)!.id;
      MOCK_EMAILS[id] ??= email;
    }
    return { ...MOCK_EMAILS };
  },
  async inviteMember(memberId, email) {
    if (!isLeadership(meOrThrow())) throw new PortalError("forbidden");
    const m = s().members.find((x) => x.id === memberId)!;
    const to = (email ?? MOCK_EMAILS[memberId] ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new PortalError("invalid_email");
    MOCK_EMAILS[memberId] = to;
    m.has_account = true;
    save();
    return { emailed: true, email: to };
  },
  async resetPassword(memberId) {
    if (!isLeadership(meOrThrow())) throw new PortalError("forbidden");
    return { emailed: true, email: MOCK_EMAILS[memberId] ?? "" };
  },
  async verifyLink() {
    throw new PortalError("link_expired");
  },
  async notifyTask() {
    return { sent: 0 };
  },
};

/** Test helper: start from a fresh seed. */
export function resetMock() {
  state = null;
  try {
    sessionStorage.removeItem(STORE);
  } catch {
    // ignore
  }
}
