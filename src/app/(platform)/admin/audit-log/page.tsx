"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  BarChart3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

function StatCard({
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

function ActionBadge({ action }: { action: string }) {
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

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | Date;
}

function AuditLogDetail({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 break-all text-sm text-gray-900">{value}</p>
    </div>
  );
}

export default function AuditLogPage() {
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState<string | null>(null);
  const statsQuery = trpc.auditLog.stats.useQuery();
  const actionsQuery = trpc.auditLog.distinctActions.useQuery();
  const entitiesQuery = trpc.auditLog.distinctEntities.useQuery();

  const listInput = React.useMemo(
    () => ({
      limit: 50 as number | undefined,
      search: search || undefined,
      action: actionFilter || undefined,
      entity: entityFilter || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    }),
    [search, actionFilter, entityFilter, startDate, endDate],
  );

  // eslint-disable-next-line
  const listQuery = trpc.auditLog.list.useQuery(listInput) as {
    data: { items: AuditEntry[]; nextCursor?: string } | undefined;
    isLoading: boolean;
    isFetching: boolean;
  };

  const allEntries = listQuery.data?.items ?? [];

  const detailQuery = trpc.auditLog.getById.useQuery(
    { id: selectedEntry ?? "" },
    { enabled: !!selectedEntry },
  ) as { data: AuditEntry | undefined };

  const exportMutation = trpc.auditLog.export.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.data], {
        type: data.format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit log exported successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleExport = (exportFormat: "csv" | "json") => {
    exportMutation.mutate({
      format: exportFormat,
      search: search || undefined,
      action: actionFilter || undefined,
      entity: entityFilter || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setActionFilter("");
    setEntityFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = search || actionFilter || entityFilter || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">
            Full audit trail of all platform actions with actor, action, target, and timestamp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            disabled={exportMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            disabled={exportMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Stats */}
      {statsQuery.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Entries"
            value={statsQuery.data.totalCount.toLocaleString()}
            icon={FileText}
          />
          <StatCard
            label="Today's Events"
            value={statsQuery.data.todayCount.toLocaleString()}
            icon={BarChart3}
          />
          <StatCard
            label="Unique Actors"
            value={statsQuery.data.uniqueActorCount.toLocaleString()}
            icon={Filter}
          />
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search audit logs by action, entity, or actor email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All actions</option>
                {actionsQuery.data?.map((action) => (
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
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All entities</option>
                {entitiesQuery.data?.map((entity) => (
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
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Entity ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && allEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No audit log entries found.
                  </td>
                </tr>
              )}
              {allEntries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry.id)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {format(new Date(entry.createdAt), "MMM d, HH:mm:ss")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {entry.actorEmail ?? entry.actorId?.slice(0, 8) ?? "System"}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={entry.action} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{entry.entity}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-500">
                    {entry.entityId ? entry.entityId.slice(0, 12) + "..." : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.ipAddress ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Entry count */}
        {allEntries.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3 text-center text-sm text-gray-500">
            Showing {allEntries.length} entries
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEntry && detailQuery.data && (
        <AuditLogDetail
          entry={detailQuery.data as AuditEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
