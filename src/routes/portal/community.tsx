import { createFileRoute } from "@tanstack/react-router";
import { CommunityPage } from "@/components/portal/CommunityPage";

export const Route = createFileRoute("/portal/community")({
  head: () => ({ meta: [{ title: "المجتمع | بوابة أعضاء إثمار" }] }),
  component: CommunityPage,
});
