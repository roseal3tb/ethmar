// DEMO DATA ONLY — fictional sample records for the portal prototype.
// Not real member records. Replace with backend data when available.
import { committees, type Committee } from "./site";

export type TierId = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type Tier = { id: TierId; name: string; minHours: number };

// Thresholds are placeholders, configurable here until official values are set.
export const tiers: Tier[] = [
  { id: "bronze", name: "المستوى البرونزي", minHours: 0 },
  { id: "silver", name: "المستوى الفضي", minHours: 20 },
  { id: "gold", name: "المستوى الذهبي", minHours: 40 },
  { id: "platinum", name: "المستوى البلاتيني", minHours: 70 },
  { id: "diamond", name: "المستوى الماسي", minHours: 100 },
];

export function tierForHours(hours: number): Tier {
  return [...tiers].reverse().find((t) => hours >= t.minHours) ?? tiers[0];
}

export function nextTier(hours: number): Tier | null {
  return tiers.find((t) => t.minHours > hours) ?? null;
}

export type Role = "القائدة" | "النائب" | "المستشار" | "عضو";
// Role category names (used for directory slots that may be empty)
export const roleLabels: Record<Role, string> = {
  القائدة: "قيادة اللجنة",
  النائب: "نيابة القيادة",
  المستشار: "الإرشاد",
  عضو: "الأعضاء",
};

// Gendered role label for a specific person, e.g. "قائدة اللجنة" / "قائد اللجنة"
export function roleLabel(m: Pick<Member, "role" | "gender">) {
  const f = m.gender === "f";
  switch (m.role) {
    case "القائدة":
      return f ? "قائدة اللجنة" : "قائد اللجنة";
    case "النائب":
      return f ? "نائبة القائد" : "نائب القائد";
    case "المستشار":
      return f ? "مستشارة اللجنة" : "مستشار اللجنة";
    default:
      return f ? "عضوة" : "عضو";
  }
}

export type Member = {
  id: string;
  name: string;
  gender: "f" | "m";
  committee: string;
  role: Role;
  totalHours: number;
  monthly: Record<string, number>;
};

// Committees are part of the public structure (data/site.ts); re-exported here for the portal.
export { committees, type Committee };

export const months = [
  { id: "2026-09", label: "سبتمبر ٢٠٢٦" },
  { id: "2026-10", label: "أكتوبر ٢٠٢٦" },
  { id: "2026-11", label: "نوفمبر ٢٠٢٦" },
];

const m = (a: number, b: number, c: number) => ({ "2026-09": a, "2026-10": b, "2026-11": c });

export const members: Member[] = [
  {
    id: "u1",
    name: "روز عبدالله العتيبي",
    gender: "f",
    committee: "tech",
    role: "عضو",
    totalHours: 46,
    monthly: m(12, 18, 16),
  },
  {
    id: "u2",
    name: "سارة الحربي",
    gender: "f",
    committee: "tech",
    role: "القائدة",
    totalHours: 88,
    monthly: m(26, 30, 32),
  },
  {
    id: "u3",
    name: "فيصل القحطاني",
    gender: "m",
    committee: "tech",
    role: "النائب",
    totalHours: 61,
    monthly: m(20, 19, 22),
  },
  {
    id: "u4",
    name: "نورة الشهري",
    gender: "f",
    committee: "tech",
    role: "المستشار",
    totalHours: 104,
    monthly: m(30, 36, 38),
  },
  {
    id: "u5",
    name: "عبدالعزيز الدوسري",
    gender: "m",
    committee: "tech",
    role: "عضو",
    totalHours: 22,
    monthly: m(6, 8, 8),
  },
  {
    id: "u6",
    name: "لمى السبيعي",
    gender: "f",
    committee: "media",
    role: "القائدة",
    totalHours: 92,
    monthly: m(28, 31, 33),
  },
  {
    id: "u7",
    name: "تركي المطيري",
    gender: "m",
    committee: "media",
    role: "النائب",
    totalHours: 55,
    monthly: m(15, 20, 20),
  },
  {
    id: "u8",
    name: "ريم الزهراني",
    gender: "f",
    committee: "media",
    role: "عضو",
    totalHours: 18,
    monthly: m(4, 6, 8),
  },
  {
    id: "u9",
    name: "خالد العنزي",
    gender: "m",
    committee: "projects",
    role: "القائدة",
    totalHours: 97,
    monthly: m(25, 34, 35),
  },
  {
    id: "u10",
    name: "جود الغامدي",
    gender: "f",
    committee: "projects",
    role: "عضو",
    totalHours: 41,
    monthly: m(14, 12, 15),
  },
  {
    id: "u11",
    name: "هيا الرشيد",
    gender: "f",
    committee: "pr",
    role: "القائدة",
    totalHours: 73,
    monthly: m(22, 25, 26),
  },
  {
    id: "u12",
    name: "محمد الشمري",
    gender: "m",
    committee: "pr",
    role: "المستشار",
    totalHours: 66,
    monthly: m(18, 24, 24),
  },
  {
    id: "u13",
    name: "دانة البقمي",
    gender: "f",
    committee: "fincontent",
    role: "القائدة",
    totalHours: 80,
    monthly: m(24, 27, 29),
  },
  {
    id: "u14",
    name: "يوسف العمري",
    gender: "m",
    committee: "fincontent",
    role: "عضو",
    totalHours: 29,
    monthly: m(9, 10, 10),
  },
];

