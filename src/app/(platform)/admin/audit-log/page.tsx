"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Filter, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  StatCard,
  ActionBadge,
  AuditLogDetail,
  AuditLogFilterPanel,
  AuditLogTableSkeleton,
  type AuditEntry,
} from "./audit-log-components";

export default function AuditLogPage() {
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("");
  const [entityFilter, setEntityFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
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

  const listQuery = trpc.auditLog.list.useQuery(listInput);
  const allEntries = (listQuery.data?.items ?? []) as unknown as AuditEntry[];

  const detailQuery = trpc.auditLog.getById.useQuery(
    { id: selectedEntry ?? "" },
    { enabled: !!selectedEntry },
  );

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
      <AuditLogFilterPanel
        search={search}
        onSearchChange={setSearch}
        actionFilter={actionFilter}
        onActionFilterChange={setActionFilter}
        entityFilter={entityFilter}
        onEntityFilterChange={setEntityFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        actions={actionsQuery.data ?? []}
        entities={entitiesQuery.data ?? []}
      />

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
              {listQuery.isLoading && <AuditLogTableSkeleton />}
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
          entry={detailQuery.data as unknown as AuditEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
