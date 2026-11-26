import { describe, expect, it } from "vitest";
import { normName, parseDate, parseHours } from "@/components/portal/AdminPage";

describe("hours import parsing", () => {
  it("reads the date formats people type in Excel", () => {
    expect(parseDate("2026-11-03")).toBe("2026-11-03");
    expect(parseDate("3/11/2026")).toBe("2026-11-03");
    expect(parseDate("٣/١١/٢٠٢٦")).toBe("2026-11-03");
    expect(parseDate(46329)).toBe("2026-11-03");
    expect(parseDate("بكرة")).toBeNull();
  });
  it("reads hours with Arabic digits and commas", () => {
    expect(parseHours("٢")).toBe(2);
    expect(parseHours("1,5")).toBe(1.5);
    expect(parseHours(0)).toBeNull();
    expect(parseHours("")).toBeNull();
  });
  it("matches names regardless of hamza and taa marbuta", () => {
    expect(normName("أسامة  الإبراهيم")).toBe(normName("اسامه الابراهيم"));
  });
});
