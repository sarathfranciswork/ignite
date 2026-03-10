import { ComingSoon } from "@/components/shared/ComingSoon";
import { Settings } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="System Settings"
      description="Platform-wide configuration, feature flags, and deployment settings. Coming with Story 8.1."
      icon={Settings}
    />
  );
}
