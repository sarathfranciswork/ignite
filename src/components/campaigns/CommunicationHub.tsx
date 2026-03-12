"use client";

import { useState } from "react";
import { Send, Mail, Rss, Users, ChevronRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

interface CommunicationHubProps {
  campaignId: string;
}

type AudienceSegment =
  | "ALL_MEMBERS"
  | "CONTRIBUTORS"
  | "NON_CONTRIBUTORS"
  | "VIEWERS_NO_CONTRIBUTION"
  | "SELECTED_IDEA_AUTHORS"
  | "MANAGERS"
  | "COACHES"
  | "EVALUATORS"
  | "SEEDERS"
  | "SPONSORS"
  | "CUSTOM_ROLE";

const SEGMENT_LABELS: Record<AudienceSegment, string> = {
  ALL_MEMBERS: "All Members",
  CONTRIBUTORS: "Contributors",
  NON_CONTRIBUTORS: "Non-Contributors",
  VIEWERS_NO_CONTRIBUTION: "Viewers (No Contribution)",
  SELECTED_IDEA_AUTHORS: "Selected Idea Authors",
  MANAGERS: "Managers",
  COACHES: "Coaches",
  EVALUATORS: "Evaluators",
  SEEDERS: "Seeders",
  SPONSORS: "Sponsors",
  CUSTOM_ROLE: "Custom Role",
};

const SEGMENT_OPTIONS = Object.entries(SEGMENT_LABELS).map(([value, label]) => ({
  value: value as AudienceSegment,
  label,
}));

type MessageStatus = "DRAFT" | "SENT" | "FAILED";

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case "DRAFT":
      return <Clock className="h-4 w-4 text-gray-400" />;
    case "SENT":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "FAILED":
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function DeliveryLabel({ postToFeed, sendEmail }: { postToFeed: boolean; sendEmail: boolean }) {
  if (postToFeed && sendEmail) return <>Feed + Email</>;
  if (postToFeed) return <>Feed Only</>;
  if (sendEmail) return <>Email Only</>;
  return <>None</>;
}

export function CommunicationHub({ campaignId }: CommunicationHubProps) {
  const [view, setView] = useState<"compose" | "history" | "detail">("history");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Compose state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [postToFeed, setPostToFeed] = useState(true);
  const [sendEmailFlag, setSendEmailFlag] = useState(true);
  const [segment, setSegment] = useState<AudienceSegment>("ALL_MEMBERS");
  const [showConfirm, setShowConfirm] = useState(false);

  const utils = trpc.useUtils();

  const listQuery = trpc.communication.list.useQuery(
    { campaignId, limit: 20 },
    { enabled: view === "history" },
  );

  const detailQuery = trpc.communication.getById.useQuery(
    { id: selectedMessageId ?? "" },
    { enabled: view === "detail" && !!selectedMessageId },
  );

  const previewQuery = trpc.communication.previewRecipients.useQuery(
    { campaignId, segment },
    { enabled: view === "compose" },
  );

  const createMutation = trpc.communication.create.useMutation();
  const sendMutation = trpc.communication.send.useMutation({
    onSuccess: () => {
      setSubject("");
      setBody("");
      setShowConfirm(false);
      setView("history");
      utils.communication.list.invalidate({ campaignId });
    },
  });

  const handleSend = async () => {
    const draft = await createMutation.mutateAsync({
      campaignId,
      subject,
      body,
      segment,
      postToFeed,
      sendEmail: sendEmailFlag,
    });
    sendMutation.mutate({ id: draft.id });
  };

  const isSending = createMutation.isPending || sendMutation.isPending;
  const sendError = createMutation.error ?? sendMutation.error;

  const handleViewDetail = (messageId: string) => {
    setSelectedMessageId(messageId);
    setView("detail");
  };

  const deliveryOptions = [
    { postToFeed: true, sendEmail: true, label: "Feed + Email", icon: Send },
    { postToFeed: false, sendEmail: true, label: "Email Only", icon: Mail },
    { postToFeed: true, sendEmail: false, label: "Feed Only", icon: Rss },
  ];

  // ── Compose View ──
  if (view === "compose") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Compose Message</h3>
          <button
            onClick={() => setView("history")}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Back to History
          </button>
        </div>

        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          {/* Subject */}
          <div>
            <label htmlFor="msg-subject" className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              id="msg-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="msg-body" className="block text-sm font-medium text-gray-700">
              Message Body
            </label>
            <textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Write your message here... (HTML supported)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Delivery Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery Method</label>
            <div className="mt-2 flex gap-3">
              {deliveryOptions.map((method) => {
                const isActive =
                  postToFeed === method.postToFeed && sendEmailFlag === method.sendEmail;
                return (
                  <button
                    key={method.label}
                    onClick={() => {
                      setPostToFeed(method.postToFeed);
                      setSendEmailFlag(method.sendEmail);
                    }}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <method.icon className="h-4 w-4" />
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audience Segment */}
          <div>
            <label htmlFor="msg-segment" className="block text-sm font-medium text-gray-700">
              Audience Segment
            </label>
            <select
              id="msg-segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value as AudienceSegment)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {SEGMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {previewQuery.isLoading
                  ? "Loading recipients..."
                  : previewQuery.data
                    ? `${previewQuery.data.count} recipient${previewQuery.data.count !== 1 ? "s" : ""}`
                    : "Select a segment to preview"}
              </span>
            </div>
            {previewQuery.data && previewQuery.data.sample.length > 0 && (
              <div className="mt-2 text-xs text-blue-600">
                Sample: {previewQuery.data.sample.map((u) => u.name ?? u.email).join(", ")}
                {previewQuery.data.count > 10 && ` and ${previewQuery.data.count - 10} more`}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setView("history")}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {showConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-600">Are you sure?</span>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Confirm Send"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!subject.trim() || !body.trim() || !previewQuery.data?.count}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send Message
              </button>
            )}
          </div>

          {sendError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{sendError.message}</div>
          )}
        </div>
      </div>
    );
  }

  // ── Detail View ──
  if (view === "detail" && selectedMessageId) {
    if (detailQuery.isLoading) {
      return (
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        </div>
      );
    }

    if (detailQuery.isError || !detailQuery.data) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load message details.</p>
          <button
            onClick={() => setView("history")}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Back to History
          </button>
        </div>
      );
    }

    const detail = detailQuery.data;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Message Details</h3>
          <button
            onClick={() => setView("history")}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Back to History
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h4 className="text-base font-semibold text-gray-900">{detail.subject}</h4>
              <p className="mt-1 text-sm text-gray-500">
                {detail.sentBy
                  ? `Sent by ${detail.sentBy.name ?? detail.sentBy.email}`
                  : "Unknown sender"}
                {detail.sentAt && ` on ${format(new Date(detail.sentAt), "MMM d, yyyy HH:mm")}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusIcon status={detail.status as MessageStatus} />
              <span className="text-sm font-medium capitalize text-gray-600">
                {detail.status.toLowerCase()}
              </span>
            </div>
          </div>

          <div className="mb-6 flex gap-3 text-sm text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">
              {SEGMENT_LABELS[detail.segment as AudienceSegment] ?? detail.segment}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1">
              <DeliveryLabel postToFeed={detail.postToFeed} sendEmail={detail.sendEmail} />
            </span>
          </div>

          {/* Delivery stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              { label: "Recipients", value: detail.recipientCount, color: "text-gray-900" },
              { label: "Delivered", value: detail.deliveredCount, color: "text-green-600" },
              { label: "Failed", value: detail.failedCount, color: "text-red-600" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Message body preview */}
          <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: detail.body }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── History View (Default) ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Communication Hub</h3>
        <button
          onClick={() => setView("compose")}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Send className="h-4 w-4" />
          New Message
        </button>
      </div>

      {listQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {listQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load message history.</p>
        </div>
      )}

      {listQuery.data && listQuery.data.items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <Mail className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No messages sent yet. Click &quot;New Message&quot; to get started.
          </p>
        </div>
      )}

      {listQuery.data && listQuery.data.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Segment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Recipients
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Sent
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listQuery.data.items.map((msg) => (
                <tr
                  key={msg.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleViewDetail(msg.id)}
                >
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm font-medium text-gray-900">
                    {msg.subject}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {SEGMENT_LABELS[msg.segment as AudienceSegment] ?? msg.segment}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{msg.recipientCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <DeliveryLabel postToFeed={msg.postToFeed} sendEmail={msg.sendEmail} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={msg.status as MessageStatus} />
                      <span className="text-sm capitalize text-gray-600">
                        {msg.status.toLowerCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {msg.sentAt ? format(new Date(msg.sentAt), "MMM d, HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
