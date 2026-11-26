import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { EmptyState } from "./ui";

export function NoAccess() {
  return (
    <div className="p-card">
      <EmptyState
        icon={Lock}
        title="هذي الصفحة لقادة اللجان والمبادرة"
        body="ما عندك صلاحية تشوفها"
        action={
          <Link to="/portal" className="p-btn-ghost">
            رجوع لحسابي
          </Link>
        }
      />
    </div>
  );
}
