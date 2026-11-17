// Official public content for Ethmar. Edit here to update the public website.
import ambassadors from "@/assets/proj-ambassadors.jpg";
import fintech from "@/assets/proj-fintech.jpg";
import impact from "@/assets/proj-impact.jpg";
import sessions from "@/assets/proj-sessions.jpg";
import visits from "@/assets/proj-visits.jpg";

// Official structure — "هيكلة مبادرة إثمار", first semester 1448 / 2026.
// Shown on /structure; the committee list is also reused by the members portal.
export type Person = { name: string; role: string };
export type Team = { name: string; people: Person[]; members?: string[] };
export type Committee = {
  id: string;
  /** Short name, used as "لجنة {name}" across the site and portal. */
  name: string;
  /** Official committee title as written in the structure chart. */
  title: string;
  description?: string;
  leads: Person[];
  teams: Team[];
  /** Members of committees that are not split into teams */
  members?: string[];
};

export const structureTerm = "الفصل الدراسي الأول 1448 — 2026";

export const leadership = {
  president: { name: "رائد المطيري", role: "رئيس مبادرة إثمار" },
  vicePresidents: [
    { name: "داليا الرشيد", role: "نائبة رئيس المبادرة" },
    { name: "غادة العتيبي", role: "نائبة رئيس المبادرة" },
  ],
};

export const contact = {
  email: "ETHMAR.SPP@GMAIL.COM",
  handle: "@ETHMAR_SPP",
};

// Official accounts (all use the handle @ETHMAR_SPP, as in Ethmar's profile)
export const socials = [
  { id: "x", label: "إكس", href: "https://x.com/ETHMAR_SPP" },
  { id: "instagram", label: "إنستقرام", href: "https://www.instagram.com/ethmar_spp" },
  { id: "tiktok", label: "تيك توك", href: "https://www.tiktok.com/@ethmar_spp" },
] as const;

// The umbrella Ethmar sits under.
export const affiliation = ["جامعة الملك سعود", "عمادة شؤون الطلاب", "برنامج الشراكة الطلابية"];

