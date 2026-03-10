"use client";

import Link from "next/link";
import { Calendar, Lock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

interface CampaignCardProps {
  campaign: {
    id: string;
    title: string;
    teaser: string | null;
    bannerUrl: string | null;
    status: string;
    startDate: string | Date | null;
    endDate: string | Date | null;
    tags: string[];
    isConfidential: boolean;
    createdAt: string | Date;
    sponsor: { id: string; name: string | null; image: string | null } | null;
    createdBy: { id: string; name: string | null };
  };
  className?: string;
}

function formatDate(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CampaignCard({ campaign, className }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className={cn("group cursor-pointer transition-shadow hover:shadow-md", className)}>
        {/* Banner */}
        {campaign.bannerUrl ? (
          <div className="h-32 overflow-hidden rounded-t-xl">
            <div
              className="h-full w-full bg-cover bg-center transition-transform group-hover:scale-105"
              style={{ backgroundImage: `url(${campaign.bannerUrl})` }}
            />
          </div>
        ) : (
          <div className="h-32 rounded-t-xl bg-gradient-to-br from-primary-100 to-primary-50" />
        )}

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-display text-base font-semibold text-gray-900 group-hover:text-primary-600">
              {campaign.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {campaign.isConfidential && <Lock className="h-3.5 w-3.5 text-gray-400" />}
              <StatusBadge status={campaign.status} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {campaign.teaser && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-500">{campaign.teaser}</p>
          )}

          {/* Timeline */}
          {(campaign.startDate || campaign.endDate) && (
            <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatDate(campaign.startDate)}
                {campaign.startDate && campaign.endDate && " - "}
                {formatDate(campaign.endDate)}
              </span>
            </div>
          )}

          {/* Tags */}
          {campaign.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {campaign.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {campaign.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{campaign.tags.length - 3} more</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>by {campaign.createdBy.name ?? "Unknown"}</span>
            {campaign.sponsor && <span>Sponsor: {campaign.sponsor.name ?? "Unknown"}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