export type DemoAccount = {
  memberId: string;
  login: string;
  memberCode: string;
  password: string;
  completedTasks: number;
  achievements: string[];
};

// Demo credentials shown openly on the login page. Not real accounts.
export const demoAccounts: DemoAccount[] = [
  {
    memberId: "u1",
    login: "rose@demo.ethmar",
    memberCode: "ETH-1001",
    password: "demo1234",
    completedTasks: 9,
    achievements: ["أول مهمة مكتملة", "١٠ ساعات تطوعية", "عضو فعّال لشهرين"],
  },
  {
    memberId: "u2",
    login: "sara@demo.ethmar",
    memberCode: "ETH-1002",
    password: "demo1234",
    completedTasks: 21,
    achievements: ["قائدة لجنة", "٥٠ ساعة تطوعية", "منظمة معرض Impact"],
  },
];

export type TaskStatus = "new" | "active" | "done";
export type Task = {
  id: string;
  title: string;
  committee: string;
  description: string;
  assignedAt: string;
  dueAt: string;
  estHours: number;
  verifiedHours: number;
  status: TaskStatus;
  progress: number;
};

export const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Portal Frontend Developer",
    committee: "tech",
    description: "Frontend implementation.",
    assignedAt: "2026-11-02",
    dueAt: "2026-11-30",
    estHours: 20,
    verifiedHours: 8,
    status: "active",
    progress: 40,
  },
  {
    id: "t2",
    title: "تصميم قوالب منشورات سفراء إثمار",
    committee: "media",
    description: "إعداد ٥ قوالب بصرية لحملة الترم",
    assignedAt: "2026-11-10",
    dueAt: "2026-11-24",
    estHours: 6,
    verifiedHours: 0,
    status: "new",
    progress: 0,
  },
  {
    id: "t3",
    title: "تنسيق زيارة إثرائية",
    committee: "projects",
    description: "التواصل مع الجهة المستضيفة وجدولة الزيارة",
    assignedAt: "2026-11-12",
    dueAt: "2026-12-05",
    estHours: 8,
    verifiedHours: 0,
    status: "new",
    progress: 0,
  },
  {
    id: "t4",
    title: "مراجعة محتوى ورشة الميزانية",
    committee: "fincontent",
    description: "تدقيق شرائح ورشة الميزانية الشخصية",
    assignedAt: "2026-10-05",
    dueAt: "2026-10-20",
    estHours: 4,
    verifiedHours: 4,
    status: "done",
    progress: 100,
  },
  {
    id: "t5",
    title: "إعداد تقرير أثر شهر أكتوبر",
    committee: "tech",
    description: "تجميع أرقام المستفيدين والمشاهدات",
    assignedAt: "2026-10-25",
    dueAt: "2026-11-05",
    estHours: 5,
    verifiedHours: 5,
    status: "done",
    progress: 100,
  },
];

export type Lab = {
  id: string;
  title: string;
  kind: string;
  description: string;
  status: "متاح" | "قريبًا";
};
// Placeholder labs — configurable until official Labs activities are provided.
export const labs: Lab[] = [
  {
    id: "l1",
    title: "مختبر التحليل المالي",
    kind: "تعلم",
    description: "تمارين قصيرة لقراءة القوائم المالية",
    status: "قريبًا",
  },
  {
    id: "l2",
    title: "مختبر المحتوى",
    kind: "تطوير",
    description: "مساحة لتجربة أفكار المحتوى التوعوي ومراجعتها",
    status: "قريبًا",
  },
  {
    id: "l3",
    title: "مختبر التقنية",
    kind: "تجارب تقنية",
    description: "تجارب أدوات رقمية تخدم أعمال المبادرة",
    status: "قريبًا",
  },
  {
    id: "l4",
    title: "مكتبة الموارد",
    kind: "موارد داخلية",
    description: "أدلة وقوالب داخلية للجان",
    status: "قريبًا",
  },
];

export const committeeName = (id: string) => committees.find((c) => c.id === id)?.name ?? id;
