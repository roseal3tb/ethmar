import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  Check,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Undo2,
  Upload,
  UserCheck,
  UserCog,
  UserX,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { relativeTime, shortDate, todayISO } from "@/lib/portal/dates";
import { errorMessage } from "@/lib/portal/errors";
import {
  canManageAccount,
  hasCap,
  isCommitteeHead,
  isLeadership,
  isTeamHead,
} from "@/lib/portal/permissions";
import {
  useAdminActions,
  useDirectory,
  useHourImports,
  useInactiveMembers,
  useMemberEmails,
  useSaveSemester,
  useSemesters,
} from "@/lib/portal/queries";
import { useMe } from "@/lib/portal/session";
import type { Capability, HourImportRow, Member, Semester } from "@/lib/portal/types";
import { cn } from "@/lib/utils";
import { AccountsPage } from "./AccountsPage";
import { PSelect } from "./PSelect";
import { Avatar, Chip, EASE, PageHeader, Panel, Segmented, fmt, hoursLabel, titleOf } from "./ui";

export type AdminTab = "accounts" | "hours" | "semesters" | "members";

export function AdminPage({ tab }: { tab?: AdminTab | undefined }) {
  const me = useMe();
  const navigate = useNavigate();
  const { dir } = useDirectory();
  const accounts =
    hasCap(me, "accounts") ||
    isCommitteeHead(me) ||
    isTeamHead(me) ||
    (dir?.members ?? []).some((m) => canManageAccount(me, m));
  const tabs: { value: AdminTab; label: string }[] = [
    ...(accounts ? [{ value: "accounts" as const, label: "الحسابات" }] : []),
    ...(hasCap(me, "hours")
      ? [
          { value: "hours" as const, label: "استيراد الساعات" },
          { value: "semesters" as const, label: "الفصول" },
        ]
      : []),
    ...(isLeadership(me) ? [{ value: "members" as const, label: "الصلاحيات" }] : []),
  ];
  const current = tabs.find((t) => t.value === tab)?.value ?? tabs[0]?.value ?? "accounts";
  const set = (t: AdminTab) =>
    void navigate({ to: "/portal/accounts", search: { tab: t }, replace: true });

  return (
    <div className="flex flex-col gap-6">
      {tabs.length > 1 && (
        <Segmented
          id="admin-tabs"
          className="max-w-full self-start overflow-x-auto"
          value={current}
          onChange={set}
          options={tabs}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {current === "accounts" && <AccountsPage />}
          {current === "hours" && <HoursImport />}
          {current === "semesters" && <Semesters />}
          {current === "members" && <MembersAdmin />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── hours import ───────────────────────── */

type Sheet = { headers: string[]; rows: unknown[][] };
type Parsed = {
  line: number;
  raw: string;
  member: Member | null;
  hours: number | null;
  date: string | null;
  description: string;
  problem: string | null;
};

/** Arabic name normalisation for matching: hamzas, taa marbuta, alef maqsura, tatweel, spaces. */
export const normName = (s: string) =>
  s
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();

const AR_DIGITS = /[٠-٩]/g;
const toLatin = (s: string) => s.replace(AR_DIGITS, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    return `${y}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number" && v > 30000 && v < 80000) {
    // Excel serial day.
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const t = toLatin(String(v ?? "").trim());
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
}

export function parseHours(v: unknown): number | null {
  const n =
    typeof v === "number"
      ? v
      : Number(
          toLatin(String(v ?? ""))
            .replace(",", ".")
            .trim(),
        );
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function guess(headers: string[], words: string[]) {
  const i = headers.findIndex((h) => words.some((w) => normName(h).toLowerCase().includes(w)));
  return i >= 0 ? String(i) : "";
}

function HoursImport() {
  const me = useMe();
  const { dir } = useDirectory();
  const emails = useMemberEmails(true);
  const imports = useHourImports(true);
  const { importHours, undoImport } = useAdminActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [cols, setCols] = useState({ who: "", hours: "", date: "", desc: "" });
  const [defaultDate, setDefaultDate] = useState(todayISO());
  const [label, setLabel] = useState("");
  const [reading, setReading] = useState(false);
  const [undo, setUndo] = useState<string | null>(null);
  const today = todayISO();

  async function read(f: File) {
    setReading(true);
    try {
      const XLSX = await import("xlsx");
      // CSV: decode as UTF-8 ourselves (SheetJS would guess Latin-1 without a BOM and garble Arabic).
      const wb = /\.csv$/i.test(f.name)
        ? XLSX.read(new TextDecoder("utf-8").decode(await f.arrayBuffer()).replace(/^\ufeff/, ""), {
            type: "string",
            cellDates: true,
          })
        : XLSX.read(await f.arrayBuffer(), { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]!]!;
      const all = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        blankrows: false,
        defval: "",
      });
      const headers = (all[0] ?? []).map((h) => String(h ?? "").trim());
      const rows = all.slice(1).filter((r) => r.some((c) => String(c ?? "").trim()));
      if (!headers.length || !rows.length) throw new Error("empty");
      setSheet({ headers, rows });
      setFileName(f.name);
      setLabel(f.name.replace(/\.(xlsx|xls|csv)$/i, ""));
      setCols({
        who: guess(headers, ["رقم", "كود", "code", "id", "ايميل", "بريد", "email", "اسم", "name"]),
        hours: guess(headers, ["ساع", "hour"]),
        date: guess(headers, ["تاريخ", "date", "يوم"]),
        desc: guess(headers, ["وصف", "نشاط", "سبب", "desc", "مهمه", "فعاليه"]),
      });
    } catch {
      toast.error("ما قدرت أقرأ الملف", {
        description: "تأكد إنه xlsx أو csv وأول صف فيه العناوين",
      });
    } finally {
      setReading(false);
    }
  }

  const index = useMemo(() => {
    const byCode = new Map<string, Member>();
    const byEmail = new Map<string, Member>();
    const byName = new Map<string, Member[]>();
    for (const m of dir?.members ?? []) {
      if (m.member_code) byCode.set(m.member_code.trim().toUpperCase(), m);
      const e = emails.data?.[m.id];
      if (e) byEmail.set(e.toLowerCase(), m);
      const n = normName(m.full_name);
      byName.set(n, [...(byName.get(n) ?? []), m]);
    }
    return { byCode, byEmail, byName };
  }, [dir, emails.data]);

  const parsed: Parsed[] = useMemo(() => {
    if (!sheet || cols.who === "" || cols.hours === "") return [];
    return sheet.rows.map((r, i) => {
      const raw = String(r[Number(cols.who)] ?? "").trim();
      const key = toLatin(raw);
      const byName = index.byName.get(normName(raw)) ?? [];
      const member =
        index.byCode.get(key.toUpperCase()) ??
        index.byEmail.get(key.toLowerCase()) ??
        (byName.length === 1 ? byName[0]! : null);
      const hours = parseHours(r[Number(cols.hours)]);
      const date = cols.date !== "" ? parseDate(r[Number(cols.date)]) : defaultDate;
      const description =
        cols.desc !== ""
          ? String(r[Number(cols.desc)] ?? "")
              .trim()
              .slice(0, 200)
          : "";
      const problem = !raw
        ? "خانة العضو فاضية"
        : !member
          ? byName.length > 1
            ? "الاسم مكرر، استخدم رقم العضوية"
            : "ما لقيت العضو"
          : hours == null
            ? "الساعات غير صحيحة"
            : hours > 500
              ? "ساعات كثيرة (الحد ٥٠٠)"
              : !date
                ? "التاريخ غير مفهوم"
                : date > today
                  ? "التاريخ في المستقبل"
                  : null;
      return { line: i + 2, raw, member, hours, date, description, problem };
    });
  }, [sheet, cols, index, defaultDate, today]);

  const good = parsed.filter((p) => !p.problem);
  const bad = parsed.filter((p) => p.problem);
  const total = good.reduce((a, p) => a + (p.hours ?? 0), 0);

  async function run() {
    if (!good.length || !label.trim()) return;
    const rows: HourImportRow[] = good.map((p) => ({
      member_id: p.member!.id,
      hours: p.hours!,
      earned_on: p.date!,
      ...(p.description ? { description: p.description } : {}),
    }));
    try {
      await importHours.mutateAsync({ label: label.trim(), rows });
      toast.success(
        `انضافت ${hoursLabel(total)} لـ ${new Set(rows.map((r) => r.member_id)).size} عضو`,
        {
          description: "وصلهم إشعار، وتقدر تتراجع من السجل تحت",
        },
      );
      setSheet(null);
      setFileName("");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function template() {
    const csv =
      "﻿رقم العضوية,الساعات,التاريخ,الوصف\n" +
      (dir?.members.slice(0, 3) ?? [])
        .map((m) => `${m.member_code ?? m.full_name},2,${today},مثال`)
        .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "قالب-ساعات-إثمار.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const headerOptions = (sheet?.headers ?? []).map((h, i) => ({
    value: String(i),
    label: h || `عمود ${i + 1}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileSpreadsheet}
        title="استيراد الساعات"
        subtitle="ارفع ملف Excel أو CSV فيه ساعات خارج المهام (فعاليات، ورش، تطوع ميداني)"
        actions={
          <button type="button" className="p-btn-ghost h-11" onClick={template}>
            <Download className="size-4" /> قالب جاهز
          </button>
        }
      />

      <Panel>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = "";
          }}
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void read(f);
          }}
          className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-[var(--p-line-strong)] px-4 py-10 text-center transition-colors hover:border-[var(--p-gold)] hover:bg-[rgb(198_164_92/0.04)]"
        >
          {reading ? (
            <Loader2 className="size-8 animate-spin text-[var(--p-gold-soft)]" />
          ) : (
            <Upload className="size-8 text-[var(--p-gold-soft)]" />
          )}
          <b className="font-display">{fileName || "اسحب الملف هنا أو اضغط لاختياره"}</b>
          <span className="text-xs text-[var(--p-dim)]">
            أول صف للعناوين · العضو بالرقم أو الإيميل أو الاسم الكامل
          </span>
        </motion.button>

        <AnimatePresence>
          {sheet && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["who", "عمود العضو", false],
                    ["hours", "عمود الساعات", false],
                    ["date", "عمود التاريخ", true],
                    ["desc", "عمود الوصف", true],
                  ] as const
                ).map(([k, l, optional]) => (
                  <div key={k} className="space-y-1.5">
                    <span className="text-xs font-bold text-[var(--p-soft)]">{l}</span>
                    <PSelect
                      label={l}
                      value={cols[k] || "none"}
                      onChange={(v) => setCols((c) => ({ ...c, [k]: v === "none" ? "" : v }))}
                      options={[
                        ...(optional ? [{ value: "none", label: "بدون" }] : []),
                        ...headerOptions,
                      ]}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {cols.date === "" && (
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-[var(--p-soft)]">تاريخ كل الصفوف</span>
                    <input
                      type="date"
                      dir="ltr"
                      className="p-input"
                      max={today}
                      value={defaultDate}
                      onChange={(e) => setDefaultDate(e.target.value)}
                    />
                  </label>
                )}
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-[var(--p-soft)]">
                    اسم الدفعة (يظهر في السجل)
                  </span>
                  <input
                    className="p-input"
                    value={label}
                    maxLength={80}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="مثال: ساعات معرض الخريف"
                  />
                </label>
              </div>

              {parsed.length > 0 && (
                <>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Chip tone="ok">
                      <Check className="size-3" /> {good.length} صف جاهز
                    </Chip>
                    {bad.length > 0 && (
                      <Chip tone="bad">
                        <CircleAlert className="size-3" /> {bad.length} فيها مشكلة وبتنتجاهل
                      </Chip>
                    )}
                    <Chip tone="gold">{hoursLabel(total)}</Chip>
                  </div>
                  <div className="mt-3 max-h-80 overflow-auto rounded-2xl border border-[var(--p-line)]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#0b3328] text-xs text-[var(--p-dim)]">
                        <tr>
                          <th className="px-3 py-2 text-start font-bold">#</th>
                          <th className="px-3 py-2 text-start font-bold">العضو</th>
                          <th className="px-3 py-2 text-start font-bold">الساعات</th>
                          <th className="px-3 py-2 text-start font-bold">التاريخ</th>
                          <th className="px-3 py-2 text-start font-bold">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...bad, ...good].slice(0, 300).map((p) => (
                          <tr key={p.line} className="border-t border-[var(--p-line)]">
                            <td className="px-3 py-2 text-[var(--p-dim)]">{p.line}</td>
                            <td className="px-3 py-2">
                              {p.member ? (
                                <span className="flex items-center gap-2">
                                  <Avatar name={p.member.full_name} size={24} />
                                  {p.member.full_name}
                                </span>
                              ) : (
                                <span className="text-[var(--p-dim)]">{p.raw || "—"}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">{p.hours ?? "—"}</td>
                            <td className="px-3 py-2" dir="ltr">
                              {p.date ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              {p.problem ? (
                                <span className="text-xs text-[var(--p-bad)]">{p.problem}</span>
                              ) : (
                                <Check className="size-4 text-[var(--p-ok)]" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="p-btn-gold h-11 flex-1"
                      onClick={run}
                      disabled={!good.length || !label.trim() || importHours.isPending}
                    >
                      {importHours.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      استورد {good.length} صف
                    </button>
                    <button
                      type="button"
                      className="p-btn-ghost h-11"
                      onClick={() => setSheet(null)}
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      <Panel title="سجل الاستيراد">
        {(imports.data ?? []).length === 0 && (
          <p className="text-sm text-[var(--p-dim)]">ما فيه استيرادات للحين</p>
        )}
        <ul className="space-y-2">
          {(imports.data ?? []).map((x) => (
            <li
              key={x.id}
              className={cn(
                "p-well flex flex-wrap items-center gap-3 px-4 py-3",
                x.undone_at && "opacity-60",
              )}
            >
              <FileSpreadsheet className="size-5 shrink-0 text-[var(--p-gold-soft)]" />
              <span className="min-w-0 flex-1">
                <b className={cn("block text-sm", x.undone_at && "line-through")}>{x.label}</b>
                <span className="text-xs text-[var(--p-dim)]">
                  {fmt(x.rows)} صف · {hoursLabel(x.total_hours)} · {relativeTime(x.created_at)}
                  {x.created_by === me.id ? "" : ` · ${dir?.member(x.created_by)?.full_name ?? ""}`}
                </span>
              </span>
              {x.undone_at ? (
                <Chip tone="dim">تراجعت عنه</Chip>
              ) : (
                <button
                  type="button"
                  className="p-btn-ghost h-9 text-sm"
                  onClick={() => setUndo(x.id)}
                >
                  <Undo2 className="size-4" /> تراجع
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <AlertDialog open={!!undo} onOpenChange={(o) => !o && setUndo(null)}>
        <AlertDialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[#08291f]">
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle className="font-display text-xl">
              تتراجع عن الاستيراد؟
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-7 text-[var(--p-soft)]">
              بتنشال كل الساعات اللي دخلت من هذا الملف من حسابات الأعضاء والترتيب
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              className="p-btn"
              onClick={() =>
                undo &&
                undoImport.mutate(undo, {
                  onSuccess: () => toast("تراجعت عن الاستيراد"),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              تراجع
            </AlertDialogAction>
            <AlertDialogCancel className="p-btn-ghost mt-0 h-11 bg-transparent">
              لا
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ───────────────────────── semesters ───────────────────────── */

function Semesters() {
  const semesters = useSemesters();
  const save = useSaveSemester();
  const [edit, setEdit] = useState<(Omit<Semester, "id"> & { id: number | null }) | null>(null);
  const today = todayISO();

  async function submit() {
    if (!edit) return;
    try {
      await save.mutateAsync(edit);
      toast.success("حُفظ الفصل");
      setEdit(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const bad =
    !!edit &&
    (edit.name.trim().length < 3 ||
      !edit.starts_on ||
      !edit.ends_on ||
      edit.ends_on <= edit.starts_on);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarRange}
        title="الفصول الدراسية"
        subtitle="تحدد فترات المستويات والشهادات ولوحة «الفصل كامل»"
        actions={
          <button
            type="button"
            className="p-btn"
            onClick={() => setEdit({ id: null, name: "", starts_on: today, ends_on: today })}
          >
            <Plus className="size-4" /> فصل جديد
          </button>
        }
      />
      <AnimatePresence>
        {edit && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Panel title={edit.id ? "تعديل الفصل" : "فصل جديد"}>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  className="p-input"
                  placeholder="مثال: الفصل الثاني 1448"
                  value={edit.name}
                  maxLength={60}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
                <input
                  type="date"
                  dir="ltr"
                  className="p-input"
                  value={edit.starts_on}
                  onChange={(e) => setEdit({ ...edit, starts_on: e.target.value })}
                  aria-label="البداية"
                />
                <input
                  type="date"
                  dir="ltr"
                  className="p-input"
                  value={edit.ends_on}
                  onChange={(e) => setEdit({ ...edit, ends_on: e.target.value })}
                  aria-label="النهاية"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="p-btn h-11"
                  onClick={submit}
                  disabled={bad || save.isPending}
                >
                  {save.isPending && <Loader2 className="size-4 animate-spin" />} حفظ
                </button>
                <button type="button" className="p-btn-ghost h-11" onClick={() => setEdit(null)}>
                  إلغاء
                </button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(semesters.data ?? []).map((s, i) => {
          const now = s.starts_on <= today && s.ends_on >= today;
          return (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "p-card flex items-center gap-3 p-4",
                now && "border-[rgb(198_164_92/0.4)]",
              )}
            >
              <CalendarRange
                className={cn("size-5", now ? "text-[var(--p-gold-soft)]" : "text-[var(--p-dim)]")}
              />
              <span className="min-w-0 flex-1">
                <b className="block">{s.name}</b>
                <span className="text-xs text-[var(--p-dim)]">
                  {shortDate(s.starts_on)} ← {shortDate(s.ends_on)}
                </span>
              </span>
              {now && <Chip tone="gold">الحالي</Chip>}
              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl text-[var(--p-dim)] hover:bg-[rgb(200_222_211/0.07)] hover:text-[var(--p-text)]"
                onClick={() => setEdit({ ...s })}
                aria-label={`تعديل ${s.name}`}
              >
                <Pencil className="size-4" />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────── members & capabilities ───────────────────────── */

const CAPS: { id: Capability; label: string; hint: string }[] = [
  { id: "accounts", label: "الحسابات", hint: "يدعو أي عضو ويرسل له رابط كلمة مرور" },
  { id: "hours", label: "الساعات", hint: "يستورد الساعات ويدير الفصول" },
  { id: "surveys", label: "الاستبيانات", hint: "ينشر استبيانات لكل الأعضاء" },
  { id: "projects", label: "المشاريع", hint: "ينشئ المشاريع ويحدد قادتها" },
];

function MembersAdmin() {
  const me = useMe();
  const { dir } = useDirectory();
  const inactive = useInactiveMembers(true);
  const { setActive, setCaps } = useAdminActions();
  const [q, setQ] = useState("");
  const [off, setOff] = useState<Member | null>(null);
  const list = useMemo(() => {
    const t = q.trim();
    const all = (dir?.members ?? []).filter((m) => !isLeadership(m));
    const withCaps = all.filter((m) => m.capabilities.length);
    if (!t) return withCaps;
    return all
      .filter((m) => m.full_name.includes(t) || (m.member_code ?? "").includes(t))
      .slice(0, 30);
  }, [dir, q]);

  function toggle(m: Member, cap: Capability) {
    const caps = m.capabilities.includes(cap)
      ? m.capabilities.filter((c) => c !== cap)
      : [...m.capabilities, cap];
    setCaps.mutate(
      { id: m.id, caps },
      {
        onSuccess: () => toast.success(`صلاحيات ${m.full_name.split(" ")[0]} انحفظت`),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="الصلاحيات والعضويات"
        subtitle="امنح صلاحيات إضافية لأعضاء محددين، أو أوقف عضوية"
      />
      <Panel>
        <ul className="mb-4 grid gap-2 sm:grid-cols-2">
          {CAPS.map((c) => (
            <li key={c.id} className="p-well px-3 py-2 text-xs leading-6">
              <b className="text-[var(--p-gold-soft)]">{c.label}</b> ·{" "}
              <span className="text-[var(--p-soft)]">{c.hint}</span>
            </li>
          ))}
        </ul>
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-[var(--p-dim)]" />
          <input
            className="p-input ps-10"
            placeholder="ابحث عن عضو لتعديل صلاحياته"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {!q.trim() && (
          <p className="mt-3 text-xs text-[var(--p-dim)]">
            {list.length
              ? "اللي عندهم صلاحيات إضافية:"
              : "ما فيه أحد عنده صلاحيات إضافية، ابحث عن عضو"}
          </p>
        )}
        <ul className="mt-2 space-y-1.5">
          {list.map((m) => (
            <motion.li
              key={m.id}
              layout
              className="flex flex-wrap items-center gap-3 rounded-2xl px-2 py-2 hover:bg-[rgb(200_222_211/0.04)]"
            >
              <Avatar name={m.full_name} size={34} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{m.full_name}</b>
                <span className="text-xs text-[var(--p-dim)]">
                  {dir?.committee(m.committee_id)?.name ?? ""} · {titleOf(m)}
                </span>
              </span>
              <div className="flex flex-wrap gap-1">
                {CAPS.map((c) => {
                  const on = m.capabilities.includes(c.id);
                  return (
                    <motion.button
                      key={c.id}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => toggle(m, c.id)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                        on
                          ? "border-transparent bg-[var(--p-gold)] text-[#1d1606]"
                          : "border-[var(--p-line-strong)] text-[var(--p-soft)] hover:text-[var(--p-text)]",
                      )}
                    >
                      {c.label}
                    </motion.button>
                  );
                })}
              </div>
              {m.id !== me.id && (
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-xl text-[var(--p-dim)] hover:bg-[rgb(242_165_142/0.1)] hover:text-[var(--p-bad)]"
                  onClick={() => setOff(m)}
                  aria-label={`إيقاف عضوية ${m.full_name}`}
                  title="إيقاف العضوية"
                >
                  <UserX className="size-4" />
                </button>
              )}
            </motion.li>
          ))}
        </ul>
      </Panel>

      <Panel
        title={
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <UserCog className="size-5 text-[var(--p-dim)]" /> عضويات موقوفة
          </h2>
        }
      >
        {(inactive.data ?? []).length === 0 ? (
          <p className="text-sm text-[var(--p-dim)]">ما فيه عضويات موقوفة</p>
        ) : (
          <ul className="space-y-1.5">
            {(inactive.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                <Avatar name={m.full_name} size={34} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-[var(--p-soft)]">{m.full_name}</b>
                  <span className="text-xs text-[var(--p-dim)]">
                    {dir?.committee(m.committee_id)?.name ?? ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="p-btn-ghost h-9 text-sm"
                  onClick={() =>
                    setActive.mutate(
                      { id: m.id, active: true },
                      {
                        onSuccess: () => toast.success(`رجعت عضوية ${m.full_name}`),
                        onError: (e) => toast.error(errorMessage(e)),
                      },
                    )
                  }
                >
                  <UserCheck className="size-4" /> إرجاع
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <AlertDialog open={!!off} onOpenChange={(o) => !o && setOff(null)}>
        <AlertDialogContent className="rounded-3xl border-[var(--p-line-strong)] bg-[#08291f]">
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle className="font-display text-xl">
              توقف عضوية {off?.full_name}؟
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-7 text-[var(--p-soft)]">
              ما يقدر يدخل البوابة، ويختفي من المجتمع والصدارة. ساعاته المعتمدة تبقى محفوظة، وتقدر
              ترجّع العضوية أي وقت
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              className="p-btn bg-[var(--p-bad)] text-[#2a0d06] hover:bg-[var(--p-bad)]"
              onClick={() =>
                off &&
                setActive.mutate(
                  { id: off.id, active: false },
                  {
                    onSuccess: () => toast(`أُوقفت عضوية ${off.full_name}`),
                    onError: (e) => toast.error(errorMessage(e)),
                  },
                )
              }
            >
              أوقف العضوية
            </AlertDialogAction>
            <AlertDialogCancel className="p-btn-ghost mt-0 h-11 bg-transparent">
              لا
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
