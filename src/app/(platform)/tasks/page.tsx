import { ComingSoon } from "@/components/shared/ComingSoon";
import { CheckSquare } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Task Center"
      description="Central hub for pending evaluations, ideas requiring attention, and project tasks. Coming with Story 8.3."
      icon={CheckSquare}
    />
  );
}
