// Official public content for Ethmar. Edit here to update the public website.
import ambassadors from "@/assets/proj-ambassadors.jpg";
import fintech from "@/assets/proj-fintech.jpg";
import impact from "@/assets/proj-impact.jpg";
import sessions from "@/assets/proj-sessions.jpg";
import visits from "@/assets/proj-visits.jpg";

// The structure itself (committees, teams, people) lives in src/data/structure.ts.
export const structureTerm = "الفصل الدراسي الأول 1448 — 2026";

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
