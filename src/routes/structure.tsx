import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
import { StructureTree } from "@/components/site/Structure";
import { structureTerm } from "@/data/site";

const title = "الهيكلة | مبادرة إثمار";
const description = "هيكلة مبادرة إثمار: قيادة المبادرة ولجانها وفرق العمل وقادتها.";

export const Route = createFileRoute("/structure")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="الهيكلة"
        title="هيكلة مبادرة إثمار"
        text={`الأشخاص خلف إثمار، واللجان والفرق التي تصنع الأثر · ${structureTerm}`}
      />
      <StructureTree />
    </PublicLayout>
  );
}
