import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DemoAuthProvider, useDemoAuth } from "@/lib/demo-auth";

const wrapper = ({ children }: { children: ReactNode }) => (
  <DemoAuthProvider>{children}</DemoAuthProvider>
);
const setup = () => renderHook(() => useDemoAuth(), { wrapper });

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("DemoAuthProvider", () => {
  it("logs in with the demo email or member code and stores only the member id", () => {
    const { result } = setup();
    expect(result.current.ready).toBe(true);
    let ok = false;
    act(() => {
      ok = result.current.login("ROSE@demo.ethmar ", "demo1234");
    });
    expect(ok).toBe(true);
    expect(result.current.member?.name).toBe("روز عبدالله العتيبي");
    expect(sessionStorage.getItem("ethmar-demo-member")).toBe("u1");
    expect(localStorage.getItem("ethmar-demo-member")).toBeNull();
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("demo1234");

    act(() => result.current.logout());
    expect(result.current.member).toBeNull();
    act(() => {
      ok = result.current.login("ETH-1001", "demo1234");
    });
    expect(ok).toBe(true);
  });

  it("rejects wrong credentials", () => {
    const { result } = setup();
    let ok = true;
    act(() => {
      ok = result.current.login("rose@demo.ethmar", "nope");
    });
    expect(ok).toBe(false);
    expect(result.current.member).toBeNull();
  });

  it("remember me persists the member id in localStorage; logout clears it", () => {
    const { result } = setup();
    act(() => {
      result.current.login("rose@demo.ethmar", "demo1234", true);
    });
    expect(localStorage.getItem("ethmar-demo-member")).toBe("u1");
    act(() => result.current.logout());
    expect(localStorage.getItem("ethmar-demo-member")).toBeNull();
    expect(sessionStorage.getItem("ethmar-demo-member")).toBeNull();
  });

  it("restores a stored session on mount", () => {
    sessionStorage.setItem("ethmar-demo-member", "u1");
    const { result } = setup();
    expect(result.current.member?.id).toBe("u1");
  });

  it("never changes verified hours when a task is completed", () => {
    const { result } = setup();
    const before = result.current.tasks.find((t) => t.id === "t1")!;
    act(() => result.current.setTaskStatus("t1", "done"));
    const done = result.current.tasks.find((t) => t.id === "t1")!;
    expect(done.status).toBe("done");
    expect(done.progress).toBe(100);
    expect(done.verifiedHours).toBe(before.verifiedHours);

    act(() => result.current.setTaskProgress("t1", 60));
    const t = result.current.tasks.find((x) => x.id === "t1")!;
    expect(t.status).toBe("active");
    expect(t.verifiedHours).toBe(before.verifiedHours);
  });

  it("keeps progress and status consistent", () => {
    const { result } = setup();
    act(() => result.current.setTaskStatus("t2", "active"));
    expect(result.current.tasks.find((t) => t.id === "t2")!.progress).toBe(10);
    act(() => result.current.setTaskProgress("t2", 100));
    expect(result.current.tasks.find((t) => t.id === "t2")!.status).toBe("done");
    act(() => result.current.setTaskStatus("t2", "active"));
    expect(result.current.tasks.find((t) => t.id === "t2")!.progress).toBe(90);
  });

  it("keeps profile edits in memory only", () => {
    const { result } = setup();
    act(() => {
      result.current.login("rose@demo.ethmar", "demo1234");
    });
    act(() => result.current.updateProfile({ displayName: "روز" }));
    expect(result.current.profile?.displayName).toBe("روز");
    expect(result.current.member?.name).toBe("روز عبدالله العتيبي");
    // Only the member id is ever written to storage.
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem("ethmar-demo-member")).toBe("u1");
    expect(localStorage.length).toBe(0);
  });
});
