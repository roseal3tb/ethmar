import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
import { About, AboutIntro, Objectives, Impact } from "@/components/site/Sections";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن | مبادرة إثمار" },
      { name: "description", content: "رؤية إثمار ورسالتها وأهدافها في تعزيز الوعي المالي" },
      { property: "og:title", content: "من نحن | مبادرة إثمار" },
      {
        property: "og:description",
        content: "رؤية إثمار ورسالتها وأهدافها في تعزيز الوعي المالي",
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
        eyebrow="من نحن"
        title="مبادرة طلابية تصنع وعيًا ماليًا"
        text="رؤية إثمار ورسالتها وأهدافها في تعزيز الوعي المالي"
      />
      <AboutIntro />
      <About />
      <Objectives />
      <Impact />
    </PublicLayout>
  );
}
