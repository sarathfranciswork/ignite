"use client";

import { Calendar, Lock, User } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface CampaignHeaderProps {
  campaign: {
    title: string;
    description: string | null;
    bannerUrl: string | null;
    status: string;
    startDate: string | Date | null;
    endDate: string | Date | null;
    isConfidential: boolean;
    tags: string[];
    sponsor: { id: string; name: string | null; email: string; image: string | null } | null;
    createdBy: { id: string; name: string | null; email: string; image: string | null };
  };
}

function formatDate(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function CampaignHeader({ campaign }: CampaignHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Banner */}
      {campaign.bannerUrl ? (
        <div className="h-48 overflow-hidden rounded-xl">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${campaign.bannerUrl})` }}
          />
        </div>
      ) : (
        <div className="h-48 rounded-xl bg-gradient-to-br from-primary-100 via-primary-50 to-accent-50" />
      )}

      {/* Title and status */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-gray-900">{campaign.title}</h1>
            {campaign.isConfidential && <Lock className="h-5 w-5 text-gray-400" />}
          </div>
          {campaign.description && <p className="mt-2 text-gray-600">{campaign.description}</p>}
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        {(campaign.startDate || campaign.endDate) && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(campaign.startDate)}
              {campaign.startDate && campaign.endDate && " - "}
              {formatDate(campaign.endDate)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4" />
          <span>Created by {campaign.createdBy.name ?? campaign.createdBy.email}</span>
        </div>
        {campaign.sponsor && (
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>Sponsor: {campaign.sponsor.name ?? campaign.sponsor.email}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {campaign.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {campaign.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
