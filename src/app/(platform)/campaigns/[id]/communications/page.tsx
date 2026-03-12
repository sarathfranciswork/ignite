"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CommunicationHub } from "@/components/communications/CommunicationHub";

export default function CampaignCommunicationsPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/campaigns/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaign
        </Link>
      </div>
      <CommunicationHub campaignId={params.id} />
    </div>
  );
}
