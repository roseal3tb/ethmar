// In-memory portal backend for local previews, screenshots and tests
// (VITE_PORTAL_MOCK=1). It follows the same rules as the database functions,
// using the shared helpers in ./permissions — the real authority stays in SQL.
import { structureCommittees, structurePeople, structureTeams } from "@/data/structure";
import {
  boardOf,
  canClaim,
  canCreateSurveys,
  canManageAccount,
  canManageProject,
  canManageSurvey,
  canManageTask,
  canReview,
  canRunProjects,
  hasCap,
  canViewHoursOf,
  headsCommittee,
  isCommitteeHead,
  isLeadership,
  isTeamHead,
  myAssignment,
  seatsLeft,
  canReviewReport,
  canViewCommitteeReports,
  headsQuality,
  inQuality,
} from "./permissions";
import type {
  CommitteeReport,
  MonthlyReport,
  Achievement,
  Answers,
  Assignment,
  Board,
  Certificate,
  HourEntry,
  HourImport,
  LeaderRow,
  Me,
  Member,
  NewTask,
  PortalApi,
  PortalNotification,
  Project,
  Semester,
  Structure,
  Survey,
  Task,
  TaskComment,
  Tier,
} from "./types";
import { PortalError } from "./errors";
import { addDays, monthStart, todayISO, weekStart } from "./dates";

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
  "project@ethmar.test": "هالة الطخيم",
  "quality@ethmar.test": "يارا الحميدان",
  "qmember@ethmar.test": "آسيا النافع",
};

/** Emails on file in the preview (member id → email). */
const MOCK_EMAILS: Record<string, string> = {};

const tierFor = (h: number) => [...TIERS].reverse().find((t) => h >= t.min_hours) ?? TIERS[0]!;
const nextTier = (h: number) => TIERS.find((t) => t.min_hours > h) ?? null;

interface State {
  members: Member[];
  inactive: Member[];
  tasks: Task[];
  hours: (HourEntry & { import_id?: string | null })[];
  notes: (PortalNotification & { member_id: string })[];
  comments: TaskComment[];
  projects: Project[];
  surveys: Survey[];
  responses: {
    survey_id: string;
    member_id: string;
    answers: Answers;
    submitted_at: string | null;
  }[];
  certificates: (Certificate & { member_id: string })[];
  semesters: Semester[];
  imports: HourImport[];
  reports: CommitteeReport[];
  monthly: MonthlyReport[];
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
    capabilities: [],
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
    project_id: null,
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
    files: [],
    extra_hours: null,
    extra_reason: null,
    extra_status: null,
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
        "التواصل مع الجهة المستضيفة وتأكيد الموعد وعدد الطلاب، ثم مشاركة جدول الزيارة مع اللجنة",
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
      description: "مهمة جماعية للفريقين: استقبال الجهات المشاركة وتجهيز أركانها يوم المعرض",
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
      description: "حصر المستلزمات وتسعيرها ورفع القائمة للقائد",
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
      description: "صياغة خطاب شكر موحّد لشركاء النجاح",
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
      description: "إضافة مشاريع الفصل وتحديث الصور",
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
      description: "خطة مختصرة بأهداف اللجنة ومشاريعها وعدد أعضائها المتوقع",
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