export const committees: Committee[] = [
  {
    id: "tech",
    name: "التقنية",
    title: "اللجنة التقنية",
    description: "تطوير الأنظمة الرقمية للمبادرة وبوابة الأعضاء",
    leads: [
      { name: "عالية البليهي", role: "قائدة اللجنة" },
      { name: "لينا العضيبي", role: "نائبة القائدة" },
      { name: "روز العتيبي", role: "نائبة القائدة" },
    ],
    teams: [],
  },
  {
    id: "pr",
    name: "العلاقات العامة",
    title: "لجنة العلاقات العامة",
    description: "بناء العلاقات مع شركاء النجاح والجهات الخارجية",
    leads: [
      { name: "الوليد الرشيد", role: "قائد اللجنة" },
      { name: "العنود الشويعر", role: "نائبة القائد" },
    ],
    teams: [
      {
        name: "فريق التواصل الخارجي",
        people: [{ name: "فهد العقيل", role: "قائد الفريق" }],
        members: [
          "منى الروقي",
          "عبدالله الفليج",
          "ياسر العمرو",
          "مريم عبدالباقي",
          "بيان العتي",
          "راكان باشماخ",
          "ثابت الربيعي",
          "غرام الشمري",
          "فارس الهديريس",
          "العنود الموسى",
          "نوره المطرفي",
          "فهده السويد",
          "ساره الرشيد",
          "فيصل العبيد",
        ],
      },
      {
        name: "فريق المساندة والإمداد",
        people: [{ name: "عبدالعزيز الدعفس", role: "قائد الفريق" }],
        members: [
          "يزيد الرويتع",
          "عبدالله الغنام",
          "رنا الفارس",
          "غيداء المالكي",
          "ريناد الحسين",
          "عبدالرحمن البطي",
          "ليان المسعري",
          "محمد الهويمل",
        ],
      },
    ],
  },
  {
    id: "hr",
    name: "الموارد البشرية",
    title: "لجنة الموارد البشرية",
    leads: [
      { name: "غلا العتيبي", role: "قائدة اللجنة" },
      { name: "مجد العتيبي", role: "نائبة القائدة" },
    ],
    teams: [],
    members: [
      "دمات اليمني",
      "ياسمين النفيعي",
      "عبدالرحمن المانع",
      "فرح العنزي",
      "تهاني المغيري",
      "هيفاء بن عيبان",
      "نوره الخنفري",
      "نوره الباز",
      "لنا القزلان",
      "لجين العصيمي",
    ],
  },
  {
    id: "media",
    name: "الإعلام",
    title: "اللجنة الإعلامية",
    description: "صناعة المحتوى وإدارة حسابات المبادرة",
    leads: [
      { name: "نوف بن حثلين", role: "قائدة اللجنة" },
      { name: "أسيل الصعب", role: "نائبة القائدة" },
    ],
    teams: [
      {
        name: "فريق التصوير والمونتاج",
        people: [
          { name: "غيداء أبو حيد", role: "قائدة الفريق" },
          { name: "شذى الطيار", role: "نائبة القائدة" },
        ],
        members: [
          "فارس العتيبي",
          "دانيا المسلم",
          "مشعل بن حثلين",
          "لينا الفاضل",
          "لمى الأحمري",
          "سعد المطيري",
          "سارة الخثلان",
          "عبدالرحمن الحسينان",
          "جود الفهيد",
          "زياد القحطاني",
          "نوره الفريان",
          "منيرة الخثران",
          "خالد أبو طالب",
        ],
      },
      {
        name: "فريق المحتوى والتسويق",
        people: [{ name: "شادن الغنام", role: "قائدة الفريق" }],
        members: [
          "ليان الغامدي",
          "دانية الدعيلج",
          "ريماس عبدالله",
          "ساره الزرين",
          "ريم زهد",
          "دانة الهلال",
          "وهج الحسين",
          "غاده الهزاني",
        ],
      },
      {
        name: "فريق التصميم",
        people: [
          { name: "روان الحربي", role: "قائدة الفريق" },
          { name: "بتيل الرويلي", role: "نائبة القائدة" },
        ],
        members: [
          "راحيل التويم",
          "ليان العبدالكريم",
          "نوره الشثان",
          "هيفاء القعيد",
          "منال العتيبي",
        ],
      },
    ],
  },
  {
    id: "fincontent",
    name: "المحتوى المالي",
    title: "لجنة المحتوى المالي",
    description: "إعداد المادة المالية لبرامج التوعية",
    leads: [
      { name: "سلطان المتعب", role: "قائد اللجنة" },
      { name: "يارا العقيل", role: "نائبة القائد" },
    ],
    teams: [
      {
        name: "فريق البحوث المالية",
        people: [
          { name: "رزان الميموني", role: "إشراف" },
          { name: "حمد اللعبون", role: "إشراف" },
          { name: "عبدالله بن محفوظ", role: "إشراف" },
        ],
        members: [
          "رند القملاس",
          "محمد الجاسر",
          "مشعل التمياط",
          "شذا العبدالواحد",
          "هيا الفضيلي",
          "الهنوف السهلي",
          "نايف العتيبي",
          "عبدالرحمن الفاضل",
          "وفاء العبدلي",
          "ريما العتيبي",
          "خالد العيسى",
        ],
      },
      {
        name: "فريق المحتوى المالي",
        people: [{ name: "غيداء الزهراني", role: "إشراف" }],
        members: [
          "بدور السويح",
          "ريما العتيبي",
          "أريام المطلق",
          "أحمد الشريف",
          "أنس المقيطيب",
          "درة الهدلق",
          "سلطان بن سويدان",
          "شهد الزمامي",
          "نايف القبلان",
          "مشاري الشهراني",
          "إيناس العيوني",
          "مدى الجهني",
          "لين آل عزيزي",
          "عبدالعزيز السليمان",
          "خالد الخلف",
        ],
      },
    ],
  },
  {
    id: "quality",
    name: "الجودة والتطوير",
    title: "لجنة الجودة والتطوير",
    leads: [
      { name: "يارا الحميدان", role: "قائدة اللجنة" },
      { name: "روان الشهراني", role: "نائبة القائدة" },
    ],
    teams: [],
    members: [
      "آسيا النافع",
      "غاده السالم",
      "ألين الدريبي",
      "كادي المقبل",
      "بدر الظفيري",
      "لجين الحيدري",
      "فهده آل الشيخ",
      "محمد الجلال",
      "خالد الحمود",
      "مزنه آل مسن",
      "شيهانه الريدي",
      "نواره الرجيعي",
    ],
  },
  {
    id: "projects",
    name: "إدارة المشاريع",
    title: "لجنة إدارة المشاريع",
    description: "تنظيم المعارض والجلسات والزيارات",
    leads: [{ name: "العنود القحطاني", role: "قائدة اللجنة" }],
    teams: [
      {
        name: "قادة المشاريع",
        people: [
          { name: "هالة الطخيم", role: "قائدة مشروع" },
          { name: "حسان البليهد", role: "قائد مشروع" },
          { name: "محمد الخليفة", role: "قائد مشروع" },
          { name: "جود الطريسي", role: "قائدة مشروع" },
          { name: "طلال القزلان", role: "قائد مشروع" },
          { name: "يوسف الغامدي", role: "قائد مشروع" },
          { name: "منيرة التمامي", role: "قائدة مشروع" },
          { name: "سلمان العتيبي", role: "قائد مشروع" },
          { name: "لولو الخثلان", role: "قائدة مشروع" },
          { name: "إبراهيم الموسى", role: "قائد مشروع" },
          { name: "محمد الدهام", role: "قائد مشروع" },
          { name: "ياسر العمرو", role: "قائد مشروع" },
        ],
      },
    ],
  },
];

