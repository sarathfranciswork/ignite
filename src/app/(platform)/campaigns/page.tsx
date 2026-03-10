import { ComingSoon } from "@/components/shared/ComingSoon";
import { Megaphone } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Campaigns"
      description="Browse, create, and manage innovation campaigns with rich wizard setup, lifecycle management, and KPI dashboards. Coming with Story 2.1."
      icon={Megaphone}
    />
  );
}
