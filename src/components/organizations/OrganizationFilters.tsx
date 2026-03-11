"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type RelationshipStatus =
  | "IDENTIFIED"
  | "VERIFIED"
  | "QUALIFIED"
  | "EVALUATION"
  | "PILOT"
  | "PARTNERSHIP"
  | "ARCHIVED";

type NdaStatus = "NONE" | "REQUESTED" | "SIGNED" | "EXPIRED";

type SortField = "name" | "relationshipStatus" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";

export interface OrganizationFilterValues {
  relationshipStatus: RelationshipStatus | undefined;
  industries: string[];
  location: string;
  ndaStatus: NdaStatus | undefined;
  isConfidential: boolean | undefined;
  sortBy: SortField;
  sortDirection: SortDirection;
}

interface OrganizationFiltersProps {
  filters: OrganizationFilterValues;
  onFiltersChange: (filters: OrganizationFilterValues) => void;
}

const RELATIONSHIP_STATUSES: { label: string; value: RelationshipStatus }[] = [
  { label: "Identified", value: "IDENTIFIED" },
  { label: "Verified", value: "VERIFIED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Evaluation", value: "EVALUATION" },
  { label: "Pilot", value: "PILOT" },
  { label: "Partnership", value: "PARTNERSHIP" },
  { label: "Archived", value: "ARCHIVED" },
];

const NDA_STATUSES: { label: string; value: NdaStatus }[] = [
  { label: "None", value: "NONE" },
  { label: "Requested", value: "REQUESTED" },
  { label: "Signed", value: "SIGNED" },
  { label: "Expired", value: "EXPIRED" },
];

const SORT_OPTIONS: { label: string; field: SortField; direction: SortDirection }[] = [
  { label: "Name A-Z", field: "name", direction: "asc" },
  { label: "Name Z-A", field: "name", direction: "desc" },
  { label: "Newest first", field: "createdAt", direction: "desc" },
  { label: "Oldest first", field: "createdAt", direction: "asc" },
  { label: "Recently updated", field: "updatedAt", direction: "desc" },
  { label: "Relationship status", field: "relationshipStatus", direction: "asc" },
];

export function OrganizationFilters({ filters, onFiltersChange }: OrganizationFiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const industriesQuery = trpc.organization.distinctIndustries.useQuery(undefined, {
    staleTime: 60_000,
  });
  const locationsQuery = trpc.organization.distinctLocations.useQuery(undefined, {
    staleTime: 60_000,
  });

  const activeFilterCount = [
    filters.relationshipStatus,
    filters.industries.length > 0,
    filters.location,
    filters.ndaStatus,
    filters.isConfidential !== undefined,
  ].filter(Boolean).length;

  function clearFilters() {
    onFiltersChange({
      relationshipStatus: undefined,
      industries: [],
      location: "",
      ndaStatus: undefined,
      isConfidential: undefined,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection,
    });
  }

  function toggleIndustry(industry: string) {
    const current = filters.industries;
    const updated = current.includes(industry)
      ? current.filter((i) => i !== industry)
      : [...current, industry];
    onFiltersChange({ ...filters, industries: updated });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <select
          value={`${filters.sortBy}-${filters.sortDirection}`}
          onChange={(e) => {
            const option = SORT_OPTIONS.find((o) => `${o.field}-${o.direction}` === e.target.value);
            if (option) {
              onFiltersChange({
                ...filters,
                sortBy: option.field,
                sortDirection: option.direction,
              });
            }
          }}
          className="flex h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option
              key={`${option.field}-${option.direction}`}
              value={`${option.field}-${option.direction}`}
            >
              {option.label}
            </option>
          ))}
        </select>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-gray-500">
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Relationship Status */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Relationship Status
              </label>
              <select
                value={filters.relationshipStatus ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    relationshipStatus: (e.target.value || undefined) as
                      | RelationshipStatus
                      | undefined,
                  })
                }
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All statuses</option>
                {RELATIONSHIP_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* NDA Status */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">NDA Status</label>
              <select
                value={filters.ndaStatus ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    ndaStatus: (e.target.value || undefined) as NdaStatus | undefined,
                  })
                }
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                {NDA_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Location</label>
              <select
                value={filters.location}
                onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All locations</option>
                {locationsQuery.data?.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Confidential */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Confidential</label>
              <select
                value={filters.isConfidential === undefined ? "" : String(filters.isConfidential)}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    isConfidential: e.target.value === "" ? undefined : e.target.value === "true",
                  })
                }
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                <option value="true">Confidential only</option>
                <option value="false">Non-confidential only</option>
              </select>
            </div>
          </div>

          {/* Industry multi-select */}
          {industriesQuery.data && industriesQuery.data.length > 0 && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Industries</label>
              <div className="flex flex-wrap gap-1.5">
                {industriesQuery.data.map((industry) => (
                  <button
                    key={industry}
                    onClick={() => toggleIndustry(industry)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      filters.industries.includes(industry)
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