// Official "من نحن" text from Ethmar's profile.
export const aboutIntro =
  "مبادرة إثمار هي أول مبادرة طلابية في جامعة الملك سعود تهدف إلى زيادة الوعي المالي، تأسست تحت رعاية رئيس جامعة الملك سعود، تابعة لبرنامج الشراكة الطلابية";
export const aboutIntroMore =
  "تهدف المبادرة إلى تطوير المهارات المالية لدى المستفيدين، وتمكينهم من المساهمة في تنمية المشهد المالي في المملكة وتعزيز المظاهر الثقافية في الأوساط المالية";

// Target audience as listed in Ethmar's profile.
export const audience = [
  { title: "المجتمع بكل فئاته", text: "جميع طبقات المجتمع، خصوصًا المهتمين في المجال المالي" },
  {
    title: "طلاب جامعة الملك سعود",
    text: "طلاب وطالبات جامعة الملك سعود الذين يتجاوز عددهم ٦٣ ألف طالب",
  },
];

export const stats = [
  { value: 4, suffix: " مليون", label: "مشاهدة" },
  { value: 8000, suffix: "", label: "مستفيد" },
  { value: 50, suffix: "", label: "شريك نجاح سابق" },
  { value: 120, suffix: "", label: "عضو وقائد كل ترم" },
];

export const awards = [
  "أفضل مبادرة على مستوى الجامعة",
  "أفضل مبادرة على مستوى الشراكة الطلابية",
  "أفضل عمل تطوعي على مستوى الجامعة",
];

export const vision =
  "أن نكون روادًا في مجال التوعية المالية، ملهمين للجيل الصاعد بتمكينهم من اتخاذ قرارات مالية سليمة، ودعمهم لتحقيق الاستقلال المالي";
export const mission =
  "تمكين المستفيدين من اكتساب المعرفة والمهارات اللازمة لإدارة شؤونهم المالية، وخلق مجتمع يتمتع بالوعي المالي";

export const objectives = [
  { title: "اكتشاف", text: "نكتشف اهتمامات الطلاب واحتياجاتهم المالية ونقربهم من عالم المال" },
  { title: "توعية", text: "نقدم محتوى مالي موثوق يربط المعرفة بتخصصات الطلاب وحياتهم" },
  { title: "تمكين", text: "نمكّن الطلاب بالمهارات والتجارب التي تصنع قرارات مالية واعية" },
  { title: "متابعة", text: "نتابع الأثر ونطوّر البرامج باستمرار لضمان استدامته" },
];

export type Project = {
  id: string;
  num: string;
  title: string;
  latin?: string;
  short: string;
  long: string;
  image: string;
  /** Outputs and location as listed in Ethmar's profile (optional). */
  outcomes?: string;
  location?: string;
};

