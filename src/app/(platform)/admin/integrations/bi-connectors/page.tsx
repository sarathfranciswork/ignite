"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "TABLEAU" as const, label: "Tableau" },
  { value: "POWER_BI" as const, label: "Power BI" },
];

const DATASET_OPTIONS = [
  { key: "ideas" as const, label: "Ideas" },
  { key: "campaigns" as const, label: "Campaigns" },
  { key: "evaluations" as const, label: "Evaluations" },
  { key: "projects" as const, label: "Projects" },
];

function ProviderBadge({ provider }: { provider: string }) {
  const styles: Record<string, string> = {
    TABLEAU: "bg-blue-100 text-blue-700",
    POWER_BI: "bg-orange-100 text-orange-700",
  };

  const labels: Record<string, string> = {
    TABLEAU: "Tableau",
    POWER_BI: "Power BI",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        styles[provider] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {labels[provider] ?? provider}
    </span>
  );
}

function StatusIndicator({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500",
      )}
    >
      {isActive ? (
        <>
          <CheckCircle className="h-3 w-3" /> Active
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3" /> Inactive
        </>
      )}
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      title={`Copy ${label}`}
    >
      <Copy className="h-3 w-3" />
      Copy
    </button>
  );
}

function ConnectorEndpoints({ connectorId }: { connectorId: string }) {
  const { data: endpoints } = trpc.biConnector.getEndpoints.useQuery({ id: connectorId });

  if (!endpoints) return null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        API Endpoints
      </h4>
      {Object.entries(endpoints).map(([name, url]) => (
        <div key={name} className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-gray-600">{name}:</span>
            <code className="ml-2 block truncate text-xs text-gray-500">{url}</code>
          </div>
          <CopyButton text={url} label={name} />
        </div>
      ))}
    </div>
  );
}

interface ConfigureFormData {
  name: string;
  provider: "TABLEAU" | "POWER_BI";
  spaceId: string;
  datasets: {
    ideas: boolean;
    campaigns: boolean;
    evaluations: boolean;
    projects: boolean;
  };
}

function ConfigureForm({ onClose, spaceId }: { onClose: () => void; spaceId: string }) {
  const [formData, setFormData] = React.useState<ConfigureFormData>({
    name: "",
    provider: "TABLEAU",
    spaceId,
    datasets: { ideas: true, campaigns: true, evaluations: false, projects: false },
  });

  const utils = trpc.useUtils();
  const configureProcedure = trpc.biConnector.configure;
  const configureMutation = configureProcedure.useMutation({
    onSuccess: () => {
      toast.success("BI connector configured successfully");
      void utils.biConnector.list.invalidate();
      onClose();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configureMutation.mutate({
      spaceId: formData.spaceId,
      provider: formData.provider,
      name: formData.name,
      datasetConfig: formData.datasets,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h3 className="text-sm font-semibold text-gray-900">Configure New BI Connector</h3>

      <div>
        <label htmlFor="bi-name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="bi-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="My Tableau Connection"
          required
        />
      </div>

      <div>
        <label htmlFor="bi-provider" className="block text-sm font-medium text-gray-700">
          Provider
        </label>
        <select
          id="bi-provider"
          value={formData.provider}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              provider: e.target.value as "TABLEAU" | "POWER_BI",
            }))
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">Datasets to Expose</legend>
        <div className="mt-2 space-y-2">
          {DATASET_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={formData.datasets[opt.key]}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    datasets: { ...prev.datasets, [opt.key]: e.target.checked },
                  }))
                }
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={configureMutation.isPending}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {configureMutation.isPending ? "Configuring..." : "Configure"}
        </button>
      </div>
    </form>
  );
}

function ConnectionInstructions({ provider }: { provider: string }) {
  if (provider === "TABLEAU") {
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
        <h4 className="text-xs font-semibold text-blue-800">Tableau Web Data Connector</h4>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-blue-700">
          <li>In Tableau, go to Connect &gt; Web Data Connector</li>
          <li>Enter the ideas/campaigns/evaluations/projects endpoint URL</li>
          <li>Set the Authorization header with your API key</li>
          <li>Use JSON format for data extraction</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
      <h4 className="text-xs font-semibold text-orange-800">Power BI OData Feed</h4>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-orange-700">
        <li>In Power BI Desktop, go to Get Data &gt; OData Feed</li>
        <li>Enter the endpoint URL with ?format=json</li>
        <li>Under Advanced, add Authorization header: Bearer &lt;your-api-key&gt;</li>
        <li>Select and load the tables you need</li>
      </ol>
    </div>
  );
}

export default function BiConnectorsPage() {
  const [showForm, setShowForm] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Use the first space available (admin context)
  const defaultSpaceId = "default";

  const listProcedure = trpc.biConnector.list;
  const { data, isLoading } = listProcedure.useQuery({
    spaceId: defaultSpaceId,
    limit: 50,
  });

  const utils = trpc.useUtils();

  const refreshProcedure = trpc.biConnector.refresh;
  const refreshMutation = refreshProcedure.useMutation({
    onSuccess: () => {
      toast.success("Dataset refreshed successfully");
      void utils.biConnector.list.invalidate();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const deleteProcedure = trpc.biConnector.delete;
  const deleteMutation = deleteProcedure.useMutation({
    onSuccess: () => {
      toast.success("BI connector deleted");
      void utils.biConnector.list.invalidate();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  interface BiConnectorItem {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
    datasetConfig: unknown;
    lastRefreshedAt: string | null;
    createdBy: { id: string; name: string | null; email: string };
  }

  const connectors: BiConnectorItem[] = (data?.items ?? []) as BiConnectorItem[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">BI Connectors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect Ignite data to Tableau and Power BI for custom dashboards and reports.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Connector
        </button>
      </div>

      {/* Configure Form */}
      {showForm && <ConfigureForm onClose={() => setShowForm(false)} spaceId={defaultSpaceId} />}

      {/* Connectors List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading connectors...</span>
        </div>
      ) : connectors.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-700">No BI connectors</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure a connector to start exporting data to Tableau or Power BI.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {connectors.map((connector) => {
            const config = connector.datasetConfig as Record<string, boolean>;
            const isExpanded = expandedId === connector.id;

            return (
              <div key={connector.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{connector.name}</h3>
                      <ProviderBadge provider={connector.provider} />
                      <StatusIndicator isActive={connector.isActive} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Created by {connector.createdBy.name ?? connector.createdBy.email}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {DATASET_OPTIONS.filter((d) => config[d.key]).map((d) => (
                        <span
                          key={d.key}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                    {connector.lastRefreshedAt && (
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        Last refreshed: {new Date(connector.lastRefreshedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => refreshMutation.mutate({ id: connector.id })}
                      disabled={refreshMutation.isPending}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                      title="Refresh dataset"
                    >
                      <RefreshCw
                        className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")}
                      />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : connector.id)}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      {isExpanded ? "Hide" : "Endpoints"}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this BI connector?")) {
                          deleteMutation.mutate({ id: connector.id });
                        }
                      }}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete connector"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    <ConnectorEndpoints connectorId={connector.id} />
                    <ConnectionInstructions provider={connector.provider} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
