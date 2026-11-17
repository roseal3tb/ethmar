import { createFileRoute } from "@tanstack/react-router";
import { StructureTeaser } from "@/components/site/Structure";
import { PublicLayout } from "@/components/site/PublicLayout";
import {
  About,
  Hero,
  Impact,
  JoinCta,
  Objectives,
  Partners,
  Projects,
} from "@/components/site/Sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مبادرة إثمار | صناعة جيل واعٍ ومتمكن ماليًا" },
      {
        name: "description",
        content: "إثمار، المبادرة الطلابية الأولى في جامعة الملك سعود لتعزيز الوعي المالي.",
      },
      { property: "og:title", content: "مبادرة إثمار | صناعة جيل واعٍ ومتمكن ماليًا" },
      {
        property: "og:description",
        content: "إثمار، المبادرة الطلابية الأولى في جامعة الملك سعود لتعزيز الوعي المالي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PublicLayout>
      <Hero />
      <Impact />
      <About />
      <StructureTeaser />
      <Objectives />
      <Projects />
      <Partners />
      <JoinCta />
    </PublicLayout>
  );
}