export const projects: Project[] = [
  {
    id: "ambassadors",
    num: "01",
    title: "سفراء إثمار",
    short: "البرنامج التوعوي الرئيسي للمبادرة",
    long: "البرنامج التوعوي الرئيسي للمبادرة، يربط المعرفة المالية بتخصصات الطلاب واهتماماتهم عبر أنشطة توعوية في كليات الجامعة ومواقع أخرى",
    image: ambassadors,
    outcomes:
      "مستفيدون واعون بالمجال، إضافة إلى كسب الخبرات والوصول لأفضل الطرق لفهم المجال المالي ودخوله",
    location:
      "خمس كليات (إدارة الأعمال، العلوم، الحقوق، الهندسة، العلوم الإنسانية)، ومعرض اليو ووك",
  },
  {
    id: "fintech",
    num: "02",
    title: "Road to FinTech",
    short: "رحلة إلى منظومة التقنية المالية",
    long: "مشروع متخصص يعرّف بمنظومة التقنية المالية، وابتكاراتها، والتحولات في القطاع، والفرص المستقبلية",
    image: fintech,
    outcomes:
      "مستفيدون واعون بالمجال ومتدربون على التقنية المالية، إضافة إلى كسب الخبرات من أصحاب المهنة",
    location: "R House",
  },
  {
    id: "impact",
    num: "03",
    title: "Impact by Ethmar",
    short: "المعرض الرئيسي للمبادرة",
    long: "المعرض الرئيسي للمبادرة، يجمع الطلاب بالتخصصات المالية والجهات المهنية والشركات المشاركة، مع فرص وظيفية وتدريبية وورش عمل وتجارب مهنية",
    image: impact,
    outcomes: "ربط الشركات بالمتخصصين، وفتح مجالات الاستقطاب والتوظيف، والوصول لفهم الواقع العملي",
    location: "كافد المالية أو الكراج",
  },
  {
    id: "sessions",
    num: "04",
    title: "الجلسات الحوارية",
    short: "لقاءات مع خبراء وقادة القطاع",
    long: "جلسات تفاعلية تجمع الطلاب بخبراء القطاع والقيادات المالية وصناع القرار",
    image: sessions,
    outcomes: "مستفيدون واعون بالمجال، يكسبون الخبرات من أصحاب المهنة عبر لقاءات مباشرة",
    location: "R House",
  },
  {
    id: "visits",
    num: "05",
    title: "الزيارات الإثرائية",
    short: "زيارات ميدانية لبيئات العمل الحقيقية",
    long: "زيارات ميدانية للمؤسسات المالية والجهات التنظيمية والاستشارية، لتعريف الطلاب ببيئات العمل المهنية الحقيقية",
    image: visits,
    outcomes:
      "مستفيدون متدربون على القطاع المالي، يكسبون الخبرات من أصحاب المهنة والشركات من خلال الزيارات",
    location: "عدة جهات مالية وتنظيمية واستشارية",
  },
];

// Header shows only: الرئيسية · التسجيل (dialog) · مثمرينا · بوابة الأعضاء (button)
export const headerNav = [
  { to: "/", label: "الرئيسية" },
  { to: "/structure", label: "مثمرينا" },
] as const;

// Full list of public pages (footer). Registration opens the closed-registration dialog
export const siteNav = [
  { to: "/", label: "الرئيسية" },
  { to: "/about", label: "من نحن" },
  { to: "/projects", label: "مشاريعنا" },
  { to: "/partners", label: "شركاء النجاح" },
  { to: "/structure", label: "مثمرينا" },
] as const;

// Partners listed in Ethmar's profile. `logo` stays undefined until official logo files are provided.
export type Partner = { name: string; nameAr?: string; logo?: string };
export const partners: Partner[] = [
  { name: "Riyad Capital", nameAr: "الرياض المالية" },
  { name: "Saudi Exchange", nameAr: "تداول السعودية" },
  { name: "Al Rajhi Bank", nameAr: "مصرف الراجحي" },
  { name: "KAFD", nameAr: "مركز الملك عبدالله المالي" },
  { name: "Fintech Saudi", nameAr: "فنتك السعودية" },
];
