import { ComingSoon } from "@/components/shared/ComingSoon";
import { Bell } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Notification Templates"
      description="Configure notification templates with custom subject and body for email and in-app notifications. Coming with Story 8.2."
      icon={Bell}
    />
  );
}
