import { LoaderCircle } from "lucide-react";
import { useDemoAuth } from "@/lib/demo-auth";
import { AccountDashboard } from "./AccountDashboard";
import { PortalLogin } from "./PortalLogin";
import { PortalLayout } from "./PortalLayout";
import { TasksPage } from "./TasksPage";
import { CommunityPage } from "./CommunityPage";
import { LeaderboardPage } from "./LeaderboardPage";
import { LabsPage } from "./LabsPage";
import type { PortalView } from "./portal-ui";
import { useState } from "react";

export function Portal({ view, onViewChange }: { view: PortalView; onViewChange: (view: PortalView) => void }) {
  const { ready, member, account } = useDemoAuth();
  const [nameDraft, setNameDraft] = useState<{ memberId: string; name: string } | null>(null);
  if (!ready) return <main dir="rtl" className="grid min-h-screen place-items-center bg-ivory text-primary"><div role="status" className="flex items-center gap-3"><LoaderCircle className="animate-spin" />جارٍ تجهيز بوابة الأعضاء...</div></main>;
  if (!member || !account) return <PortalLogin />;
  const displayName = nameDraft?.memberId === member.id ? nameDraft.name : member.name;
  return <PortalLayout view={view} onViewChange={onViewChange} displayName={displayName}>
    {view === "account" && <AccountDashboard displayName={displayName} onNameChange={(name) => setNameDraft({ memberId: member.id, name })} onViewChange={onViewChange} />}
    {view === "tasks" && <TasksPage />}
    {view === "community" && <CommunityPage />}
    {view === "leaderboard" && <LeaderboardPage />}
    {view === "labs" && <LabsPage />}
  </PortalLayout>;
}
