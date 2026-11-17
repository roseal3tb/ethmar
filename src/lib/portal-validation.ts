// Client-side validation for the demo portal forms. Pure functions so they can be unit-tested.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^ETH-\d{4}$/i;

export type LoginErrors = { id?: string; password?: string; form?: string };

export function validateLogin(id: string, password: string): LoginErrors {
  const e: LoginErrors = {};
  const v = id.trim();
  if (!v) e.id = "أدخل البريد الإلكتروني أو رقم العضوية";
  else if (v.includes("@") && !EMAIL_RE.test(v)) e.id = "صيغة البريد الإلكتروني غير صحيحة";
  else if (!v.includes("@") && !CODE_RE.test(v)) e.id = "رقم العضوية بصيغة ETH-1001";
  if (!password) e.password = "أدخل كلمة المرور";
  return e;
}

export type PasswordErrors = { current?: string; next?: string; confirm?: string };

export function validatePasswordChange(
  current: string,
  next: string,
  confirm: string,
  actualCurrent: string,
): PasswordErrors {
  const e: PasswordErrors = {};
  if (!current) e.current = "أدخل كلمة المرور الحالية";
  else if (current !== actualCurrent) e.current = "كلمة المرور الحالية غير صحيحة";
  if (!next) e.next = "أدخل كلمة مرور جديدة";
  else if (next.length < 8) e.next = "8 أحرف على الأقل";
  else if (!/[A-Za-z؀-ۿ]/.test(next) || !/\d/.test(next)) e.next = "يجب أن تحتوي على حروف وأرقام";
  else if (next === current) e.next = "اختر كلمة مرور مختلفة عن الحالية";
  if (!confirm) e.confirm = "أعد كتابة كلمة المرور الجديدة";
  else if (confirm !== next) e.confirm = "كلمتا المرور غير متطابقتين";
  return e;
}

export type ProfileErrors = { displayName?: string; major?: string; bio?: string };
export const BIO_MAX = 160;

export function validateProfile(displayName: string, major: string, bio: string): ProfileErrors {
  const e: ProfileErrors = {};
  const n = displayName.trim();
  if (n.length < 3) e.displayName = "الاسم يجب أن يكون 3 أحرف على الأقل";
  else if (n.length > 40) e.displayName = "الاسم أطول من 40 حرفًا";
  if (major.trim().length > 60) e.major = "التخصص أطول من 60 حرفًا";
  if (bio.length > BIO_MAX) e.bio = `النبذة أطول من ${BIO_MAX} حرفًا`;
  return e;
}
