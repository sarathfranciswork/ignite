"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Send,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    ERROR: "bg-red-100 text-red-700",
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

function CreateTeamsForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([]);

  const utils = trpc.useUtils();
  const availableEvents = trpc.teams.availableEvents.useQuery();
  const createMutation = trpc.teams.create.useMutation({
    onSuccess: () => {
      toast.success("Teams integration created");
      void utils.teams.list.invalidate();
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
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Create Teams Integration</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate({
            name,
            webhookUrl,
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
            placeholder="e.g. Innovation Team Channel"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Teams Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="https://outlook.webhook.office.com/webhookb2/..."
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Create an incoming webhook in your Teams channel and paste the URL here.
          </p>
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
            <label className="block text-sm font-medium text-gray-700">Events to notify</label>
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
            {createMutation.isPending ? "Creating..." : "Create Integration"}
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

function TeamsIntegrationRow({
  integration,
}: {
  integration: {
    id: string;
    name: string;
    webhookUrl: string;
    status: string;
    events: string[];
    description: string | null;
    lastError: string | null;
    lastSentAt: string | null;
    createdAt: string;
    campaign: { id: string; title: string } | null;
    channel: { id: string; title: string } | null;
  };
}) {
  const [expanded, setExpanded] = React.useState(false);
  const utils = trpc.useUtils();

  const pauseMutation = trpc.teams.pause.useMutation({
    onSuccess: () => {
      toast.success("Integration paused");
      void utils.teams.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const activateMutation = trpc.teams.activate.useMutation({
    onSuccess: () => {
      toast.success("Integration activated");
      void utils.teams.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.teams.delete.useMutation({
    onSuccess: () => {
      toast.success("Integration deleted");
      void utils.teams.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = trpc.teams.test.useMutation({
    onSuccess: () => {
      toast.success("Test message sent to Teams channel");
      void utils.teams.list.invalidate();
    },
    onError: (err) => toast.error(`Test failed: ${err.message}`),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <div>
            <p className="font-medium text-gray-900">{integration.name}</p>
            <p className="max-w-md truncate text-xs text-gray-500">{integration.webhookUrl}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={integration.status} />
          <span className="text-xs text-gray-400">{integration.events.length} events</span>
          {integration.campaign && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
              {integration.campaign.title}
            </span>
          )}
          <button
            onClick={() => testMutation.mutate({ id: integration.id })}
            disabled={testMutation.isPending}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Send test message"
          >
            <Send className="h-4 w-4" />
          </button>
          {integration.status === "ACTIVE" ? (
            <button
              onClick={() => pauseMutation.mutate({ id: integration.id })}
              className="rounded p-1 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => activateMutation.mutate({ id: integration.id })}
              className="rounded p-1 text-gray-400 hover:bg-green-50 hover:text-green-600"
              title="Activate"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Delete this Teams integration?")) {
                deleteMutation.mutate({ id: integration.id });
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
          {integration.description && (
            <p className="mb-3 text-sm text-gray-600">{integration.description}</p>
          )}
          {integration.lastError && (
            <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">Last Error</p>
                <p className="text-xs text-red-600">{integration.lastError}</p>
              </div>
            </div>
          )}
          <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Subscribed Events</h4>
          <div className="mb-3 flex flex-wrap gap-1">
            {integration.events.map((e) => (
              <span key={e} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {e}
              </span>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            {integration.lastSentAt && (
              <span>Last sent: {new Date(integration.lastSentAt).toLocaleString()}</span>
            )}
            <span>Created: {new Date(integration.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamsIntegrationPage() {
  const [showCreate, setShowCreate] = React.useState(false);
  const integrations = trpc.teams.list.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Microsoft Teams Integration</h1>
          <p className="text-sm text-gray-500">
            Send notifications to Microsoft Teams channels when events occur on the platform.
            Configure incoming webhooks to keep your team updated.
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </button>
        )}
      </div>

      {showCreate && <CreateTeamsForm onClose={() => setShowCreate(false)} />}

      <div className="space-y-3">
        {integrations.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {integrations.data?.items.length === 0 && !integrations.isLoading && (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No Teams integrations configured yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Create an incoming webhook in your Teams channel, then add the integration here.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium text-primary-600 hover:underline"
            >
              Add your first integration
            </button>
          </div>
        )}

        {integrations.data?.items.map((integration) => (
          <TeamsIntegrationRow key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}
