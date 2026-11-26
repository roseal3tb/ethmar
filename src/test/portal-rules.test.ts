import { beforeEach, describe, expect, it } from "vitest";
import { mockApi, resetMock } from "@/lib/portal/mock-api";
import { addDays, todayISO } from "@/lib/portal/dates";
import { boardOf, canClaim, canReview, canViewHoursOf } from "@/lib/portal/permissions";
import { groupTasks, weekEnd } from "@/lib/portal/task-view";
import type { Member, Task } from "@/lib/portal/types";

// The mock API follows the same rules as the database functions; these tests pin the rules
// agreed with the initiative (who sees, claims, reviews, and whose hours are visible).

async function as(email: string) {
  await mockApi.signOut();
  await mockApi.signIn(email, "ethmar123");
  return (await mockApi.me())!;
}
const byName = async (name: string) =>
  (await mockApi.structure()).members.find((m) => m.full_name === name)!;

beforeEach(() => resetMock());

describe("task visibility", () => {
  it("a team task is hidden from the other team of the same committee", async () => {
    await as("member@ethmar.test"); // منى — فريق التواصل الخارجي
    const ids = (await mockApi.tasks()).map((t) => t.id);
    expect(ids).toContain("t1"); // her team
    expect(ids).toContain("t2"); // جماعية للجنة
    expect(ids).not.toContain("t3"); // فريق المساندة والإمداد
    expect(ids).not.toContain("t5"); // another committee
  });

  it("committee leads see every task of their committee, leadership sees all", async () => {
    await as("lead@ethmar.test");
    const lead = (await mockApi.tasks()).map((t) => t.id);
    expect(lead).toEqual(expect.arrayContaining(["t1", "t2", "t3", "t4", "t6"]));
    expect(lead).not.toContain("t5");
    await as("vp@ethmar.test");
    expect((await mockApi.tasks()).length).toBe(7);
  });
});

