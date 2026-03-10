import { ComingSoon } from "@/components/shared/ComingSoon";
import { UserCircle } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Your Profile"
      description="Edit your profile, skills, notification preferences, and language settings. Coming with Story 1.2."
      icon={UserCircle}
    />
  );
}
