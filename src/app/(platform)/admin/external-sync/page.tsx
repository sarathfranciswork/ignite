"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function SyncStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SYNCED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    ERROR: "bg-red-100 text-red-700",
  };

  const icons: Record<string, React.ReactNode> = {
    SYNCED: <CheckCircle className="mr-1 h-3 w-3" />,
    PENDING: <Clock className="mr-1 h-3 w-3" />,
    ERROR: <AlertCircle className="mr-1 h-3 w-3" />,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {icons[status]}
      {status}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const styles: Record<string, string> = {
    JIRA: "bg-blue-100 text-blue-700",
    AZURE_DEVOPS: "bg-purple-100 text-purple-700",
  };

  const labels: Record<string, string> = {
    JIRA: "Jira",
    AZURE_DEVOPS: "Azure DevOps",
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

// Use dynamic routing to avoid deep type inference issues (TS2589)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncRouter = () => (trpc as Record<string, any>).externalSync;

interface MutationResult {
  mutate: (input: Record<string, unknown>) => void;
  isPending: boolean;
  error: { message: string } | null;
  isSuccess: boolean;
}

function useSyncMutation(procedure: string, successMsg: string): MutationResult {
  const utils = trpc.useUtils();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
  return (syncRouter()[procedure] as any).useMutation({
    onSuccess: () => {
      toast.success(successMsg);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      void (utils as Record<string, any>).externalSync.list.invalidate();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      void (utils as Record<string, any>).externalSync.listItems.invalidate();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
    },
  }) as unknown as MutationResult;
}

export default function ExternalSyncPage() {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [selectedSyncId, setSelectedSyncId] = React.useState<string | null>(null);
  const [spaceId, setSpaceId] = React.useState("default");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const syncsQuery = syncRouter().list.useQuery({ spaceId, limit: 50 }, { enabled: !!spaceId });

  const deleteMutation = useSyncMutation("delete", "Sync configuration deleted");
  const testMutation = useSyncMutation("testConnection", "Connection test complete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">External Sync</h1>
          <p className="text-muted-foreground text-sm">
            Sync ideas and projects to Jira or Azure DevOps
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Sync Config
        </button>
      </div>

      {showCreateForm && (
        <CreateSyncForm
          spaceId={spaceId}
          onSpaceIdChange={setSpaceId}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      <div className="space-y-4">
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
        {syncsQuery.isLoading && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Loading sync configurations...
          </div>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
        {syncsQuery.data?.items?.map(
          (sync: {
            id: string;
            provider: string;
            baseUrl: string;
            projectKey: string;
            isActive: boolean;
            createdAt: string;
            _count: { syncedItems: number };
            space: { name: string };
          }) => (
            <div key={sync.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Plug className="text-muted-foreground h-4 w-4" />
                    <ProviderBadge provider={sync.provider} />
                    <span className="text-sm font-medium">{sync.projectKey}</span>
                    {!sync.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {sync.baseUrl} &middot; {sync._count.syncedItems} synced items &middot; Space:{" "}
                    {sync.space.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSyncId(selectedSyncId === sync.id ? null : sync.id)}
                    className="hover:bg-accent rounded p-1"
                    title="View synced items"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      testMutation.mutate({
                        provider: sync.provider,
                        baseUrl: sync.baseUrl,
                        apiToken: "***",
                      })
                    }
                    className="hover:bg-accent rounded p-1"
                    title="Test connection"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this sync configuration?")) {
                        deleteMutation.mutate({ id: sync.id });
                      }
                    }}
                    className="hover:bg-destructive/10 text-destructive rounded p-1"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {selectedSyncId === sync.id && <SyncedItemsList syncId={sync.id} />}
            </div>
          ),
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
        {!syncsQuery.isLoading &&
          (!syncsQuery.data?.items || syncsQuery.data.items.length === 0) && (
            <div className="text-muted-foreground py-12 text-center text-sm">
              No sync configurations yet. Create one to get started.
            </div>
          )}
      </div>
    </div>
  );
}

function CreateSyncForm({
  spaceId,
  onSpaceIdChange,
  onClose,
}: {
  spaceId: string;
  onSpaceIdChange: (id: string) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = React.useState<"JIRA" | "AZURE_DEVOPS">("JIRA");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiToken, setApiToken] = React.useState("");
  const [projectKey, setProjectKey] = React.useState("");

  const configureMutation = useSyncMutation("configure", "Sync configuration created");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configureMutation.mutate({
      spaceId,
      provider,
      baseUrl,
      apiToken,
      projectKey,
      fieldMappings: {},
      statusMappings: {},
    });
    if (!configureMutation.error) {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">New Sync Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as "JIRA" | "AZURE_DEVOPS")}
            className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="JIRA">Jira</option>
            <option value="AZURE_DEVOPS">Azure DevOps</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Space ID</label>
          <input
            type="text"
            value={spaceId}
            onChange={(e) => onSpaceIdChange(e.target.value)}
            className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Base URL</label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={
            provider === "JIRA"
              ? "https://your-domain.atlassian.net"
              : "https://dev.azure.com/your-org"
          }
          className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">API Token</label>
        <input
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Project Key</label>
        <input
          type="text"
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value)}
          placeholder={provider === "JIRA" ? "PROJ" : "MyProject"}
          className="border-input mt-1 w-full rounded-md border px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">
          Cancel
        </button>
        <button
          type="submit"
          disabled={configureMutation.isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {configureMutation.isPending ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}

function SyncedItemsList({ syncId }: { syncId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const itemsQuery = syncRouter().listItems.useQuery({ syncId, limit: 50 });
  const resyncMutation = useSyncMutation("resyncItem", "Item re-synced");

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="mb-2 text-sm font-medium">Synced Items</h4>
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
      {itemsQuery.isLoading && <p className="text-muted-foreground text-xs">Loading...</p>}
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
      {itemsQuery.data?.items?.length === 0 && (
        <p className="text-muted-foreground text-xs">No items synced yet.</p>
      )}
      <div className="space-y-2">
        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
        {itemsQuery.data?.items?.map(
          (item: {
            id: string;
            entityType: string;
            entityId: string;
            externalId: string;
            externalUrl: string | null;
            syncStatus: string;
            lastSyncedAt: string;
            errorMessage: string | null;
          }) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                  {item.entityType}
                </span>
                <span className="text-muted-foreground text-xs">{item.entityId}</span>
                <SyncStatusBadge status={item.syncStatus} />
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    {item.externalId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.errorMessage && (
                  <span
                    className="text-destructive max-w-[200px] truncate text-xs"
                    title={item.errorMessage}
                  >
                    {item.errorMessage}
                  </span>
                )}
                <button
                  onClick={() => resyncMutation.mutate({ id: item.id })}
                  className="hover:bg-accent rounded p-1"
                  title="Re-sync"
                  disabled={resyncMutation.isPending}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
