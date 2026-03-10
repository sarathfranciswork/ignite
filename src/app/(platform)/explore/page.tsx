import { ComingSoon } from "@/components/shared/ComingSoon";
import { Compass } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Explore"
      description="Discover campaigns, ideas, trends, and organizations across the platform. Coming with Story 7.1."
      icon={Compass}
    />
  );
}
