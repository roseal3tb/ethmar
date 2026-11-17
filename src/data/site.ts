// Official public content for Ethmar. Edit here to update the public website.
import ambassadors from "@/assets/proj-ambassadors.jpg";
import fintech from "@/assets/proj-fintech.jpg";
import impact from "@/assets/proj-impact.jpg";
import sessions from "@/assets/proj-sessions.jpg";
import visits from "@/assets/proj-visits.jpg";

export const contact = {
  email: "ETHMAR.SPP@GMAIL.COM",
  handle: "@ETHMAR_SPP",
  phone: "+966 55 934 3243",
  phoneHref: "tel:+966559343243",
  president: "إبراهيم المنيع — رئيس مبادرة إثمار",
};

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
  "أن نكون روادًا في مجال التوعية المالية، ملهمين للجيل الصاعد بتمكينهم من اتخاذ قرارات مالية سليمة، ودعمهم لتحقيق الاستقلال المالي.";
export const mission =
  "تمكين المستفيدين من اكتساب المعرفة والمهارات اللازمة لإدارة شؤونهم المالية، وخلق مجتمع يتمتع بالوعي المالي.";

export const objectives = [
  { title: "اكتشاف", text: "نكتشف اهتمامات الطلاب واحتياجاتهم المالية ونقربهم من عالم المال." },
  { title: "توعية", text: "نقدم محتوى مالي موثوق يربط المعرفة بتخصصات الطلاب وحياتهم." },
  { title: "تمكين", text: "نمكّن الطلاب بالمهارات والتجارب التي تصنع قرارات مالية واعية." },
  { title: "متابعة", text: "نتابع الأثر ونطوّر البرامج باستمرار لضمان استدامته." },
];

export type Project = {
  id: string; num: string; title: string; latin?: string; short: string; long: string; image: string;
};

export const projects: Project[] = [
  { id: "ambassadors", num: "01", title: "سفراء إثمار", short: "البرنامج التوعوي الرئيسي للمبادرة.",
    long: "البرنامج التوعوي الرئيسي للمبادرة، يربط المعرفة المالية بتخصصات الطلاب واهتماماتهم عبر أنشطة توعوية في كليات الجامعة ومواقع أخرى.", image: ambassadors },
  { id: "fintech", num: "02", title: "Road to FinTech", short: "رحلة إلى منظومة التقنية المالية.",
    long: "مشروع متخصص يعرّف بمنظومة التقنية المالية، وابتكاراتها، والتحولات في القطاع، والفرص المستقبلية.", image: fintech },
  { id: "impact", num: "03", title: "Impact by Ethmar", short: "المعرض الرئيسي للمبادرة.",
    long: "المعرض الرئيسي للمبادرة، يجمع الطلاب بالتخصصات المالية والجهات المهنية والشركات المشاركة، مع فرص وظيفية وتدريبية وورش عمل وتجارب مهنية.", image: impact },
  { id: "sessions", num: "04", title: "الجلسات الحوارية", short: "لقاءات مع خبراء وقادة القطاع.",
    long: "جلسات تفاعلية تجمع الطلاب بخبراء القطاع والقيادات المالية وصناع القرار.", image: sessions },
  { id: "visits", num: "05", title: "الزيارات الإثرائية", short: "زيارات ميدانية لبيئات العمل الحقيقية.",
    long: "زيارات ميدانية للمؤسسات المالية والجهات التنظيمية والاستشارية، لتعريف الطلاب ببيئات العمل المهنية الحقيقية.", image: visits },
];

// Partners listed in Ethmar's profile. `logo` stays undefined until official logo files are provided.
export type Partner = { name: string; nameAr?: string; logo?: string };
export const partners: Partner[] = [
  { name: "Riyad Capital", nameAr: "الرياض المالية" },
  { name: "Saudi Exchange", nameAr: "تداول السعودية" },
  { name: "Al Rajhi Bank", nameAr: "مصرف الراجحي" },
  { name: "KAFD", nameAr: "مركز الملك عبدالله المالي" },
  { name: "Fintech Saudi", nameAr: "فنتك السعودية" },
];
