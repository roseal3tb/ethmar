import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/portal/ProfilePage";

export const Route = createFileRoute("/portal/profile")({
  head: () => ({ meta: [{ title: "ملفي | بوابة أعضاء إثمار" }] }),
  component: ProfilePage,
});
