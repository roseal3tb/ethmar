import { createFileRoute } from "@tanstack/react-router";
import { CommunityPage } from "@/components/portal/CommunityPage";

export const Route = createFileRoute("/portal/community")({
  head: () => ({ meta: [{ title: "المجتمع | بوابة أعضاء إثمار" }] }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { c?: string | undefined; m?: string | undefined } => ({
    c: typeof s["c"] === "string" && s["c"] ? s["c"] : undefined,
    m: typeof s["m"] === "string" && s["m"] ? s["m"] : undefined,
  }),
  component: CommunityRoute,
});

function CommunityRoute() {
  const { c, m } = Route.useSearch();
  return <CommunityPage committeeId={c} focus={m} />;
}
