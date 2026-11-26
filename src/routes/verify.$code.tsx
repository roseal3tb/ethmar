import { createFileRoute } from "@tanstack/react-router";
import { VerifyCertificate } from "@/components/portal/CertificatePage";

export const Route = createFileRoute("/verify/$code")({
  head: () => ({
    meta: [{ title: "شهادة ساعات تطوعية | مبادرة إثمار" }, { name: "robots", content: "noindex" }],
  }),
  component: VerifyRoute,
});

function VerifyRoute() {
  const { code } = Route.useParams();
  return <VerifyCertificate code={code} />;
}
