import { ComingSoon } from "@/components/shared/ComingSoon";
import { BarChart3 } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Reports & Analytics"
      description="Campaign KPIs, idea funnels, engagement metrics, and custom reports with Excel export. Coming with Story 13.1."
      icon={BarChart3}
    />
  );
}
