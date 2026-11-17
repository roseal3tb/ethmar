import { createFileRoute } from "@tanstack/react-router";
import { LeaderboardPage } from "@/components/portal/LeaderboardPage";

export const Route = createFileRoute("/portal/leaderboard")({
  head: () => ({ meta: [{ title: "لوحة الصدارة | بوابة أعضاء إثمار" }] }),
  component: LeaderboardPage,
});
