import { ComingSoon } from "@/components/shared/ComingSoon";
import { FolderKanban } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Projects"
      description="Phase-gate project management with custom processes, activities, tasks, and gatekeeper decisions. Coming with Story 12.1."
      icon={FolderKanban}
    />
  );
}