  const P = (
    id: string,
    name: string,
    tagline: string,
    stage: Project["stage"],
    leads: string[],
    team: string[],
    extra: Partial<Project> = {},
  ): Project => ({
    id,
    slug: id,
    name,
    tagline,
    situation: "",
    problem: "",
    goal: "",
    success: "",
    location: "",
    stage,
    starts_on: null,
    ends_on: null,
    sort: 0,
    members: [
      ...leads.map((n) => ({ member_id: by(n), is_lead: true })),
      ...team.map((n) => ({ member_id: by(n), is_lead: false })),
    ],
    log: [
      {
        stage: "planning",
        note: null,
        changed_by: null,
        changed_at: addDays(today, -40) + "T10:00:00Z",
      },
    ],
    ...extra,
  });
  const projects: Project[] = [
    P(
      "impact",
      "Impact by Ethmar",
      "المعرض الرئيسي للمبادرة",
      "execution",
      ["هالة الطخيم"],
      ["منى الروقي", "فهد العقيل", "يزيد الرويتع"],
      {
        location: "كافد المالية",
        situation: "المعرض يجمع الطلاب بالجهات المالية، والتجهيز يحتاج تنسيق بين أكثر من لجنة",
        problem: "التنسيق مع الجهات والمتطوعين يصير بالرسائل المتفرقة، وتضيع المتابعة",
        goal: "معرض فيه 20 جهة و800 زائر، بجدول واضح لكل فريق",
        success:
          "كل جهة مؤكدة قبل المعرض بأسبوعين\nكل متطوع يعرف مكانه ووقته\nاستبيان رضا بعد المعرض فوق 85٪",
        log: [
          {
            stage: "planning",
            note: null,
            changed_by: null,
            changed_at: addDays(today, -40) + "T10:00:00Z",
          },
          {
            stage: "prep",
            note: "اعتمدنا المكان",
            changed_by: null,
            changed_at: addDays(today, -25) + "T10:00:00Z",
          },
          {
            stage: "execution",
            note: "بدأ التواصل مع الجهات",
            changed_by: null,
            changed_at: addDays(today, -8) + "T10:00:00Z",
          },
        ],
      },
    ),
    P(
      "ambassadors",
      "سفراء إثمار",
      "البرنامج التوعوي الرئيسي للمبادرة",
      "prep",
      ["جود الطريسي"],
      ["ريما العتيبي"],
    ),
    P(
      "fintech",
      "Road to FinTech",
      "رحلة إلى منظومة التقنية المالية",
      "planning",
      ["إبراهيم الموسى"],
      [],
    ),
    P(
      "sessions",
      "الجلسات الحوارية",
      "لقاءات مع خبراء وقادة القطاع",
      "review",
      ["حسان البليهد"],
      [],
    ),
    P(
      "visits",
      "الزيارات الإثرائية",
      "زيارات ميدانية لبيئات العمل الحقيقية",
      "done",
      ["طلال القزلان"],
      [],
    ),
  ].map((p, i) => ({ ...p, sort: i + 1 }));
  tasks.push(
    t({
      id: "tp1",
      title: "تأكيد حضور الجهات المشاركة",
      description: "تواصل مع الجهات في القائمة وأكّد حضورها وعدد ممثليها",
      audience: "project",
      project_id: "impact",
      mode: "open",
      seats: 3,
      hours: 4,
      due_date: addDays(today, 5),
      created_by: by("هالة الطخيم"),
    }),
  );
  const surveys: Survey[] = [
    {
      id: "s1",
      title: "رأيك في الفصل الأول",
      description: "خمس دقائق تساعدنا نطوّر تجربة الأعضاء",
      audience: "all",
      committee_id: null,
      project_id: null,
      questions: [
        { id: "q1", type: "rating", title: "كم تقيّم تجربتك في المبادرة؟", required: true },
        {
          id: "q2",
          type: "single",
          title: "وش أكثر شي استفدت منه؟",
          options: ["المهام", "الفعاليات", "العلاقات", "التطوير الشخصي"],
          required: true,
        },
        {
          id: "q3",
          type: "multi",
          title: "وش تبي نضيف الفصل الجاي؟",
          options: ["ورش عمل", "زيارات", "مسابقات", "لقاءات اجتماعية"],
        },
        { id: "q4", type: "long", title: "اقتراح أو ملاحظة" },
      ],
      anonymous: true,
      deadline: addDays(today, 6) + "T20:59:00Z",
      status: "open",
      created_by: by("غادة العتيبي"),
      created_at: addDays(today, -1) + "T09:00:00Z",
    },
  ];
  const semesters: Semester[] = [{ id: 1, ...SEMESTER }];
  return {
    members,
    inactive: [],
    tasks,
    hours,
    notes: [],
    comments: [
      {
        id: "c1",
        task_id: "t1",
        member_id: by("فهد العقيل"),
        body: "اللي يسحبها ينسق معي قبل الاتصال",
        created_at: addDays(today, -1) + "T12:00:00Z",
        reactions: [{ emoji: "👍", member_id: by("منى الروقي") }],
      },
    ],
    projects,
    surveys,
    responses: [],
    certificates: [],
    semesters,
    imports: [],
    reports: seedReports(members),
    monthly: [],
    uid: null,
  };
}

/** Last week: PR sent and reviewed, media sent and waiting, finance still a draft. */
function seedReports(members: Member[]): CommitteeReport[] {
  const by = (name: string) => members.find((m) => m.full_name === name)?.id ?? "m1";
  const last = addDays(weekStart(todayISO()), -7);
  const evals = (committee: string, author: string) =>
    members
      .filter((m) => m.committee_id === committee && m.id !== author)
      .slice(0, 8)
      .map((m, i) => ({ member_id: m.id, score: 3 + (i % 3), standout: i === 1, note: "" }));
  const base = {
    link: "",
    reviewed_by: null as string | null,
    reviewed_at: null as string | null,
    quality_score: null as number | null,
    quality_note: "",
    updated_at: new Date().toISOString(),
  };
  const walid = by("الوليد الرشيد");
  const nouf = by("نوف بن حثلين");
  const sultan = by("سلطان المتعب");
  return [
    {
      ...base,
      id: "r1",
      committee_id: "pr",
      week_start: last,
      author_id: walid,
      status: "reviewed",
      done: "تواصلنا مع 6 جهات للزيارات، وأكدنا موعد زيارة تداول السعودية",
      next_plan: "تجهيز خطابات الزيارات الجاية ومتابعة الردود",
      challenges: "تأخر رد جهتين",
      support: "",
      self_score: 4,
      submitted_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      reviewed_by: by("يارا الحميدان"),
      reviewed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      quality_score: 4,
      quality_note: "تقرير واضح، نبي أرقام الجهات المتجاوبة الأسبوع الجاي",
      evaluations: evals("pr", walid),
    },
    {
      ...base,
      id: "r2",
      committee_id: "media",
      week_start: last,
      author_id: nouf,
      status: "submitted",
      done: "صممنا 4 منشورات للحملة، وغطّينا ورشة الميزانية بالصور",
      next_plan: "فيديو قصير عن المبادرة",
      challenges: "",
      support: "نحتاج كاميرا ثانية للفعاليات الكبيرة",
      self_score: 5,
      submitted_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      evaluations: evals("media", nouf),
    },
    {
      ...base,
      id: "r3",
      committee_id: "fin",
      week_start: last,
      author_id: sultan,
      status: "draft",
      done: "مراجعة محتوى",
      next_plan: "",
      challenges: "",
      support: "",
      self_score: null,
      submitted_at: null,
      evaluations: [],
    },
  ];
}

