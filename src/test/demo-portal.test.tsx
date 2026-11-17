import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { members, months, tiers, initialTasks, tierForHours } from "@/data/demo";
import { DemoAuthProvider, useDemoAuth } from "@/lib/demo-auth";
import { isPortalView } from "@/components/portal/portal-ui";

function AuthTestHarness() {
  const auth = useDemoAuth();
  return <section>
    <p data-testid="ready">{auth.ready ? "ready" : "loading"}</p>
    <p data-testid="member">{auth.member?.name || "guest"}</p>
    <p data-testid="verified">{auth.tasks.find((t) => t.id === "t1")?.verifiedHours}</p>
    <p data-testid="progress">{auth.tasks.find((t) => t.id === "t1")?.progress}</p>
    <button onClick={() => auth.login("rose@demo.ethmar", "demo1234", true)}>Demo login</button>
    <button onClick={() => auth.login("ETH-1001", "demo1234")}>Member ID login</button>
    <button onClick={() => auth.login("rose@demo.ethmar", "wrong")}>Invalid login</button>
    <button onClick={() => auth.setTaskProgress("t1", 100)}>Complete</button>
    <button onClick={() => auth.setTaskStatus("t1", "active")}>Activate</button>
    <button onClick={() => auth.logout()}>Logout</button>
  </section>;
}

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

describe("Ethmar demo data and portal", () => {
  it("keeps the existing five committees, three months and five tiers", () => {
    expect(months).toHaveLength(3);
    expect(tiers.map((t) => t.id)).toEqual(["bronze", "silver", "gold", "platinum", "diamond"]);
    expect(tierForHours(46).id).toBe("gold");
    expect(members.find((m) => m.id === "u1")?.name).toBe("روز عبدالله العتيبي");
    expect(initialTasks.find((t) => t.id === "t1")?.title).toBe("Portal Frontend Developer");
  });
  it("supports only the five portal tabs", () => {
    expect(isPortalView("tasks")).toBe(true);
    expect(isPortalView("labs")).toBe(true);
    expect(isPortalView("unknown")).toBe(false);
  });
  it("authenticates demo credentials without storing a password, and never auto-verifies hours", async () => {
    render(<DemoAuthProvider><AuthTestHarness /></DemoAuthProvider>);
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("ready"));
    act(() => { screen.getByRole("button", { name: "Invalid login" }).click(); });
    expect(screen.getByTestId("member")).toHaveTextContent("guest");
    act(() => { screen.getByRole("button", { name: "Demo login" }).click(); });
    expect(screen.getByTestId("member")).toHaveTextContent("روز عبدالله العتيبي");
    expect(localStorage.getItem("ethmar-demo-remembered-member")).toBe("u1");
    expect(JSON.stringify(localStorage)).not.toContain("demo1234");
    act(() => { screen.getByRole("button", { name: "Complete" }).click(); });
    expect(screen.getByTestId("progress")).toHaveTextContent("100");
    expect(screen.getByTestId("verified")).toHaveTextContent("8");
    act(() => { screen.getByRole("button", { name: "Activate" }).click(); });
    expect(screen.getByTestId("progress")).toHaveTextContent("90");
    expect(screen.getByTestId("verified")).toHaveTextContent("8");
    act(() => { screen.getByRole("button", { name: "Logout" }).click(); });
    expect(screen.getByTestId("member")).toHaveTextContent("guest");
    expect(localStorage.getItem("ethmar-demo-remembered-member")).toBeNull();
  });
});
