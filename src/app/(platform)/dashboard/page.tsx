import { ComingSoon } from "@/components/shared/ComingSoon";
import { LayoutDashboard } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Dashboard"
      description="Your personalized dashboard with tasks, active campaigns, trending ideas, and activity feed. Coming with Story 8.3."
      icon={LayoutDashboard}
    />
  );
}
