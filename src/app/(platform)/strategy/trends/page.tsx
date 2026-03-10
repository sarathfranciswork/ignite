import { ComingSoon } from "@/components/shared/ComingSoon";
import { TrendingUp } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Trends"
      description="Trend database with mega, macro, and micro trend hierarchy. Link trends to campaigns, ideas, and innovation portfolios. Coming with Story 9.2."
      icon={TrendingUp}
    />
  );
}
