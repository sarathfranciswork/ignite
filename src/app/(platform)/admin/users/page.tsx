import { ComingSoon } from "@/components/shared/ComingSoon";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="User Management"
      description="Create, edit, deactivate, and bulk-manage user accounts with role assignments. Coming with Story 1.5."
      icon={Users}
    />
  );
}
