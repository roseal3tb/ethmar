import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "./api";
import type {
  Answers,
  Board,
  Capability,
  HourImportRow,
  Member,
  NewSurvey,
  NewTask,
  ProjectFields,
  ProjectStage,
  Semester,
  Structure,
  Submission,
  TaskStatus,
} from "./types";

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
        "achievements",
        "comments",
        "projects",
        "surveys",
        "certificates",
      ])
        qc.invalidateQueries({ queryKey: k(key) });
    },
  });
}

export const useClaim = () => useRefreshingMutation((id: string) => api.claimTask(id));
export const useUnclaim = () => useRefreshingMutation((id: string) => api.unclaimTask(id));
export const useSubmit = () =>
  useRefreshingMutation((a: { taskId: string } & Submission) => api.submitTask(a.taskId, a));
export const useReview = () =>
  useRefreshingMutation(
    (a: {
      taskId: string;
      memberId: string;
      approve: boolean;
      note: string;
      extraOk?: boolean | undefined;
    }) => api.reviewTask(a.taskId, a.memberId, a.approve, a.note, a.extraOk),
  );
export const useSetTaskStatus = () =>
  useRefreshingMutation((a: { taskId: string; status: TaskStatus }) =>
    api.setTaskStatus(a.taskId, a.status),
  );
export const useCreateTask = () =>
  useRefreshingMutation(async (t: NewTask) => {
    const id = await api.createTask(t);
    // Emails go out in the background; the in-portal notifications already exist.
    void api.notifyTask(id).catch(() => undefined);
    return id;
  });
export const useMarkRead = () =>
  useRefreshingMutation((ids?: string[]) => api.markNotificationsRead(ids));

export function useAccountActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: k("structure") });
    qc.invalidateQueries({ queryKey: k("emails") });
  };
  return {
    invite: useMutation({
      mutationFn: (a: { memberId: string; email?: string | undefined }) =>
        api.inviteMember(a.memberId, a.email),
      onSuccess: done,
    }),
    reset: useMutation({
      mutationFn: (memberId: string) => api.resetPassword(memberId),
      onSuccess: done,
    }),
  };
}

// ------------------------------------------------------------------ v3

export const useComments = (taskId: string) =>
  useQuery({
    queryKey: k("comments", taskId),
    queryFn: () => api.comments(taskId),
    refetchInterval: 30_000,
  });
export function useCommentActions(taskId: string) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: k("comments", taskId) });
  return {
    add: useMutation({
      mutationFn: (body: string) => api.addComment(taskId, body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteComment(id), onSuccess: done }),
    react: useMutation({
      mutationFn: (a: { id: string; emoji: string }) => api.toggleReaction(a.id, a.emoji),
      onSuccess: done,
    }),
  };
}

export const useAchievements = () =>
  useQuery({ queryKey: k("achievements"), queryFn: () => api.achievements() });
export const useSemesters = () =>
  useQuery({ queryKey: k("semesters"), queryFn: () => api.semesters(), staleTime: 10 * 60_000 });
export const useSaveSemester = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (x: Omit<Semester, "id"> & { id: number | null }) => api.saveSemester(x),
    onSuccess: () => qc.invalidateQueries({ queryKey: k("semesters") }),
  });
};
export const useCertificates = () =>
  useQuery({ queryKey: k("certificates"), queryFn: () => api.myCertificates() });
export const useIssueCertificate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (semesterId: number | null) => api.issueCertificate(semesterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: k("certificates") }),
  });
};

export const useProjects = () =>
  useQuery({ queryKey: k("projects"), queryFn: () => api.projects(), staleTime: 60_000 });
export function useProjectActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: k("projects") });
    qc.invalidateQueries({ queryKey: ["portal", "me"] });
  };
  return {
    create: useMutation({
      mutationFn: (a: { name: string; tagline: string }) => api.createProject(a.name, a.tagline),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; fields: ProjectFields }) => api.updateProject(a.id, a.fields),
      onSuccess: done,
    }),
    stage: useMutation({
      mutationFn: (a: { id: string; stage: ProjectStage; note: string }) =>
        api.setProjectStage(a.id, a.stage, a.note),
      onSuccess: done,
    }),
    team: useMutation({
      mutationFn: (a: { id: string; members: string[]; leads: string[] | null }) =>
        api.setProjectTeam(a.id, a.members, a.leads),
      onSuccess: done,
    }),
  };
}

export const useSurveys = () =>
  useQuery({ queryKey: k("surveys"), queryFn: () => api.surveys(), refetchInterval: 60_000 });
export const useSurveyResults = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: k("surveys", "results", id),
    queryFn: () => api.surveyResults(id),
    enabled,
  });
export function useSurveyActions() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: k("surveys") });
    qc.invalidateQueries({ queryKey: k("achievements") });
  };
  return {
    create: useMutation({ mutationFn: (x: NewSurvey) => api.createSurvey(x), onSuccess: done }),
    save: useMutation({
      mutationFn: (a: { id: string; answers: Answers; submit: boolean }) =>
        api.saveSurveyResponse(a.id, a.answers, a.submit),
      onSuccess: done,
    }),
    status: useMutation({
      mutationFn: (a: { id: string; status: "open" | "closed" }) =>
        api.setSurveyStatus(a.id, a.status),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteSurvey(id), onSuccess: done }),
    remind: useMutation({ mutationFn: (id: string) => api.remindSurvey(id) }),
  };
}

export const useHourImports = (enabled: boolean) =>
  useQuery({ queryKey: k("imports"), queryFn: () => api.hourImports(), enabled });
export function useAdminActions() {
  const qc = useQueryClient();
  const refresh = (...keys: string[]) =>
    keys.forEach((x) => qc.invalidateQueries({ queryKey: k(x) }));
  return {
    importHours: useMutation({
      mutationFn: (a: { label: string; rows: HourImportRow[] }) => api.importHours(a.label, a.rows),
      onSuccess: () => refresh("imports", "stats", "leaderboard", "summary", "hours", "tiers"),
    }),
    undoImport: useMutation({
      mutationFn: (id: string) => api.undoHourImport(id),
      onSuccess: () => refresh("imports", "stats", "leaderboard", "summary", "hours", "tiers"),
    }),
    setActive: useMutation({
      mutationFn: (a: { id: string; active: boolean }) => api.setMemberActive(a.id, a.active),
      onSuccess: () => refresh("structure", "inactive"),
    }),
    setCaps: useMutation({
      mutationFn: (a: { id: string; caps: Capability[] }) =>
        api.setMemberCapabilities(a.id, a.caps),
      onSuccess: () => refresh("structure"),
    }),
  };
}
export const useInactiveMembers = (enabled: boolean) =>
  useQuery({ queryKey: k("inactive"), queryFn: () => api.inactiveMembers(), enabled });
