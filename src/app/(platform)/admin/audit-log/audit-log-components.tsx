"use client";

import * as React from "react";
import { Search, ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary-50 p-2">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function ActionBadge({ action }: { action: string }) {
  const getColor = (a: string): string => {
    if (a.includes("created") || a.includes("Created")) return "bg-green-100 text-green-700";
    if (a.includes("deleted") || a.includes("Deleted")) return "bg-red-100 text-red-700";
    if (a.includes("updated") || a.includes("Updated")) return "bg-blue-100 text-blue-700";
    if (a.includes("Changed") || a.includes("changed")) return "bg-yellow-100 text-yellow-700";
    if (a.includes("enabled") || a.includes("activated")) return "bg-emerald-100 text-emerald-700";
    if (a.includes("disabled") || a.includes("terminated")) return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getColor(action))}>
      {action}
    </span>
  );
}

export function AuditLogDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Audit Log Detail</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <DetailRow label="ID" value={entry.id} />
          <DetailRow label="Timestamp" value={format(new Date(entry.createdAt), "PPpp")} />
          <DetailRow label="Actor ID" value={entry.actorId ?? "System"} />
          <DetailRow label="Actor Email" value={entry.actorEmail ?? "N/A"} />
          <DetailRow label="Action" value={entry.action} />
          <DetailRow label="Entity" value={entry.entity} />
          <DetailRow label="Entity ID" value={entry.entityId ?? "N/A"} />
          <DetailRow label="IP Address" value={entry.ipAddress ?? "N/A"} />
          <DetailRow label="User Agent" value={entry.userAgent ?? "N/A"} />
          {entry.metadata && (
            <div>
              <p className="text-sm font-medium text-gray-500">Metadata</p>
              <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 break-all text-sm text-gray-900">{value}</p>
    </div>
  );
}

export function AuditLogFilterPanel({
  search,
  onSearchChange,
  actionFilter,
  onActionFilterChange,
  entityFilter,
  onEntityFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  actions,
  entities,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  actionFilter: string;
  onActionFilterChange: (value: string) => void;
  entityFilter: string;
  onEntityFilterChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  actions: string[];
  entities: string[];
}) {
  const [showFilters, setShowFilters] = React.useState(false);
  const hasActiveFilters = search || actionFilter || entityFilter || startDate || endDate;

  const clearFilters = () => {
    onSearchChange("");
    onActionFilterChange("");
    onEntityFilterChange("");
    onStartDateChange("");
    onEndDateChange("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search audit logs by action, entity, or actor email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            showFilters
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => onActionFilterChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Entity</label>
            <select
              value={entityFilter}
              onChange={(e) => onEntityFilterChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All entities</option>
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditLogTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </td>
        </tr>
      ))}
    </>
  );
}
