import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoAccounts, initialTasks, members, type DemoAccount, type Member, type Task, type TaskStatus } from "@/data/demo";

// Demo-only auth: verifies against open sample credentials and stores ONLY the member id
// (never a password) in sessionStorage. Replace with real auth when a backend is connected.
const KEY = "ethmar-demo-member";

type Ctx = {
  ready: boolean;
  member: Member | null;
  account: DemoAccount | null;
  login: (id: string, password: string) => boolean;
  logout: () => void;
  tasks: Task[];
  setTaskStatus: (id: string, status: TaskStatus) => void;
  setTaskProgress: (id: string, progress: number) => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  useEffect(() => {
    setMemberId(sessionStorage.getItem(KEY));
    setReady(true);
  }, []);

  const login = useCallback((id: string, password: string) => {
    const q = id.trim().toLowerCase();
    const acc = demoAccounts.find((a) => (a.login === q || a.memberCode.toLowerCase() === q) && a.password === password);
    if (!acc) return false;
    sessionStorage.setItem(KEY, acc.memberId);
    setMemberId(acc.memberId);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setMemberId(null);
  }, []);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, progress: status === "done" ? 100 : status === "new" ? 0 : Math.max(t.progress, 10) } : t)));
  }, []);
  const setTaskProgress = useCallback((id: string, progress: number) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, progress, status: progress >= 100 ? "done" : progress > 0 ? "active" : t.status } : t)));
  }, []);

  const value = useMemo<Ctx>(() => ({
    ready,
    member: members.find((m) => m.id === memberId) ?? null,
    account: demoAccounts.find((a) => a.memberId === memberId) ?? null,
    login, logout, tasks, setTaskStatus, setTaskProgress,
  }), [ready, memberId, login, logout, tasks, setTaskStatus, setTaskProgress]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useDemoAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useDemoAuth must be used inside DemoAuthProvider");
  return c;
}
