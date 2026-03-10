import { ComingSoon } from "@/components/shared/ComingSoon";
import { Lightbulb } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Community Insights"
      description="Community-generated signals and observations shared globally or within campaigns. Coming with Story 9.4."
      icon={Lightbulb}
    />
  );
}
