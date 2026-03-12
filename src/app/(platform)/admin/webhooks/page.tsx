"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Send,
  ChevronDown,
  ChevronUp,
  Webhook,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    DISABLED: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {status}
    </span>
  );
}

function DeliveryStatusIcon({ status }: { status: string }) {
  if (status === "SUCCESS") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "FAILED") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-yellow-500" />;
}

function CreateWebhookForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([]);

  const utils = trpc.useUtils();
  const availableEvents = trpc.webhook.availableEvents.useQuery();
  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created");
      void utils.webhook.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const selectAll = () => {
    if (availableEvents.data) {
      setSelectedEvents([...availableEvents.data]);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Create Webhook</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate({
            name,
            url,
            events: selectedEvents,
            description: description || undefined,
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
            placeholder="My webhook"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="https://example.com/webhook"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Optional description"
            rows={2}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Events</label>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary-600 hover:underline"
            >
              Select all
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 p-2">
            {availableEvents.data?.map((event) => (
              <label
                key={event}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{event}</span>
              </label>
            )) ?? <p className="text-sm text-gray-500">Loading events...</p>}
          </div>
          {selectedEvents.length === 0 && (
            <p className="mt-1 text-xs text-red-500">Select at least one event</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending || selectedEvents.length === 0}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Webhook"}
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

function WebhookDeliveries({ webhookId }: { webhookId: string }) {
  const deliveries = trpc.webhook.deliveries.useQuery({ webhookId, limit: 10 });

  if (!deliveries.data?.items.length) {
    return <p className="py-2 text-sm text-gray-500">No deliveries yet</p>;
  }

  return (
    <div className="mt-2 space-y-1">
      {deliveries.data.items.map((d) => (
        <div key={d.id} className="flex items-center gap-3 rounded bg-gray-50 px-3 py-2 text-sm">
          <DeliveryStatusIcon status={d.status} />
          <span className="font-mono text-xs text-gray-600">{d.eventName}</span>
          <span className="text-gray-400">|</span>
          <span className="text-xs text-gray-500">
            {d.httpStatusCode ? `HTTP ${d.httpStatusCode}` : (d.errorMessage ?? "Pending")}
          </span>
          <span className="ml-auto text-xs text-gray-400">
            {new Date(d.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function WebhookRow({
  webhook,
}: {
  webhook: {
    id: string;
    name: string;
    url: string;
    status: string;
    events: string[];
    createdAt: string;
  };
}) {
  const [expanded, setExpanded] = React.useState(false);
  const utils = trpc.useUtils();

  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook updated");
      void utils.webhook.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted");
      void utils.webhook.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = trpc.webhook.test.useMutation({
    onSuccess: (result) => {
      if (result.status === "SUCCESS") {
        toast.success(`Test delivery succeeded (HTTP ${result.httpStatusCode})`);
      } else {
        toast.error("Test delivery failed");
      }
      void utils.webhook.deliveries.invalidate({ webhookId: webhook.id });
    },
    onError: (err) => toast.error(err.message),
  });

  const regenerateMutation = trpc.webhook.regenerateSecret.useMutation({
    onSuccess: (result) => {
      toast.success("Secret regenerated. New secret: " + result.secret);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Webhook className="h-5 w-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">{webhook.name}</p>
            <p className="text-xs text-gray-500">{webhook.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={webhook.status} />
          <span className="text-xs text-gray-400">{webhook.events.length} events</span>
          <button
            onClick={() => testMutation.mutate({ id: webhook.id })}
            disabled={testMutation.isPending}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Send test"
          >
            <Send className="h-4 w-4" />
          </button>
          {webhook.status === "ACTIVE" ? (
            <button
              onClick={() => updateMutation.mutate({ id: webhook.id, status: "PAUSED" })}
              className="rounded p-1 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => updateMutation.mutate({ id: webhook.id, status: "ACTIVE" })}
              className="rounded p-1 text-gray-400 hover:bg-green-50 hover:text-green-600"
              title="Activate"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => regenerateMutation.mutate({ id: webhook.id })}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Regenerate secret"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this webhook?")) {
                deleteMutation.mutate({ id: webhook.id });
              }
            }}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Subscribed Events</h4>
          <div className="mb-3 flex flex-wrap gap-1">
            {webhook.events.map((e) => (
              <span key={e} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {e}
              </span>
            ))}
          </div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Recent Deliveries</h4>
          <WebhookDeliveries webhookId={webhook.id} />
        </div>
      )}
    </div>
  );
}

export default function WebhooksPage() {
  const [showCreate, setShowCreate] = React.useState(false);
  const webhooks = trpc.webhook.list.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500">
            Configure outgoing webhooks to receive real-time notifications when events occur on the
            platform.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Create Webhook
          </button>
        )}
      </div>

      {showCreate && <CreateWebhookForm onClose={() => setShowCreate(false)} />}

      <div className="space-y-3">
        {webhooks.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {webhooks.data?.items.length === 0 && !webhooks.isLoading && (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <Webhook className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No webhooks configured yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium text-primary-600 hover:underline"
            >
              Create your first webhook
            </button>
          </div>
        )}

        {webhooks.data?.items.map((webhook) => (
          <WebhookRow key={webhook.id} webhook={webhook} />
        ))}
      </div>
    </div>
  );
}
