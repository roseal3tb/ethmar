import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Member } from "./types";

type Status = "loading" | "signed-out" | "unlinked" | "ready";
interface SessionValue {
  status: Status;
  me: Member | null;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Keeps track of the signed-in account and its member record. Client-only: the session lives in the browser. */
export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    api
      .currentUserId()
      .then((id) => alive && setUid(id))
      .catch(() => alive && setUid(null));
    const off = api.onAuthChange((id) => {
      setUid((prev) => {
        if (prev !== id) qc.removeQueries({ queryKey: ["portal"] });
        return id;
      });
    });
    return () => {
      alive = false;
      off();
    };
  }, [qc]);

  const meQuery = useQuery({
    queryKey: ["portal", "me", uid],
    queryFn: () => api.me(),
    enabled: !!uid,
    staleTime: 60_000,
  });

  const status: Status =
    uid === undefined || (uid && meQuery.isPending)
      ? "loading"
      : !uid
        ? "signed-out"
        : meQuery.data
          ? "ready"
          : "unlinked";

  const value: SessionValue = {
    status,
    me: meQuery.data ?? null,
    signOut: async () => {
      await api.signOut();
      qc.removeQueries({ queryKey: ["portal"] });
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession outside PortalSessionProvider");
  return v;
}

/** The signed-in member. Only call below the portal's ready state. */
export function useMe(): Member {
  const { me } = useSession();
  if (!me) throw new Error("useMe before the session is ready");
  return me;
}
