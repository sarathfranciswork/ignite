"use client";

import { trpc } from "@/lib/trpc";
import { KpiCard } from "@/components/charts/KpiCard";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ExportButton } from "./ExportButton";
import { Building2, FileText, Users, Handshake } from "lucide-react";

const USE_CASE_COLORS = ["#6366F1", "#8B5CF6", "#A855F7", "#0EA5E9", "#10B981", "#F59E0B"];

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PartneringSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}

export function PartneringReportTab() {
  const pipelineQuery = trpc.partneringReport.useCasePipelineFunnel.useQuery({});
  const orgActivityQuery = trpc.partneringReport.organizationActivity.useQuery({});
  const exportMutation = trpc.export.partneringReport.useMutation();

  const isLoading = pipelineQuery.isLoading || orgActivityQuery.isLoading;
  const isError = pipelineQuery.isError || orgActivityQuery.isError;

  if (isLoading) {
    return <PartneringSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load partnering reports. Please try again.</p>
      </div>
    );
  }

  const pipeline = pipelineQuery.data;
  const orgActivity = orgActivityQuery.data;

  if (!pipeline || !orgActivity) return <PartneringSkeleton />;

  const pipelineFunnel = pipeline.funnel.map((step, index) => ({
    label: formatStatus(step.status),
    value: step.count,
    color: USE_CASE_COLORS[index % USE_CASE_COLORS.length] ?? "#6B7280",
  }));

  const relationshipFunnel = Object.entries(orgActivity.totals.relationshipStatusBreakdown).map(
    ([status, count], index) => ({
      label: formatStatus(status),
      value: count,
      color: USE_CASE_COLORS[index % USE_CASE_COLORS.length] ?? "#6B7280",
    }),
  );

  const hasData = pipeline.totalUseCases > 0 || orgActivity.totals.totalOrganizations > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton
          label="Export Partnering Report"
          onExport={() => exportMutation.mutateAsync({})}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Organizations"
          value={orgActivity.totals.totalOrganizations}
          icon={Building2}
          trend={orgActivity.totals.totalOrganizations > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Use Cases"
          value={pipeline.totalUseCases}
          icon={FileText}
          trend={pipeline.totalUseCases > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Total Contacts"
          value={orgActivity.totals.totalContacts}
          icon={Users}
          trend={orgActivity.totals.totalContacts > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Active Partnerships"
          value={orgActivity.totals.relationshipStatusBreakdown["PARTNERSHIP"] ?? 0}
          icon={Handshake}
          trend={
            (orgActivity.totals.relationshipStatusBreakdown["PARTNERSHIP"] ?? 0) > 0
              ? "up"
              : "neutral"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pipelineFunnel.some((s) => s.value > 0) && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Use Case Pipeline Funnel</h3>
            <FunnelChart steps={pipelineFunnel} />
          </div>
        )}

        {relationshipFunnel.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Organization Relationship Status
            </h3>
            <FunnelChart steps={relationshipFunnel} />
          </div>
        )}
      </div>

      {pipeline.byOrganization.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Use Cases by Organization</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left font-medium text-gray-500">Organization</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Use Cases</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Identified</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Evaluation</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Pilot</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Partnership</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.byOrganization.map((org) => (
                  <tr key={org.organizationId} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{org.organizationName}</td>
                    <td className="py-3 text-right text-gray-600">{org.useCaseCount}</td>
                    <td className="py-3 text-right text-gray-600">
                      {org.statusBreakdown["IDENTIFIED"] ?? 0}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {org.statusBreakdown["EVALUATION"] ?? 0}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {org.statusBreakdown["PILOT"] ?? 0}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {org.statusBreakdown["PARTNERSHIP"] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {orgActivity.organizations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Organization Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left font-medium text-gray-500">Organization</th>
                  <th className="pb-3 text-left font-medium text-gray-500">Industry</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Status</th>
                  <th className="pb-3 text-right font-medium text-gray-500">NDA</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Contacts</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Use Cases</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Managers</th>
                </tr>
              </thead>
              <tbody>
                {orgActivity.organizations.map((org) => (
                  <tr key={org.organizationId} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{org.organizationName}</td>
                    <td className="py-3 text-gray-600">{org.industry ?? "-"}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {formatStatus(org.relationshipStatus)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {formatStatus(org.ndaStatus)}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-600">{org.contactCount}</td>
                    <td className="py-3 text-right text-gray-600">{org.useCaseCount}</td>
                    <td className="py-3 text-right text-gray-600">{org.managerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-3 text-sm text-gray-500">
            No partnering data to display yet. Create organizations and use cases to see analytics
            here.
          </p>
        </div>
      )}
    </div>
  );
}