describe("claiming", () => {
  it("lets a member claim an open task of their team, once, and fills seats", async () => {
    await as("member@ethmar.test");
    await mockApi.claimTask("t2");
    await expect(mockApi.claimTask("t2")).rejects.toMatchObject({ code: "already_claimed" });
    const t2 = (await mockApi.tasks()).find((t) => t.id === "t2")!;
    expect(t2.assignments).toHaveLength(3);
  });

  it("refuses a task of another team", async () => {
    await as("member@ethmar.test");
    await expect(mockApi.claimTask("t3")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("review", () => {
  it("team head approves their team; hours land on the member", async () => {
    await as("member@ethmar.test");
    await mockApi.claimTask("t2");
    await mockApi.submitTask("t2", "تم", "https://example.com");
    const mona = await mockApi.me();
    const before = (await mockApi.summary())!.semester_hours;
    await as("teamlead@ethmar.test"); // فهد — قائد فريق التواصل الخارجي
    await mockApi.reviewTask("t2", mona!.id, true, "");
    await as("member@ethmar.test");
    expect((await mockApi.summary())!.semester_hours).toBe(before + 4);
  });

  it("returning work requires a note", async () => {
    await as("lead@ethmar.test");
    const yasser = await byName("ياسر العمرو");
    await expect(mockApi.reviewTask("t1", yasser.id, false, "")).rejects.toMatchObject({
      code: "note_required",
    });
    await mockApi.reviewTask("t1", yasser.id, false, "أضف جدول الزيارة");
    const a = (await mockApi.tasks())
      .find((t) => t.id === "t1")!
      .assignments.find((x) => x.member_id === yasser.id)!;
    expect(a.status).toBe("returned");
  });

  it("a team head cannot review someone from the other team", async () => {
    const me = await as("teamlead@ethmar.test");
    const yazeed = await byName("يزيد الرويتع"); // فريق المساندة
    const t2 = { audience: "committee", committee_id: "pr" } as Task;
    expect(canReview(me, t2, yazeed)).toBe(false);
  });
});

describe("hours privacy and boards", () => {
  it("only the viewer's own hours appear on the leaderboard", async () => {
    await as("member@ethmar.test");
    const rows = await mockApi.leaderboard("members", addDays(todayISO(), -200), todayISO());
    expect(rows.filter((r) => r.hours != null)).toHaveLength(1);
    expect(rows.find((r) => r.is_me)?.hours).not.toBeNull();
  });

  it("committee heads don't see other committee heads' numbers", async () => {
    const lead = await as("lead@ethmar.test");
    const deputy = await byName("العنود الشويعر");
    const teamLead = await byName("فهد العقيل");
    expect(canViewHoursOf(lead, deputy)).toBe(false);
    expect(canViewHoursOf(lead, teamLead)).toBe(true);
    const stats = await mockApi.memberStats(addDays(todayISO(), -30), todayISO());
    expect(stats.every((s) => s.committee_id === "pr" && s.role !== "committee_deputy")).toBe(true);
  });

  it("puts members, team heads and project leads on the right board", () => {
    expect(boardOf("member")).toBe("members");
    expect(boardOf("team_supervisor")).toBe("leaders");
    expect(boardOf("project_lead")).toBe("leaders");
    expect(boardOf("president")).toBeNull();
  });
});

describe("task creation", () => {
  it("committee leads create for their committee only; leadership creates leaders tasks", async () => {
    await as("lead@ethmar.test");
    const base = {
      title: "مهمة",
      description: "",
      team_id: null,
      mode: "open" as const,
      seats: 2,
      hours: 2,
      due_date: addDays(todayISO(), 3),
      targets: [],
    };
    await expect(
      mockApi.createTask({ ...base, audience: "committee", committee_id: "media" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      mockApi.createTask({ ...base, audience: "leaders", committee_id: null }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(
      await mockApi.createTask({ ...base, audience: "committee", committee_id: "pr" }),
    ).toBeTruthy();
    await as("vp@ethmar.test");
    expect(
      await mockApi.createTask({ ...base, audience: "leaders", committee_id: null }),
    ).toBeTruthy();
  });
});

describe("agenda grouping", () => {
  it("groups by Saudi week (Sunday → Saturday) and sinks finished tasks", () => {
    const today = "2026-11-25"; // Wednesday
    expect(weekEnd(today)).toBe("2026-11-28");
    const me = { id: "x" } as Member;
    const t = (id: string, due: string, status: Task["status"] = "active") =>
      ({ id, title: id, due_date: due, status, assignments: [] }) as unknown as Task;
    const groups = groupTasks(
      [
        t("a", "2026-11-20"),
        t("b", "2026-11-27"),
        t("c", "2026-12-02"),
        t("d", "2026-12-20"),
        t("e", "2026-11-26", "closed"),
      ],
      me,
      today,
    );
    expect(groups.map((g) => [g.id, g.tasks.map((x) => x.id)])).toEqual([
      ["late", ["a"]],
      ["week", ["b"]],
      ["next", ["c"]],
      ["later", ["d"]],
      ["done", ["e"]],
    ]);
    expect(canClaim(me, t("z", "2026-11-20"), today)).toBe(false);
  });

  it("a closed task I still hold stays in my timeline", () => {
    const today = "2026-11-25";
    const me = { id: "x" } as Member;
    const held = {
      id: "h",
      title: "h",
      due_date: "2026-11-27",
      status: "closed",
      assignments: [{ member_id: "x", status: "claimed" }],
    } as unknown as Task;
    expect(groupTasks([held], me, today).map((g) => g.id)).toEqual(["week"]);
  });
});

describe("closing vs cancelling", () => {
  it("closing stops new claims but the holder can still submit; cancelling stops both", async () => {
    await as("member@ethmar.test");
    await mockApi.claimTask("t2");
    await as("lead@ethmar.test");
    await mockApi.setTaskStatus("t2", "closed");
    await as("member@ethmar.test");
    await expect(mockApi.submitTask("t2", "", "")).resolves.toBeUndefined();
    await as("lead@ethmar.test");
    await mockApi.setTaskStatus("t1", "cancelled");
    await as("member@ethmar.test");
    await expect(mockApi.claimTask("t1")).rejects.toThrow();
  });
});

describe("who may invite whom", () => {
  it("leads invite only their own people; leadership and the admin invite anyone", async () => {
    const yazeed = await byName("يزيد الرويتع"); // العلاقات العامة · المساندة
    const mona = await byName("منى الروقي"); // العلاقات العامة · التواصل
    const faris = await byName("فارس العتيبي"); // another committee
    const raed = await byName("رائد المطيري");

    await as("lead@ethmar.test"); // قائد لجنة العلاقات العامة
    await expect(mockApi.inviteMember(yazeed.id, "y@example.com")).resolves.toBeTruthy();
    await expect(mockApi.inviteMember(faris.id, "f@example.com")).rejects.toThrow();
    await expect(mockApi.inviteMember(raed.id, "r@example.com")).rejects.toThrow();

    await as("teamlead@ethmar.test"); // قائد فريق التواصل
    await expect(mockApi.inviteMember(mona.id, "m@example.com")).resolves.toBeTruthy();
    await expect(mockApi.inviteMember(yazeed.id, "y2@example.com")).rejects.toThrow();
    const seen = Object.keys(await mockApi.memberEmails());
    expect(seen).not.toContain(yazeed.id);

    await as("member@ethmar.test");
    await expect(mockApi.inviteMember(yazeed.id, "y3@example.com")).rejects.toThrow();

    await as("rose@ethmar.test");
    await expect(mockApi.inviteMember(faris.id, "f@example.com")).resolves.toBeTruthy();
  });

  it("an activated account keeps its login email", async () => {
    await as("rose@ethmar.test");
    const vp = await byName("غادة العتيبي");
    await expect(mockApi.inviteMember(vp.id, "other@example.com")).rejects.toThrow();
  });
});
