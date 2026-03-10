import { ComingSoon } from "@/components/shared/ComingSoon";
import { Handshake } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      title="Partner Engagement"
      description="Organization database, use case pipeline, scouting boards, and partnering campaigns. Coming with Story 10.1."
      icon={Handshake}
    />
  );
}
