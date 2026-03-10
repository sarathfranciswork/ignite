import { ComingSoon } from "@/components/shared/ComingSoon";
import { UserCog } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="User Groups"
      description="Custom groups for cross-cutting permissions and campaign targeting. Coming with Story 1.5."
      icon={UserCog}
    />
  );
}
