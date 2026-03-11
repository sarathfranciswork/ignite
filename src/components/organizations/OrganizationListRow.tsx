"use client";

import Link from "next/link";
import { Building2, MapPin, Globe, Users, Lock } from "lucide-react";
import { RelationshipBadge, NdaBadge } from "./OrganizationStatusBadge";

interface OrganizationListRowProps {
  organization: {
    id: string;
    name: string;
    description: string | null;
    industry: string | null;
    location: string | null;
    websiteUrl: string | null;
    relationshipStatus:
      | "IDENTIFIED"
      | "VERIFIED"
      | "QUALIFIED"
      | "EVALUATION"
      | "PILOT"
      | "PARTNERSHIP"
      | "ARCHIVED";
    ndaStatus: "NONE" | "REQUESTED" | "SIGNED" | "EXPIRED";
    isConfidential: boolean;
    contactCount: number;
    createdAt: string;
  };
}

export function OrganizationListRow({ organization }: OrganizationListRowProps) {
  return (
    <Link
      href={`/partners/${organization.id}`}
      className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
        <Building2 className="h-5 w-5 text-primary-600" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-gray-900">{organization.name}</span>
          {organization.isConfidential && <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
        </div>
        {organization.description && (
          <p className="mt-0.5 truncate text-sm text-gray-500">{organization.description}</p>
        )}
      </div>

      <div className="hidden items-center gap-4 text-xs text-gray-500 md:flex">
        {organization.industry && <span className="w-28 truncate">{organization.industry}</span>}
        {organization.location && (
          <span className="flex w-32 items-center gap-1 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {organization.location}
          </span>
        )}
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <RelationshipBadge status={organization.relationshipStatus} />
        {organization.ndaStatus !== "NONE" && <NdaBadge status={organization.ndaStatus} />}
      </div>

      <div className="hidden items-center gap-4 text-xs text-gray-500 xl:flex">
        {organization.websiteUrl && (
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {organization.contactCount}
        </span>
      </div>
    </Link>
  );
}
