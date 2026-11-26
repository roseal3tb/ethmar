import { createFileRoute } from "@tanstack/react-router";
import { VerifyLookup } from "@/components/portal/CertificatePage";

export const Route = createFileRoute("/verify/")({
  head: () => ({
    meta: [
      { title: "التحقق من الشهادات | مبادرة إثمار" },
      { name: "description", content: "تحقق من شهادات الساعات التطوعية الصادرة من مبادرة إثمار" },
    ],
  }),
  component: VerifyLookup,
});