// The preview keeps its data for the browser tab (sessionStorage), so a reload doesn't lose your clicks.
const STORE = "ethmar-mock-state-v4";
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
    const { uid: _uid, ...rest } = s();
    void _uid;
    sessionStorage.setItem(STORE, JSON.stringify(rest));
  } catch {
    // ignore
  }
}
const listeners = new Set<(id: string | null) => void>();
const asMe = (m: Member): Me => ({
  ...m,
  project_ids: s()
    .projects.filter((p) => p.members.some((x) => x.member_id === m.id))
    .map((p) => p.id),
  led_project_ids: s()
    .projects.filter((p) => p.members.some((x) => x.member_id === m.id && x.is_lead))
    .map((p) => p.id),
});
const meOrThrow = (): Me => {
  const m = s().members.find((x) => x.id === s().uid);
  if (!m) throw new PortalError("not_a_member");
  return asMe(m);
};
const memberRaw = () => s().members.find((x) => x.id === s().uid)!;
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
  if (t.audience === "project")
    return (
      (me as Me).project_ids.includes(t.project_id ?? "") || canManageProject(me, t.project_id)
    );
  return t.mode === "open" && isCommitteeHead(me);
}
const blankAssignment = (
  task_id: string,
  member_id: string,
  assigned_by: string | null,
): Assignment => ({
  task_id,
  member_id,
  status: "claimed",
  assigned_by,
  claimed_at: new Date().toISOString(),
  note: null,
  link: null,
  submitted_at: null,
  review_note: null,
  reviewed_by: null,
  reviewed_at: null,
  files: [],
  extra_hours: null,
  extra_reason: null,
  extra_status: null,
});
const surveyAudience = (sv: Survey) =>
  s().members.filter(
    (m) =>
      sv.audience === "all" ||
      (sv.audience === "committee" && m.committee_id === sv.committee_id) ||
      (sv.audience === "leaders" && m.role !== "member") ||
      (sv.audience === "project" &&
        !!s()
          .projects.find((p) => p.id === sv.project_id)
          ?.members.some((x) => x.member_id === m.id)),
  );
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
    memberRaw().must_change_password = false;
    save();
  },
  async me() {
    const m = s().members.find((x) => x.id === s().uid);
    return m ? asMe(m) : null;
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
        : input.audience === "project"
          ? !canManageProject(me, input.project_id ?? null)
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
      committee_id:
        input.audience === "leaders" || input.audience === "project" ? null : input.committee_id,
      team_id: input.audience === "team" ? input.team_id : null,
      project_id: input.project_id ?? null,
      mode,
      seats: mode === "open" ? input.seats : null,
      hours: input.hours,
      due_date: input.due_date,
      status: "active",
      created_by: me.id,
      created_at: new Date().toISOString(),
      assignments:
        mode === "assigned" ? input.targets.map((m) => blankAssignment(id, m, me.id)) : [],
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
    t.assignments.push(blankAssignment(taskId, me.id, null));
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
  async submitTask(taskId, { note, link, files, extra }) {
    await pause();
    const me = meOrThrow();
    const t = s().tasks.find((x) => x.id === taskId);
    const mine = t && myAssignment(me, t);
    if (t?.status === "cancelled") throw new PortalError("task_closed");
    if (!t || !mine || !["claimed", "returned"].includes(mine.status))
      throw new PortalError("cannot_submit");
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) throw new PortalError("invalid_link");
    if (extra && (!(extra.hours > 0 && extra.hours <= 50) || !extra.reason.trim()))
      throw new PortalError("invalid_extra");
    Object.assign(mine, {
      status: "submitted",
      note: note.trim() || null,
      link: link.trim() || null,
      files,
      submitted_at: new Date().toISOString(),
      review_note: null,
      extra_hours: extra ? extra.hours : null,
      extra_reason: extra ? extra.reason.trim() : null,
      extra_status: extra ? "pending" : null,
    });
    save();
  },
  async reviewTask(taskId, memberId, approve, note, extraOk) {
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
      const bonus = as.extra_status === "pending" && extraOk ? (as.extra_hours ?? 0) : 0;
      if (as.extra_status === "pending") as.extra_status = extraOk ? "approved" : "declined";
      s().hours.push({
        id: `h${s().hours.length + 1}`,
        member_id: memberId,
        task_id: taskId,
        hours: t.hours + bonus,
        earned_on: todayISO(),
        description: t.title,
      });
      notify(
        memberId,
        "اعتُمدت مهمتك",
        `+${t.hours + bonus} ساعات · ${t.title}`,
        `/portal/tasks?task=${taskId}`,
      );
    } else notify(memberId, "رجعت لك مهمة للتعديل", t.title, `/portal/tasks?task=${taskId}`);
    save();
  },
  async setTaskStatus(taskId, status) {
    const t = s().tasks.find((x) => x.id === taskId);
    if (!t || !canManageTask(meOrThrow(), t)) throw new PortalError("forbidden");
    t.status = status;
    save();
  },
  async uploadTaskFile(taskId, file) {
    const me = meOrThrow();
    if (file.size > 10 * 1024 * 1024) throw new PortalError("file_too_big");
    return {
      path: `${taskId}/${me.id}/${Date.now().toString(36)}-${file.name}`,
      name: file.name,
      size: file.size,
    };
  },
  async fileUrl(path) {
    return `data:text/plain;charset=utf-8,${encodeURIComponent("ملف تجريبي: " + path)}`;
  },
  async comments(taskId) {
    const me = meOrThrow();
    const t = s().tasks.find((x) => x.id === taskId);
    if (!t || !canView(me, t)) return [];
    return structuredClone(s().comments.filter((c) => c.task_id === taskId));
  },
  async addComment(taskId, body) {
    await pause();
    const me = meOrThrow();
    const t = s().tasks.find((x) => x.id === taskId);
    if (!t || !canView(me, t)) throw new PortalError("not_found");
    if (!body.trim() || body.trim().length > 1000) throw new PortalError("invalid_comment");
    s().comments.push({
      id: `c${Date.now()}`,
      task_id: taskId,
      member_id: me.id,
      body: body.trim(),
      created_at: new Date().toISOString(),
      reactions: [],
    });
    const to = new Set([t.created_by, ...t.assignments.map((a) => a.member_id)]);
    to.delete(me.id);
    to.forEach((id) =>
      notify(
        id,
        "تعليق جديد على مهمة",
        `${me.full_name}: ${body.trim().slice(0, 90)}`,
        `/portal/tasks?task=${taskId}`,
      ),
    );
    save();
  },
  async deleteComment(commentId) {
    const me = meOrThrow();
    const c = s().comments.find((x) => x.id === commentId);
    const t = c && s().tasks.find((x) => x.id === c.task_id);
    if (!c || !t) throw new PortalError("not_found");
    if (!(c.member_id === me.id || t.created_by === me.id || isLeadership(me)))
      throw new PortalError("forbidden");
    s().comments = s().comments.filter((x) => x.id !== commentId);
    save();
  },
  async toggleReaction(commentId, emoji) {
    const me = meOrThrow();
    const c = s().comments.find((x) => x.id === commentId);
    if (!c) throw new PortalError("not_found");
    const i = c.reactions.findIndex((r) => r.member_id === me.id && r.emoji === emoji);
    if (i >= 0) c.reactions.splice(i, 1);
    else c.reactions.push({ emoji, member_id: me.id });
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
      .members.map((m, order) => ({ m, order }))
      .filter(({ m }) => boardOf(m.role) === board)
      .map(({ m, order }) => ({
        m,
        order,
        h: sumHours(m.id, from, to),
        sem: sumHours(m.id, SEMESTER.starts_on, SEMESTER.ends_on),
      }))
      // One person per place, like the database: ties go to semester hours, then roster order.
      .sort((a, b) => b.h - a.h || b.sem - a.sem || a.order - b.order);
    return rows.map((r, i) => {
      const tier = tierFor(r.sem);
      return {
        rank: r.h > 0 ? i + 1 : null,
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
    for (const [email, name] of Object.entries(MOCK_LOGINS)) {
      const id = s().members.find((m) => m.full_name === name)!.id;
      MOCK_EMAILS[id] ??= email;
    }
    return Object.fromEntries(
      Object.entries(MOCK_EMAILS).filter(([id]) => {
        const t = s().members.find((m) => m.id === id);
        return id === me.id || (!!t && canManageAccount(me, t));
      }),
    );
  },
  async inviteMember(memberId, email) {
    const m = s().members.find((x) => x.id === memberId);
    if (!m || !canManageAccount(meOrThrow(), m)) throw new PortalError("forbidden");
    const to = (email || MOCK_EMAILS[memberId] || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new PortalError("invalid_email");
    if (m.has_account && MOCK_EMAILS[memberId] && MOCK_EMAILS[memberId] !== to)
      throw new PortalError("email_locked");
    MOCK_EMAILS[memberId] = to;
    m.has_account = true;
    save();
    return { emailed: true, email: to };
  },
  async resetPassword(memberId) {
    const m = s().members.find((x) => x.id === memberId);
    if (!m || !canManageAccount(meOrThrow(), m)) throw new PortalError("forbidden");
    return { emailed: true, email: MOCK_EMAILS[memberId] ?? "" };
  },
  async verifyLink() {
    throw new PortalError("link_expired");
  },
  async notifyTask() {
    return { sent: 0 };
  },

  async requestPasswordHelp(email) {
    await pause();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) throw new PortalError("invalid_email");
  },
  async changeOwnPassword(current, next) {
    await pause();
    if (current !== MOCK_PASSWORD) throw new PortalError("wrong_password");
    if (next.length < 8) throw new PortalError("weak_password");
    if (next === current) throw new PortalError("same_password");
  },

  async achievements() {
    const me = meOrThrow();
    const total = sumHours(me.id, "2000-01-01", "2999-01-01");
    const mine = s()
      .tasks.map((t) => ({ t, a: t.assignments.find((x) => x.member_id === me.id) }))
      .filter((x) => x.a);
    const done = mine.filter((x) => x.a!.status === "approved");
    const ontime = done.filter(
      (x) => (x.a!.submitted_at ?? x.t.due_date).slice(0, 10) <= x.t.due_date,
    );
    const voice = s().responses.find((r) => r.member_id === me.id && r.submitted_at);
    const A = (
      id: string,
      progress: number,
      goal: number,
      at: string | null = null,
    ): Achievement => ({
      id,
      unlocked: progress >= goal,
      unlocked_at: progress >= goal ? at : null,
      progress: Math.min(progress, goal),
      goal,
    });
    return [
      A("seed", 1, 1, addDays(todayISO(), -60) + "T09:00:00Z"),
      A("sprout", mine.length ? 1 : 0, 1, mine[0]?.a?.claimed_at ?? null),
      A("first_fruit", done.length ? 1 : 0, 1, done[0]?.a?.reviewed_at ?? null),
      A("roots", total, 10),
      A("basket", done.length, 5),
      A("on_time", ontime.length, 5),
      A("voice", voice ? 1 : 0, 1, voice?.submitted_at ?? null),
      A("trunk", total, 50),
      A("star", me.full_name === "روز العتيبي" ? 1 : 0, 1, addDays(todayISO(), -30) + "T09:00:00Z"),
      A("orchard", done.length, 25),
      A("tree", total, 100),
      A("leader", me.role !== "member" ? 1 : 0, 1),
    ];
  },
  async semesters() {
    return structuredClone(s().semesters).sort((a, b) => b.starts_on.localeCompare(a.starts_on));
  },
  async saveSemester(x) {
    if (!hasCap(meOrThrow(), "hours")) throw new PortalError("forbidden");
    if (x.name.trim().length < 3 || x.ends_on <= x.starts_on)
      throw new PortalError("invalid_semester");
    if (
      s().semesters.some(
        (o) => o.id !== x.id && o.starts_on <= x.ends_on && x.starts_on <= o.ends_on,
      )
    )
      throw new PortalError("semester_overlap");
    if (x.id == null) {
      const id = Math.max(0, ...s().semesters.map((o) => o.id)) + 1;
      s().semesters.push({ ...x, id });
      save();
      return id;
    }
    Object.assign(
      s().semesters.find((o) => o.id === x.id)!,
      x,
    );
    save();
    return x.id;
  },
  async myCertificates() {
    const me = meOrThrow();
    return structuredClone(s().certificates.filter((c) => c.member_id === me.id)).reverse();
  },
  async issueCertificate(semesterId) {
    await pause();
    const me = meOrThrow();
    const sem = s().semesters.find((x) => x.id === semesterId);
    const hours = sem
      ? sumHours(me.id, sem.starts_on, sem.ends_on)
      : sumHours(me.id, "2000-01-01", "2999-01-01");
    if (hours <= 0) throw new PortalError("no_hours");
    const same = s().certificates.find(
      (c) =>
        c.member_id === me.id && c.semester_id === semesterId && !c.revoked_at && c.hours === hours,
    );
    if (same) return same.code;
    s()
      .certificates.filter(
        (c) => c.member_id === me.id && c.semester_id === semesterId && !c.revoked_at,
      )
      .forEach((c) => (c.revoked_at = new Date().toISOString()));
    const code = Math.random().toString(16).slice(2, 12).toUpperCase().padEnd(10, "0");
    s().certificates.push({
      id: code,
      code,
      member_id: me.id,
      semester_id: semesterId,
      period_label: sem?.name ?? "منذ الانضمام",
      hours,
      tasks: s().tasks.filter((t) => myAssignment(me, t)?.status === "approved").length,
      issued_at: new Date().toISOString(),
      revoked_at: null,
    });
    save();
    return code;
  },
  async verifyCertificate(code) {
    const c = s().certificates.find(
      (x) => x.code === code.replace(/[^0-9a-z]/gi, "").toUpperCase(),
    );
    if (!c) return { found: false };
    const m = s().members.find((x) => x.id === c.member_id)!;
    return {
      found: true,
      valid: !c.revoked_at,
      superseded: !!c.revoked_at,
      code: c.code,
      name: m.full_name,
      committee:
        structureCommittees.find((x) => x.id === m.committee_id)?.title ?? "قيادة المبادرة",
      title: m.title,
      period: c.period_label,
      hours: c.hours,
      tasks: c.tasks,
      issued_at: c.issued_at,
    };
  },

  async projects() {
    meOrThrow();
    return structuredClone(s().projects).sort((a, b) => a.sort - b.sort);
  },
  async createProject(name, tagline) {
    const me = meOrThrow();
    if (!canRunProjects(me)) throw new PortalError("forbidden");
    if (name.trim().length < 2) throw new PortalError("invalid_name");
    const id = `p${Date.now().toString(36)}`;
    s().projects.push({
      id,
      slug: id,
      name: name.trim(),
      tagline: tagline.trim(),
      situation: "",
      problem: "",
      goal: "",
      success: "",
      location: "",
      stage: "planning",
      starts_on: null,
      ends_on: null,
      sort: s().projects.length + 1,
      members: [],
      log: [
        { stage: "planning", note: null, changed_by: me.id, changed_at: new Date().toISOString() },
      ],
    });
    save();
    return id;
  },
  async updateProject(id, fields) {
    const p = s().projects.find((x) => x.id === id);
    if (!p || !canManageProject(meOrThrow(), id)) throw new PortalError("forbidden");
    Object.assign(p, Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)));
    save();
  },
  async setProjectStage(id, stage, note) {
    const me = meOrThrow();
    const p = s().projects.find((x) => x.id === id);
    if (!p || !canManageProject(me, id)) throw new PortalError("forbidden");
    if (p.stage === stage) return;
    p.stage = stage;
    p.log.push({
      stage,
      note: note.trim() || null,
      changed_by: me.id,
      changed_at: new Date().toISOString(),
    });
    p.members
      .filter((x) => x.member_id !== me.id)
      .forEach((x) =>
        notify(x.member_id, `${p.name} انتقل لمرحلة جديدة`, note, `/portal/projects/${p.id}`),
      );
    save();
  },
  async setProjectTeam(id, members, leads) {
    const me = meOrThrow();
    const p = s().projects.find((x) => x.id === id);
    if (!p || !canManageProject(me, id)) throw new PortalError("forbidden");
    const keepLeads =
      canRunProjects(me) && leads
        ? leads
        : p.members.filter((x) => x.is_lead).map((x) => x.member_id);
    const all = [...new Set([...members, ...keepLeads])];
    all
      .filter((mid) => mid !== me.id && !p.members.some((x) => x.member_id === mid))
      .forEach((mid) => notify(mid, "انضميت لفريق مشروع", p.name, `/portal/projects/${p.id}`));
    p.members = all.map((mid) => ({ member_id: mid, is_lead: keepLeads.includes(mid) }));
    save();
  },

  async surveys() {
    const me = meOrThrow();
    return s()
      .surveys.filter(
        (sv) => canManageSurvey(me, sv) || surveyAudience(sv).some((m) => m.id === me.id),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((sv) => {
        const r = s().responses.find((x) => x.survey_id === sv.id && x.member_id === me.id);
        const manage = canManageSurvey(me, sv);
        return {
          ...structuredClone(sv),
          mine: r ? { answers: r.answers, submitted_at: r.submitted_at } : null,
          can_manage: manage,
          submitted: manage
            ? s().responses.filter((x) => x.survey_id === sv.id && x.submitted_at).length
            : null,
          audience_size: manage ? surveyAudience(sv).length : null,
        };
      });
  },
  async createSurvey(x) {
    await pause();
    const me = meOrThrow();
    const ok =
      x.audience === "project"
        ? canManageProject(me, x.project_id)
        : x.audience === "committee"
          ? hasCap(me, "surveys") || headsCommittee(me, x.committee_id)
          : hasCap(me, "surveys");
    if (!ok || !canCreateSurveys(me)) throw new PortalError("forbidden");
    if (!x.questions.length) throw new PortalError("invalid_questions");
    const id = `s${Date.now().toString(36)}`;
    const sv: Survey = {
      ...x,
      id,
      status: "open",
      created_by: me.id,
      created_at: new Date().toISOString(),
    };
    s().surveys.push(sv);
    surveyAudience(sv)
      .filter((m) => m.id !== me.id)
      .forEach((m) => notify(m.id, "استبيان جديد", x.title, `/portal/surveys/${id}`));
    save();
    return id;
  },
  async saveSurveyResponse(id, answers, submit) {
    await pause();
    const me = meOrThrow();
    const sv = s().surveys.find((x) => x.id === id);
    if (!sv || !surveyAudience(sv).some((m) => m.id === me.id)) throw new PortalError("not_found");
    if (sv.status !== "open" || (sv.deadline && sv.deadline < new Date().toISOString()))
      throw new PortalError("survey_closed");
    let r = s().responses.find((x) => x.survey_id === id && x.member_id === me.id);
    if (r?.submitted_at) throw new PortalError("already_submitted");
    if (submit)
      for (const q of sv.questions) {
        const v = answers[q.id];
        if (q.required && (v == null || v === "" || (Array.isArray(v) && !v.length)))
          throw new PortalError("answers_required");
      }
    if (!r) {
      r = { survey_id: id, member_id: me.id, answers, submitted_at: null };
      s().responses.push(r);
    }
    r.answers = answers;
    r.submitted_at = submit ? new Date().toISOString() : null;
    save();
  },
  async setSurveyStatus(id, status) {
    const sv = s().surveys.find((x) => x.id === id);
    if (!sv || !canManageSurvey(meOrThrow(), sv)) throw new PortalError("forbidden");
    sv.status = status;
    save();
  },
  async deleteSurvey(id) {
    const sv = s().surveys.find((x) => x.id === id);
    if (!sv || !canManageSurvey(meOrThrow(), sv)) throw new PortalError("forbidden");
    s().surveys = s().surveys.filter((x) => x.id !== id);
    s().responses = s().responses.filter((x) => x.survey_id !== id);
    save();
  },
  async surveyResults(id) {
    const sv = s().surveys.find((x) => x.id === id);
    if (!sv || !canManageSurvey(meOrThrow(), sv)) throw new PortalError("forbidden");
    return {
      audience: surveyAudience(sv).length,
      responses: s()
        .responses.filter((r) => r.survey_id === id && r.submitted_at)
        .map((r) => {
          const m = s().members.find((x) => x.id === r.member_id)!;
          return {
            member_id: sv.anonymous ? null : m.id,
            name: sv.anonymous ? null : m.full_name,
            committee: sv.anonymous
              ? null
              : (structureCommittees.find((c) => c.id === m.committee_id)?.title ?? null),
            answers: r.answers,
            submitted_at: sv.anonymous ? null : r.submitted_at,
          };
        }),
    };
  },
  async remindSurvey(id) {
    const me = meOrThrow();
    const sv = s().surveys.find((x) => x.id === id);
    if (!sv || !canManageSurvey(me, sv)) throw new PortalError("forbidden");
    const pending = surveyAudience(sv).filter(
      (m) =>
        m.id !== me.id &&
        !s().responses.some((r) => r.survey_id === id && r.member_id === m.id && r.submitted_at),
    );
    pending.forEach((m) =>
      notify(m.id, "تذكير: استبيان بانتظارك", sv.title, `/portal/surveys/${id}`),
    );
    save();
    return pending.length;
  },

  async hourImports() {
    if (!hasCap(meOrThrow(), "hours")) return [];
    return structuredClone(s().imports).reverse();
  },
  async importHours(label, rows) {
    await pause();
    const me = meOrThrow();
    if (!hasCap(me, "hours")) throw new PortalError("forbidden");
    if (label.trim().length < 2) throw new PortalError("invalid_label");
    if (
      !rows.length ||
      rows.some((r) => !(r.hours > 0 && r.hours <= 500) || r.earned_on > todayISO())
    )
      throw new PortalError("invalid_rows");
    const id = `i${Date.now().toString(36)}`;
    rows.forEach((r) =>
      s().hours.push({
        id: `h${s().hours.length + 1}`,
        member_id: r.member_id,
        task_id: null,
        hours: r.hours,
        earned_on: r.earned_on,
        description: r.description?.trim() || label.trim(),
        import_id: id,
      }),
    );
    s().imports.push({
      id,
      label: label.trim(),
      rows: rows.length,
      total_hours: rows.reduce((n, r) => n + r.hours, 0),
      created_by: me.id,
      created_at: new Date().toISOString(),
      undone_at: null,
    });
    save();
    return id;
  },
  async undoHourImport(id) {
    if (!hasCap(meOrThrow(), "hours")) throw new PortalError("forbidden");
    s().hours = s().hours.filter((h) => h.import_id !== id);
    const imp = s().imports.find((x) => x.id === id);
    if (imp) imp.undone_at = new Date().toISOString();
    save();
  },
  async inactiveMembers() {
    if (!isLeadership(meOrThrow())) return [];
    return s().inactive.map((m) => ({
      id: m.id,
      full_name: m.full_name,
      committee_id: m.committee_id,
      team_id: m.team_id,
      role: m.role,
      title: m.title,
    }));
  },
  async setMemberActive(id, active) {
    const me = meOrThrow();
    if (!isLeadership(me) || id === me.id) throw new PortalError("forbidden");
    if (active) {
      const m = s().inactive.find((x) => x.id === id);
      if (m) {
        s().inactive = s().inactive.filter((x) => x.id !== id);
        s().members.push(m);
      }
    } else {
      const m = s().members.find((x) => x.id === id);
      if (m) {
        s().members = s().members.filter((x) => x.id !== id);
        s().inactive.push(m);
      }
    }
    save();
  },
  async setMemberCapabilities(id, caps) {
    if (!isLeadership(meOrThrow())) throw new PortalError("forbidden");
    const m = s().members.find((x) => x.id === id);
    if (!m) throw new PortalError("not_found");
    m.capabilities = [...new Set(caps)];
    save();
  },

  async reports(fromWeek, toWeek) {
    const me = meOrThrow();
    return structuredClone(
      s().reports.filter(
        (r) =>
          r.week_start >= fromWeek &&
          r.week_start <= toWeek &&
          canViewCommitteeReports(me, r.committee_id),
      ),
    ).sort((a, b) => b.week_start.localeCompare(a.week_start));
  },
  async saveReport(committeeId, week, fields, evaluations, submit) {
    const me = meOrThrow();
    if (!headsCommittee(me, committeeId)) throw new PortalError("forbidden");
    const thisWeek = weekStart(todayISO());
    if (weekStart(week) !== week || week > thisWeek || week < addDays(thisWeek, -56))
      throw new PortalError("invalid_week");
    if (fields.link && !/^https?:\/\/\S+$/i.test(fields.link))
      throw new PortalError("invalid_link");
    if (submit && fields.done.trim().length < 3) throw new PortalError("report_required");
    for (const e of evaluations) {
      const m = s().members.find((x) => x.id === e.member_id);
      if (!m || m.id === me.id || m.committee_id !== committeeId)
        throw new PortalError("invalid_evaluation");
      if (e.score != null && (e.score < 1 || e.score > 5))
        throw new PortalError("invalid_evaluation");
    }
    let r = s().reports.find((x) => x.committee_id === committeeId && x.week_start === week);
    if (r && (r.status === "submitted" || r.status === "reviewed"))
      throw new PortalError("already_submitted");
    if (!r) {
      r = {
        id: `r${Date.now().toString(36)}`,
        committee_id: committeeId,
        week_start: week,
        author_id: me.id,
        status: "draft",
        done: "",
        next_plan: "",
        challenges: "",
        support: "",
        link: "",
        self_score: null,
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
        quality_score: null,
        quality_note: "",
        updated_at: new Date().toISOString(),
        evaluations: [],
      };
      s().reports.push(r);
    }
    Object.assign(r, {
      ...fields,
      author_id: me.id,
      evaluations: structuredClone(evaluations),
      updated_at: new Date().toISOString(),
    });
    if (submit) {
      r.status = "submitted";
      r.submitted_at = new Date().toISOString();
      const c = structureCommittees.find((x) => x.id === committeeId);
      s()
        .members.filter((q) => headsQuality(q) && q.id !== me.id)
        .forEach((q) =>
          notify(
            q.id,
            "تقرير أسبوعي جديد",
            `${c?.title ?? ""} · ${me.full_name}`,
            `/portal/reports?week=${week}&c=${committeeId}`,
          ),
        );
    }
    save();
    return r.id;
  },
  async reviewReport(id, action, score, note) {
    const me = meOrThrow();
    const r = s().reports.find((x) => x.id === id);
    if (!r) throw new PortalError("not_found");
    if (!canReviewReport(me, r)) throw new PortalError("forbidden");
    if (action === "review") {
      if (score == null || score < 1 || score > 5) throw new PortalError("invalid_score");
      Object.assign(r, { status: "reviewed", quality_score: score, quality_note: note.trim() });
    } else {
      if (note.trim().length < 3) throw new PortalError("note_required");
      Object.assign(r, { status: "returned", quality_score: null, quality_note: note.trim() });
    }
    Object.assign(r, { reviewed_by: me.id, reviewed_at: new Date().toISOString() });
    s()
      .members.filter((h) => headsCommittee(h, r.committee_id))
      .forEach((h) =>
        notify(
          h.id,
          action === "review" ? "راجعت لجنة الجودة تقريركم" : "رجع تقريركم الأسبوعي للتعديل",
          action === "review" ? `${score} من 5` : note.trim(),
          `/portal/reports?week=${r.week_start}&c=${r.committee_id}`,
        ),
      );
    save();
  },
  async remindReports(week) {
    const me = meOrThrow();
    if (!(isLeadership(me) || inQuality(me))) throw new PortalError("forbidden");
    let n = 0;
    for (const c of structureCommittees) {
      const done = s().reports.some(
        (r) =>
          r.committee_id === c.id &&
          r.week_start === week &&
          (r.status === "submitted" || r.status === "reviewed"),
      );
      if (done) continue;
      for (const h of s().members.filter((m) => headsCommittee(m, c.id))) {
        notify(
          h.id,
          "تذكير: التقرير الأسبوعي",
          `لجنة الجودة بانتظار تقرير ${c.title}`,
          `/portal/reports?week=${week}&c=${c.id}`,
        );
        n++;
      }
    }
    save();
    return n;
  },
  async monthlyReports() {
    const me = meOrThrow();
    return structuredClone(
      s().monthly.filter((x) => inQuality(me) || (isLeadership(me) && x.status === "published")),
    ).sort((a, b) => b.month.localeCompare(a.month));
  },
  async monthlyOverview(month) {
    const me = meOrThrow();
    if (!(isLeadership(me) || inQuality(me))) throw new PortalError("forbidden");
    const start = monthStart(month);
    const end = monthStart(addDays(start, 32));
    const thisWeek = weekStart(todayISO());
    let weeks = 0;
    for (let w = weekStart(start); w < end; w = addDays(w, 7)) {
      const sat = addDays(w, 6);
      if (sat >= start && sat < end && w <= thisWeek) weeks++;
    }
    return structureCommittees.map((c) => {
      const rs = s().reports.filter((r) => {
        const sat = addDays(r.week_start, 6);
        return r.committee_id === c.id && sat >= start && sat < end;
      });
      const sent = rs.filter((r) => r.status === "submitted" || r.status === "reviewed");
      const avg = (xs: (number | null)[]) => {
        const v = xs.filter((x): x is number => x != null);
        return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
      };
      const evals = sent.flatMap((r) => r.evaluations);
      const memberIds = new Set(
        s()
          .members.filter((m) => m.committee_id === c.id)
          .map((m) => m.id),
      );
      return {
        committee_id: c.id,
        weeks,
        sent: sent.length,
        on_time: sent.filter(
          (r) => r.submitted_at && r.submitted_at.slice(0, 10) <= addDays(r.week_start, 6),
        ).length,
        quality_avg: avg(rs.map((r) => r.quality_score)),
        self_avg: avg(rs.map((r) => r.self_score)),
        members_avg: avg(evals.map((e) => e.score)),
        standouts: [...new Set(evals.filter((e) => e.standout).map((e) => e.member_id))],
        hours: s()
          .hours.filter(
            (h) => memberIds.has(h.member_id) && h.earned_on >= start && h.earned_on < end,
          )
          .reduce((a, h) => a + h.hours, 0),
        members: memberIds.size,
      };
    });
  },
  async saveMonthly(month, fields, publish) {
    const me = meOrThrow();
    if (!headsQuality(me)) throw new PortalError("forbidden");
    const m = monthStart(month);
    if (m > monthStart(todayISO())) throw new PortalError("invalid_month");
    if (publish && fields.summary.trim().length < 10) throw new PortalError("report_required");
    let r = s().monthly.find((x) => x.month === m);
    if (r?.status === "published" && !publish) throw new PortalError("already_published");
    const wasDraft = !r || r.status === "draft";
    if (!r) {
      r = {
        id: `mr${Date.now().toString(36)}`,
        month: m,
        author_id: me.id,
        status: "draft",
        published_at: null,
        updated_at: "",
        summary: "",
        highlights: "",
        issues: "",
        recommendations: "",
        committee_notes: {},
      };
      s().monthly.push(r);
    }
    Object.assign(r, structuredClone(fields), {
      author_id: me.id,
      updated_at: new Date().toISOString(),
    });
    if (publish) {
      r.status = "published";
      r.published_at ??= new Date().toISOString();
      if (wasDraft)
        s()
          .members.filter((l) => isLeadership(l) && l.id !== me.id)
          .forEach((l) =>
            notify(
              l.id,
              "تقرير الجودة الشهري",
              "من لجنة الجودة والتطوير",
              `/portal/reports?tab=monthly&month=${m}`,
            ),
          );
    }
    save();
    return r.id;
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
