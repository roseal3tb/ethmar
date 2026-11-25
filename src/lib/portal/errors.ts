/** An error code raised by the database functions, the edge function or the auth layer. */
export class PortalError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: "البريد أو كلمة المرور غير صحيحة",
  network: "تعذّر الاتصال، تأكد من الإنترنت وحاول مرة ثانية",
  weak_password: "كلمة المرور لازم تكون ٨ أحرف على الأقل",
  same_password: "اختر كلمة مرور مختلفة عن الحالية",
  not_a_member: "حسابك غير مربوط بعضو في المبادرة",
  forbidden: "ما عندك صلاحية لهذا الإجراء",
  not_found: "المهمة غير موجودة أو ما تقدر تشوفها",
  already_claimed: "سبق وأخذت هذي المهمة",
  no_seats: "اكتملت المقاعد، سبقك غيرك",
  not_open: "هذي المهمة مسندة لأشخاص محددين",
  own_task: "ما تقدر تأخذ مهمة أنشأتها",
  task_closed: "المهمة مغلقة أو انتهى موعدها",
  cannot_unclaim: "ما تقدر تتراجع عن هذي المهمة الحين",
  cannot_submit: "ما تقدر تسلّم هذي المهمة الحين",
  invalid_link: "الرابط لازم يبدأ بـ https://",
  not_submitted: "العضو ما سلّم المهمة بعد",
  note_required: "اكتب ملاحظة توضح المطلوب تعديله",
  due_in_past: "تاريخ التسليم لازم يكون اليوم أو بعده",
  committee_required: "اختر اللجنة",
  invalid_team: "اختر فريقًا من نفس اللجنة",
  invalid_targets: "اختر أشخاصًا من نفس اللجنة",
  invalid_seats: "عدد المقاعد غير صحيح",
  invalid_email: "البريد الإلكتروني غير صحيح",
  email_in_use: "البريد مستخدم لحساب آخر",
  already_has_account: "هذا العضو عنده حساب",
  no_account: "هذا العضو ما عنده حساب بعد",
  member_not_found: "العضو غير موجود",
};

export function errorMessage(e: unknown): string {
  const code = e instanceof PortalError ? e.code : e instanceof Error ? e.message : "";
  return MESSAGES[code] ?? "صار خطأ غير متوقع، حاول مرة ثانية";
}
