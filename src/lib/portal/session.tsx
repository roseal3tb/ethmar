import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { LinkType, Me } from "./types";

type Status = "loading" | "signed-out" | "unlinked" | "ready";
interface SessionValue {
  status: Status;
  me: Me | null;
  /** The emailed link the page was opened with had expired or was already used. */
  linkError: boolean;
  /** Signed in from a «choose a new password» link: ask for the new password before anything else. */
  recovery: boolean;
  clearRecovery: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);
const RECOVERY_KEY = "ethmar-recovery";

/** Keeps track of the signed-in account and its member record. Client-only: the session lives in the browser. */
export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null | undefined>(undefined);

  const [linkError, setLinkError] = useState(false);
  const [recovery, setRecovery] = useState(() => {
    try {
      return sessionStorage.getItem(RECOVERY_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let alive = true;
    // Opened from an emailed invitation / password link: sign in with it first, then tidy the URL.
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as LinkType | null;
    const fromLink =
      tokenHash && type && ["invite", "magiclink", "recovery"].includes(type)
        ? api
            .verifyLink(tokenHash, type)
            .then(() => {
              if (type !== "recovery") return;
              try {
                sessionStorage.setItem(RECOVERY_KEY, "1");
              } catch {
                // the flag only lives for this tab
              }
              if (alive) setRecovery(true);
            })
            .catch(() => {
              if (alive) setLinkError(true);
            })
        : Promise.resolve();
    if (tokenHash) {
      params.delete("token_hash");
      params.delete("type");
      const q = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
    }
    fromLink
      .then(() => api.currentUserId())
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
    linkError,
    recovery,
    clearRecovery: () => {
      try {
        sessionStorage.removeItem(RECOVERY_KEY);
      } catch {
        // ignore
      }
      setRecovery(false);
    },
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
export function useMe(): Me {
  const { me } = useSession();
  if (!me) throw new Error("useMe before the session is ready");
  return me;
}
