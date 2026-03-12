"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Ban, Key, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
      )}
    >
      {isActive ? "Active" : "Revoked"}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CreateApiKeyForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [expiresInDays, setExpiresInDays] = React.useState<string>("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([]);
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);

  const utils = trpc.useUtils();
  const availableScopes = trpc.apiKey.availableScopes.useQuery();
  const createMutation = trpc.apiKey.create.useMutation({
    onSuccess: (result) => {
      setCreatedKey(result.rawKey);
      toast.success("API key created");
      void utils.apiKey.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  if (createdKey) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h3 className="mb-2 text-lg font-semibold text-green-800">API Key Created</h3>
        <p className="mb-3 text-sm text-green-700">
          Copy your API key now. You will not be able to see it again.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-white px-3 py-2">
          <code className="flex-1 break-all text-sm text-gray-900">{createdKey}</code>
          <CopyButton text={createdKey} />
        </div>
        <button
          onClick={onClose}
          className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Create API Key</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate({
            name,
            scopes: selectedScopes,
            expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="My integration key"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Expires In (days)</label>
          <input
            type="number"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Leave empty for no expiration"
            min="1"
            max="365"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Scopes (leave empty for all access)
          </label>
          <div className="space-y-1 rounded-md border border-gray-200 p-2">
            {availableScopes.data?.map((scope) => (
              <label
                key={scope}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{scope}</span>
              </label>
            )) ?? <p className="text-sm text-gray-500">Loading scopes...</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create API Key"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ApiKeysPage() {
  const [showCreate, setShowCreate] = React.useState(false);
  const apiKeys = trpc.apiKey.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();

  const revokeMutation = trpc.apiKey.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      void utils.apiKey.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.apiKey.delete.useMutation({
    onSuccess: () => {
      toast.success("API key deleted");
      void utils.apiKey.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500">
            Manage API keys for programmatic access to the REST API. Keys are used with Bearer
            authentication.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create API Key
          </button>
        )}
      </div>

      {showCreate && <CreateApiKeyForm onClose={() => setShowCreate(false)} />}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Key Prefix
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Scopes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Last Used
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Expires
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {apiKeys.isLoading &&
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-gray-100" />
                  </td>
                </tr>
              ))}

            {apiKeys.data?.items.length === 0 && !apiKeys.isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Key className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No API keys created yet</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-3 text-sm font-medium text-primary-600 hover:underline"
                  >
                    Create your first API key
                  </button>
                </td>
              </tr>
            )}

            {apiKeys.data?.items.map((key) => (
              <tr key={key.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {key.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-500">
                  {key.keyPrefix}...
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge isActive={key.isActive} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {key.scopes.length === 0 ? (
                    <span className="text-gray-400">All access</span>
                  ) : (
                    <span>{key.scopes.length} scopes</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "Never"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {key.isActive && (
                      <button
                        onClick={() => revokeMutation.mutate({ id: key.id })}
                        className="rounded p-1 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"
                        title="Revoke"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Delete this API key?")) {
                          deleteMutation.mutate({ id: key.id });
                        }
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-800">REST API Usage</h3>
        <p className="mt-1 text-sm text-blue-700">
          Use your API key with the REST API endpoints for data export:
        </p>
        <div className="mt-2 space-y-1 rounded bg-white p-3 font-mono text-xs text-gray-800">
          <p>GET /api/v1/campaigns</p>
          <p>GET /api/v1/ideas</p>
          <p>GET /api/v1/users</p>
        </div>
        <p className="mt-2 text-xs text-blue-600">
          Include your key in the Authorization header: <code>Bearer ign_...</code>
        </p>
      </div>
    </div>
  );
}
