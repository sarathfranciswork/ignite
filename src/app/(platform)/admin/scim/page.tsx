"use client";

import * as React from "react";
import { KeyRound, Copy, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-500">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border bg-gray-50 px-3 py-2 text-sm">{value}</code>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function CreateTokenDialog({
  onCreated,
}: {
  onCreated: (token: { id: string; name: string; plainToken: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const createMutation = trpc.admin.scimTokenCreate.useMutation({
    onSuccess: (data) => {
      onCreated(data);
      setName("");
      setIsOpen(false);
    },
  });

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} size="sm">
        <Plus className="mr-1 h-4 w-4" />
        Create Token
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Token name (e.g. Azure AD)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border px-3 py-1.5 text-sm"
      />
      <Button
        size="sm"
        onClick={() => createMutation.mutate({ name })}
        disabled={!name.trim() || createMutation.isPending}
      >
        {createMutation.isPending ? "Creating..." : "Create"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function NewTokenDisplay({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="border-green-200 bg-green-50 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-green-800">
            Token created successfully. Copy it now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md border border-green-300 bg-white px-3 py-2 text-xs">
              {token}
            </code>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss} className="text-green-700">
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ScimPage() {
  const [newToken, setNewToken] = React.useState<string | null>(null);
  const utils = trpc.useUtils();

  const tokensQuery = trpc.admin.scimTokenList.useQuery({ limit: 50 });
  const statsQuery = trpc.admin.scimStats.useQuery();

  const revokeMutation = trpc.admin.scimTokenRevoke.useMutation({
    onSuccess: () => {
      utils.admin.scimTokenList.invalidate();
      utils.admin.scimStats.invalidate();
    },
  });

  function handleTokenCreated(data: { id: string; name: string; plainToken: string }) {
    setNewToken(data.plainToken);
    utils.admin.scimTokenList.invalidate();
    utils.admin.scimStats.invalidate();
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-primary-600" />
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">SCIM Provisioning</h1>
            <p className="text-sm text-gray-500">
              Manage SCIM 2.0 tokens for automated user provisioning from your identity provider
            </p>
          </div>
        </div>
      </div>

      {/* Endpoint Configuration */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">SCIM Endpoint Configuration</h2>
        <div className="space-y-3">
          <CopyableField label="SCIM Base URL" value={`${baseUrl}/api/scim/v2`} />
          <div className="text-xs text-gray-400">
            Use this URL in your identity provider&apos;s SCIM configuration. Authentication uses
            Bearer token.
          </div>
        </div>
      </Card>

      {/* Stats */}
      {statsQuery.data && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{statsQuery.data.activeTokens}</div>
            <div className="text-xs text-gray-500">Active Tokens</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {statsQuery.data.provisionedUsers}
            </div>
            <div className="text-xs text-gray-500">Provisioned Users</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {statsQuery.data.lastSyncAt
                ? formatDistanceToNow(new Date(statsQuery.data.lastSyncAt), { addSuffix: true })
                : "Never"}
            </div>
            <div className="text-xs text-gray-500">Last Sync</div>
          </Card>
        </div>
      )}

      {/* New Token Alert */}
      {newToken && <NewTokenDisplay token={newToken} onDismiss={() => setNewToken(null)} />}

      {/* Token Management */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Bearer Tokens</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                utils.admin.scimTokenList.invalidate();
                utils.admin.scimStats.invalidate();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <CreateTokenDialog onCreated={handleTokenCreated} />
          </div>
        </div>

        {tokensQuery.isLoading && (
          <div className="py-8 text-center text-sm text-gray-400">Loading tokens...</div>
        )}

        {tokensQuery.data?.items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No SCIM tokens configured</p>
            <p className="text-xs text-gray-400">
              Create a token to allow your identity provider to provision users
            </p>
          </div>
        )}

        {tokensQuery.data?.items && tokensQuery.data.items.length > 0 && (
          <div className="divide-y">
            {tokensQuery.data.items.map((token) => (
              <div key={token.id} className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{token.name}</span>
                    <Badge variant={token.isActive ? "success" : "default"}>
                      {token.isActive ? "Active" : "Revoked"}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400">
                    Created {formatDistanceToNow(new Date(token.createdAt), { addSuffix: true })}
                    {token.lastUsedAt &&
                      ` · Last used ${formatDistanceToNow(new Date(token.lastUsedAt), { addSuffix: true })}`}
                    {token.expiresAt &&
                      ` · Expires ${formatDistanceToNow(new Date(token.expiresAt), { addSuffix: true })}`}
                    {token.createdBy && ` · by ${token.createdBy.name ?? token.createdBy.email}`}
                  </div>
                </div>
                {token.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => revokeMutation.mutate({ id: token.id })}
                    disabled={revokeMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
