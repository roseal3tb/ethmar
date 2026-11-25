import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "./api";
import type { Board, Member, NewTask, Structure, TaskStatus } from "./types";

const k = (...parts: unknown[]) => ["portal", ...parts];

export function useStructure() {
  return useQuery({
    queryKey: k("structure"),
    queryFn: () => api.structure(),
    staleTime: 5 * 60_000,
  });
}

/** Fast lookups over the structure: member/committee/team by id. */
export function useDirectory() {
  const q = useStructure();
  const dir = useMemo(() => (q.data ? buildDirectory(q.data) : null), [q.data]);
  return { ...q, dir };
}
export type Directory = ReturnType<typeof buildDirectory>;
export function buildDirectory(s: Structure) {
  const members = new Map(s.members.map((m) => [m.id, m]));
  const committees = new Map(s.committees.map((c) => [c.id, c]));
  const teams = new Map(s.teams.map((t) => [t.id, t]));
  return {
    ...s,
    member: (id: string | null | undefined): Member | undefined =>
      id ? members.get(id) : undefined,
    committee: (id: string | null | undefined) => (id ? committees.get(id) : undefined),
    team: (id: string | null | undefined) => (id ? teams.get(id) : undefined),
    teamsOf: (committeeId: string) => s.teams.filter((t) => t.committee_id === committeeId),
    membersOf: (committeeId: string) => s.members.filter((m) => m.committee_id === committeeId),
  };
}

export const useMemberTiers = () =>
  useQuery({ queryKey: k("tiers"), queryFn: () => api.memberTiers(), staleTime: 5 * 60_000 });
export const useTasks = () =>
  useQuery({ queryKey: k("tasks"), queryFn: () => api.tasks(), refetchInterval: 60_000 });
export const useSummary = () => useQuery({ queryKey: k("summary"), queryFn: () => api.summary() });
export const useLeaderboard = (board: Board, from: string, to: string) =>
  useQuery({
    queryKey: k("leaderboard", board, from, to),
    queryFn: () => api.leaderboard(board, from, to),
  });
export const useMyHours = () => useQuery({ queryKey: k("hours"), queryFn: () => api.myHours() });
export const useMemberStats = (from: string, to: string, enabled = true) =>
  useQuery({ queryKey: k("stats", from, to), queryFn: () => api.memberStats(from, to), enabled });
export const useNotifications = () =>
  useQuery({
    queryKey: k("notifications"),
    queryFn: () => api.notifications(),
    refetchInterval: 60_000,
  });
export const useMemberEmails = (enabled: boolean) =>
  useQuery({ queryKey: k("emails"), queryFn: () => api.memberEmails(), enabled });

/** Mutations refresh everything that might have changed (tasks, hours, ranks, notifications). */
function useRefreshingMutation<A>(fn: (a: A) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      for (const key of [
        "tasks",
        "summary",
        "hours",
        "leaderboard",
        "stats",
        "tiers",
        "notifications",
      ])
        qc.invalidateQueries({ queryKey: k(key) });
    },
  });
}

export const useClaim = () => useRefreshingMutation((id: string) => api.claimTask(id));
export const useUnclaim = () => useRefreshingMutation((id: string) => api.unclaimTask(id));
export const useSubmit = () =>
  useRefreshingMutation((a: { taskId: string; note: string; link: string }) =>
    api.submitTask(a.taskId, a.note, a.link),
  );
export const useReview = () =>
  useRefreshingMutation((a: { taskId: string; memberId: string; approve: boolean; note: string }) =>
    api.reviewTask(a.taskId, a.memberId, a.approve, a.note),
  );
export const useSetTaskStatus = () =>
  useRefreshingMutation((a: { taskId: string; status: TaskStatus }) =>
    api.setTaskStatus(a.taskId, a.status),
  );
export const useCreateTask = () => useRefreshingMutation((t: NewTask) => api.createTask(t));
export const useMarkRead = () =>
  useRefreshingMutation((ids?: string[]) => api.markNotificationsRead(ids));

export function useAccountActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: k("structure") });
    qc.invalidateQueries({ queryKey: k("emails") });
  };
  return {
    create: useMutation({
      mutationFn: (a: { memberId: string; email: string }) =>
        api.createAccount(a.memberId, a.email),
      onSuccess: done,
    }),
    reset: useMutation({
      mutationFn: (memberId: string) => api.resetPassword(memberId),
      onSuccess: done,
    }),
  };
}
