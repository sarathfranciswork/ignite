"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Globe,
  Network,
  Plus,
  Trash2,
  Download,
  UserX,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabKey = "gdpr" | "residency" | "ipWhitelist";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };
  const icons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="mr-1 h-3 w-3" />,
    PROCESSING: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
    COMPLETED: <CheckCircle className="mr-1 h-3 w-3" />,
    FAILED: <AlertCircle className="mr-1 h-3 w-3" />,
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

function GdprTab() {
  const [exportUserId, setExportUserId] = React.useState("");
  const [erasureUserId, setErasureUserId] = React.useState("");

  const requests = trpc.compliance.gdpr.listRequests.useQuery({ limit: 50 });
  const utils = trpc.useUtils();

  const exportMutation = trpc.compliance.gdpr.requestExport.useMutation({
    onSuccess: () => {
      toast.success("Data export request created");
      setExportUserId("");
      void utils.compliance.gdpr.listRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const erasureMutation = trpc.compliance.gdpr.requestErasure.useMutation({
    onSuccess: () => {
      toast.success("Data erasure request created");
      setErasureUserId("");
      void utils.compliance.gdpr.listRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const processMutation = trpc.compliance.gdpr.process.useMutation({
    onSuccess: () => {
      toast.success("Request processed");
      void utils.compliance.gdpr.listRequests.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
            <Download className="mr-2 h-4 w-4" />
            Request Data Export
          </h4>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              exportMutation.mutate({ userId: exportUserId });
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={exportUserId}
              onChange={(e) => setExportUserId(e.target.value)}
              placeholder="User ID"
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={exportMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {exportMutation.isPending ? "Requesting..." : "Export"}
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
            <UserX className="mr-2 h-4 w-4" />
            Request Data Erasure
          </h4>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (window.confirm("This will anonymize all user data. This cannot be undone.")) {
                erasureMutation.mutate({ userId: erasureUserId });
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={erasureUserId}
              onChange={(e) => setErasureUserId(e.target.value)}
              placeholder="User ID"
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={erasureMutation.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {erasureMutation.isPending ? "Requesting..." : "Erase"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h4 className="text-sm font-semibold text-gray-900">GDPR Requests</h4>
        </div>
        {requests.isLoading && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Loading...</p>
        )}
        {requests.data?.items.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">No GDPR requests yet</p>
        )}
        <div className="divide-y divide-gray-100">
          {requests.data?.items.map((req) => (
            <div key={req.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{req.requestType}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  User: {req.user.name ?? req.user.email} | Requested:{" "}
                  {new Date(req.requestedAt).toLocaleDateString()}
                  {req.completedAt &&
                    ` | Completed: ${new Date(req.completedAt).toLocaleDateString()}`}
                </p>
                {req.notes && <p className="mt-1 text-xs text-gray-500">{req.notes}</p>}
              </div>
              {req.status === "PENDING" && (
                <button
                  onClick={() => processMutation.mutate({ requestId: req.id })}
                  disabled={processMutation.isPending}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Process
                </button>
              )}
              {req.resultUrl && (
                <a
                  href={req.resultUrl}
                  download="gdpr-export.json"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="mr-1 inline h-3 w-3" />
                  Download
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResidencyTab({ spaceId }: { spaceId: string }) {
  const config = trpc.compliance.residency.get.useQuery({ spaceId }, { enabled: !!spaceId });
  const report = trpc.compliance.residency.report.useQuery({ spaceId }, { enabled: !!spaceId });
  const utils = trpc.useUtils();

  const [region, setRegion] = React.useState("US");
  const [retentionDays, setRetentionDays] = React.useState(365);

  React.useEffect(() => {
    if (config.data) {
      setRegion(config.data.region);
      setRetentionDays(config.data.dataRetentionDays);
    }
  }, [config.data]);

  const configureMutation = trpc.compliance.residency.configure.useMutation({
    onSuccess: () => {
      toast.success("Data residency configured");
      void utils.compliance.residency.get.invalidate();
      void utils.compliance.residency.report.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h4 className="mb-4 text-sm font-semibold text-gray-900">Data Residency Configuration</h4>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            configureMutation.mutate({
              spaceId,
              region: region as "US" | "EU" | "APAC",
              dataRetentionDays: retentionDays,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="US">United States (US)</option>
              <option value="EU">European Union (EU)</option>
              <option value="APAC">Asia Pacific (APAC)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data Retention (days)</label>
            <input
              type="number"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 365)}
              min={30}
              max={3650}
              className="mt-1 w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Data older than this will be deleted during scheduled cleanup (30-3650 days)
            </p>
          </div>

          <button
            type="submit"
            disabled={configureMutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {configureMutation.isPending ? "Saving..." : "Save Configuration"}
          </button>
        </form>
      </div>

      {report.data && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Data Location Report</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Region</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{report.data.region}</p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Storage Location</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {report.data.storageLocation}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Retention</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {report.data.dataRetentionDays} days
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Ideas</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{report.data.stats.ideas}</p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Users</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{report.data.stats.users}</p>
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Comments</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {report.data.stats.comments}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IpWhitelistTab({ spaceId }: { spaceId: string }) {
  const [cidr, setCidr] = React.useState("");
  const [description, setDescription] = React.useState("");

  const entries = trpc.compliance.ipWhitelist.list.useQuery({ spaceId }, { enabled: !!spaceId });
  const utils = trpc.useUtils();

  const addMutation = trpc.compliance.ipWhitelist.add.useMutation({
    onSuccess: () => {
      toast.success("IP range added");
      setCidr("");
      setDescription("");
      void utils.compliance.ipWhitelist.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.compliance.ipWhitelist.remove.useMutation({
    onSuccess: () => {
      toast.success("IP range removed");
      void utils.compliance.ipWhitelist.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.compliance.ipWhitelist.toggle.useMutation({
    onSuccess: () => {
      toast.success("IP range updated");
      void utils.compliance.ipWhitelist.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h4 className="mb-4 text-sm font-semibold text-gray-900">Add IP Range</h4>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate({
              spaceId,
              cidr,
              description: description || undefined,
            });
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">CIDR Range</label>
            <input
              type="text"
              value={cidr}
              onChange={(e) => setCidr(e.target.value)}
              placeholder="e.g., 10.0.0.0/8 or 192.168.1.0/24"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Office network"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {addMutation.isPending ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h4 className="text-sm font-semibold text-gray-900">Whitelisted IP Ranges</h4>
          <p className="mt-0.5 text-xs text-gray-500">
            When IP whitelisting is enabled, only IPs matching these ranges can access the platform.
          </p>
        </div>
        {entries.data?.items.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            No IP ranges configured. All IPs are allowed.
          </p>
        )}
        <div className="divide-y divide-gray-100">
          {entries.data?.items.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm text-gray-900">
                    {entry.cidr}
                  </code>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      entry.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {entry.isActive ? "Active" : "Disabled"}
                  </span>
                </div>
                {entry.description && (
                  <p className="mt-0.5 text-xs text-gray-500">{entry.description}</p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  Added by {entry.createdBy.name ?? entry.createdBy.email}
                </p>
              </div>

              <button
                onClick={() => toggleMutation.mutate({ id: entry.id, isActive: !entry.isActive })}
                disabled={toggleMutation.isPending}
                className="text-gray-400 hover:text-gray-600"
                title={entry.isActive ? "Disable" : "Enable"}
              >
                {entry.isActive ? (
                  <ToggleRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Remove this IP range?")) {
                    removeMutation.mutate({ id: entry.id });
                  }
                }}
                disabled={removeMutation.isPending}
                className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("gdpr");
  const [spaceId, setSpaceId] = React.useState("");

  const spaces = trpc.space.list.useQuery({ limit: 100 }, { select: (data) => data.items });

  React.useEffect(() => {
    if (spaces.data?.length && !spaceId) {
      setSpaceId(spaces.data[0].id);
    }
  }, [spaces.data, spaceId]);

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: "gdpr", label: "GDPR", icon: <Shield className="mr-1.5 h-4 w-4" /> },
    { key: "residency", label: "Data Residency", icon: <Globe className="mr-1.5 h-4 w-4" /> },
    { key: "ipWhitelist", label: "IP Whitelisting", icon: <Network className="mr-1.5 h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="mt-1 text-sm text-gray-500">
          GDPR compliance, data residency controls, and IP whitelisting
        </p>
      </div>

      {spaces.data && spaces.data.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Space</label>
          <select
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            className="mt-1 w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {spaces.data.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center border-b-2 px-1 pb-3 text-sm font-medium",
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "gdpr" && <GdprTab />}
      {activeTab === "residency" && spaceId && <ResidencyTab spaceId={spaceId} />}
      {activeTab === "ipWhitelist" && spaceId && <IpWhitelistTab spaceId={spaceId} />}
    </div>
  );
}
