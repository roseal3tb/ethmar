import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
import { Partners } from "@/components/site/Sections";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "شركاء النجاح | مبادرة إثمار" },
      { name: "description", content: "الجهات التي شاركت إثمار في صناعة الأثر." },
      { property: "og:title", content: "شركاء النجاح | مبادرة إثمار" },
      { property: "og:description", content: "الجهات التي شاركت إثمار في صناعة الأثر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero eyebrow="شركاء النجاح" title="شركاء صنعوا الأثر معنا" text="الجهات التي شاركت إثمار في صناعة الأثر." />
      <Partners withHead={false} />
    </PublicLayout>
  );
}
