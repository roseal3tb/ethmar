import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  demoAccounts,
  initialTasks,
  members,
  type DemoAccount,
  type Member,
  type Task,
  type TaskStatus,
} from "@/data/demo";

// Demo-only auth: verifies against open sample credentials and stores ONLY the member id
// (never a password) in browser storage. sessionStorage by default; localStorage only when
// the member ticks "remember me". Replace with real auth when a backend is connected.
const KEY = "ethmar-demo-member";

/** Profile fields a member can edit in the demo. Kept in memory only — never persisted. */
export type DemoProfile = { displayName: string; major: string; bio: string };

type Ctx = {
  ready: boolean;
  member: Member | null;
  account: DemoAccount | null;
  login: (id: string, password: string, remember?: boolean) => boolean;
  logout: () => void;
  tasks: Task[];
  setTaskStatus: (id: string, status: TaskStatus) => void;
  setTaskProgress: (id: string, progress: number) => void;
  /** Demo-only profile edits for the signed-in member (in-memory, cleared on reload). */
  profile: DemoProfile | null;
  updateProfile: (patch: Partial<DemoProfile>) => void;
};

const AuthCtx = createContext<Ctx | null>(null);

function readStoredId(): string | null {
  try {
    return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [profiles, setProfiles] = useState<Record<string, Partial<DemoProfile>>>({});

  useEffect(() => {
    const id = readStoredId();
    // Ignore anything stored that is not a known demo member id.
    setMemberId(id && members.some((m) => m.id === id) ? id : null);
    setReady(true);
  }, []);

  const login = useCallback((id: string, password: string, remember = false) => {
    const q = id.trim().toLowerCase();
    const acc = demoAccounts.find(
      (a) => (a.login === q || a.memberCode.toLowerCase() === q) && a.password === password,
    );
    if (!acc) return false;
    try {
      sessionStorage.setItem(KEY, acc.memberId);
      if (remember) localStorage.setItem(KEY, acc.memberId);
      else localStorage.removeItem(KEY);
    } catch {
      // Storage may be unavailable (private mode); the session still works in memory.
    }
    setMemberId(acc.memberId);
    return true;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    setMemberId(null);
  }, []);

  // Status and progress are kept in sync, but verified hours are never touched here:
  // completing a task does not certify volunteer hours.
  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const progress =
          status === "done"
            ? 100
            : status === "new"
              ? 0
              : t.status === "done"
                ? Math.min(t.progress, 90)
                : Math.max(t.progress, 10);
        return { ...t, status, progress };
      }),
    );
  }, []);
  const setTaskProgress = useCallback((id: string, progress: number) => {
    const p = Math.max(0, Math.min(100, Math.round(progress)));
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const status: TaskStatus =
          p >= 100 ? "done" : p > 0 ? "active" : t.status === "done" ? "active" : t.status;
        return { ...t, progress: p, status };
      }),
    );
  }, []);

  const member = members.find((m) => m.id === memberId) ?? null;

  const updateProfile = useCallback(
    (patch: Partial<DemoProfile>) => {
      if (!memberId) return;
      setProfiles((p) => ({ ...p, [memberId]: { ...p[memberId], ...patch } }));
    },
    [memberId],
  );

  const profile = useMemo<DemoProfile | null>(() => {
    if (!member) return null;
    const o = profiles[member.id] ?? {};
    return { displayName: o.displayName ?? member.name, major: o.major ?? "", bio: o.bio ?? "" };
  }, [member, profiles]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      member,
      account: demoAccounts.find((a) => a.memberId === memberId) ?? null,
      login,
      logout,
      tasks,
      setTaskStatus,
      setTaskProgress,
      profile,
      updateProfile,
    }),
    [
      ready,
      member,
      memberId,
      login,
      logout,
      tasks,
      setTaskStatus,
      setTaskProgress,
      profile,
      updateProfile,
    ],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useDemoAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useDemoAuth must be used inside DemoAuthProvider");
  return c;
}
