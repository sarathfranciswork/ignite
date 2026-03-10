import { ComingSoon } from "@/components/shared/ComingSoon";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <ComingSoon
      title="Sign In"
      description="Authentication system with email/password and magic link login. Coming with Story 1.2."
      icon={LogIn}
    />
  );
}
