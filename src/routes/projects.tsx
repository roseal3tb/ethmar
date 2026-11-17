import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
import { Projects } from "@/components/site/Sections";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "مشاريعنا | مبادرة إثمار" },
      { name: "description", content: "خمسة مشاريع تربط الطلاب بعالم المال والتقنية المالية" },
      { property: "og:title", content: "مشاريعنا | مبادرة إثمار" },
      {
        property: "og:description",
        content: "خمسة مشاريع تربط الطلاب بعالم المال والتقنية المالية",
      },
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
        eyebrow="مشاريعنا"
        title="مشاريع إثمار"
        text="خمسة مشاريع تربط الطلاب بعالم المال والتقنية المالية"
      />
      <Projects withHead={false} />
    </PublicLayout>
  );
}
