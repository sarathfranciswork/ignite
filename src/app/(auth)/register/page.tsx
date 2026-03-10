import { ComingSoon } from "@/components/shared/ComingSoon";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  return (
    <ComingSoon
      title="Create Account"
      description="Self-registration with profile setup, skills, and notification preferences. Coming with Story 1.2."
      icon={UserPlus}
    />
  );
}
