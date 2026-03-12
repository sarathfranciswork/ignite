"use client";

import * as React from "react";
import { Send, Plus, Trash2, Eye, Mail, Users, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SEGMENT_LABELS: Record<string, string> = {
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

const SEGMENTS = Object.keys(SEGMENT_LABELS);

interface CommunicationHubProps {
  campaignId: string;
}

export function CommunicationHub({ campaignId }: CommunicationHubProps) {
  const [showCompose, setShowCompose] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [segment, setSegment] = React.useState("ALL_MEMBERS");
  const [postToFeed, setPostToFeed] = React.useState(true);
  const [sendEmailFlag, setSendEmailFlag] = React.useState(true);
  const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null);

  const utils = trpc.useUtils();

  const messagesQuery = trpc.communication.list.useQuery(
    { campaignId, limit: 20 },
    { enabled: !!campaignId },
  );

  const recipientPreview = trpc.communication.previewRecipients.useQuery(
    {
      campaignId,
      segment: segment as "ALL_MEMBERS",
    },
    { enabled: !!campaignId && showCompose },
  );

  const createMutation = trpc.communication.create.useMutation({
    onSuccess: () => {
      void utils.communication.list.invalidate({ campaignId });
      setShowCompose(false);
      resetForm();
    },
  });

  const sendMutation = trpc.communication.send.useMutation({
    onSuccess: () => {
      void utils.communication.list.invalidate({ campaignId });
    },
  });

  const deleteMutation = trpc.communication.delete.useMutation({
    onSuccess: () => {
      void utils.communication.list.invalidate({ campaignId });
    },
  });

  function resetForm() {
    setSubject("");
    setBody("");
    setSegment("ALL_MEMBERS");
    setPostToFeed(true);
    setSendEmailFlag(true);
  }

  function handleCreateDraft() {
    createMutation.mutate({
      campaignId,
      subject,
      body,
      segment: segment as "ALL_MEMBERS",
      postToFeed,
      sendEmail: sendEmailFlag,
    });
  }

  function handleSend(messageId: string) {
    if (
      window.confirm("Are you sure you want to send this message? This action cannot be undone.")
    ) {
      sendMutation.mutate({ id: messageId });
    }
  }

  function handleDelete(messageId: string) {
    if (window.confirm("Are you sure you want to delete this draft?")) {
      deleteMutation.mutate({ id: messageId });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Communication Hub</h2>
          <p className="mt-1 text-sm text-gray-500">
            Send messages and segmented emails to campaign participants
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Compose Message
        </button>
      </div>

      {/* Compose Form */}
      {showCompose && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-900">New Message</h3>

          <div className="space-y-4">
            {/* Segment Selector */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Audience Segment
              </label>
              <div className="relative">
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {SEGMENTS.map((seg) => (
                    <option key={seg} value={seg}>
                      {SEGMENT_LABELS[seg]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              {recipientPreview.data && (
                <p className="mt-1 text-xs text-gray-500">
                  <Users className="mr-1 inline h-3 w-3" />
                  {recipientPreview.data.count} recipient
                  {recipientPreview.data.count !== 1 ? "s" : ""} will receive this message
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Message Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={6}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Options */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={postToFeed}
                  onChange={(e) => setPostToFeed(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Post to activity feed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmailFlag}
                  onChange={(e) => setSendEmailFlag(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Send email
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => {
                  setShowCompose(false);
                  resetForm();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDraft}
                disabled={!subject.trim() || !body.trim() || createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Saving..." : "Save as Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="space-y-4">
        {messagesQuery.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        )}

        {messagesQuery.data?.items.length === 0 && !showCompose && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">No messages yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Compose a message to communicate with campaign participants.
            </p>
          </div>
        )}

        {messagesQuery.data?.items.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            isSelected={selectedMessageId === message.id}
            onSelect={() =>
              setSelectedMessageId(selectedMessageId === message.id ? null : message.id)
            }
            onSend={() => handleSend(message.id)}
            onDelete={() => handleDelete(message.id)}
            isSending={sendMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface MessageCardProps {
  message: {
    id: string;
    subject: string;
    body: string;
    segment: string;
    status: string;
    sentAt: string | null;
    recipientCount: number;
    deliveredCount: number;
    failedCount: number;
    postToFeed: boolean;
    sendEmail: boolean;
    createdAt: string;
    sentBy?: { id: string; name: string | null; email: string; image: string | null };
  };
  isSelected: boolean;
  onSelect: () => void;
  onSend: () => void;
  onDelete: () => void;
  isSending: boolean;
  isDeleting: boolean;
}

function MessageCard({
  message,
  isSelected,
  onSelect,
  onSend,
  onDelete,
  isSending,
  isDeleting,
}: MessageCardProps) {
  const statusColors: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-800",
    SENT: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        role="button"
        tabIndex={0}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h4 className="truncate text-sm font-medium text-gray-900">{message.subject}</h4>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[message.status] ?? "bg-gray-100 text-gray-800"}`}
            >
              {message.status}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
            <span>
              <Users className="mr-1 inline h-3 w-3" />
              {SEGMENT_LABELS[message.segment] ?? message.segment}
            </span>
            {message.sentBy?.name && <span>by {message.sentBy.name}</span>}
            <span>
              {message.sentAt
                ? new Date(message.sentAt).toLocaleDateString()
                : new Date(message.createdAt).toLocaleDateString()}
            </span>
            {message.status === "SENT" && (
              <span>
                {message.deliveredCount}/{message.recipientCount} delivered
              </span>
            )}
          </div>
        </div>

        <div className="ml-4 flex items-center gap-2">
          {message.status === "DRAFT" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSend();
                }}
                disabled={isSending}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {isSending ? "Sending..." : "Send"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Eye className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isSelected && (
        <div className="border-t border-gray-100 p-4">
          <div className="prose prose-sm max-w-none text-gray-700">
            <div dangerouslySetInnerHTML={{ __html: message.body }} />
          </div>
          {message.status === "SENT" && (
            <div className="mt-4 flex gap-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <span>Recipients: {message.recipientCount}</span>
              <span>Delivered: {message.deliveredCount}</span>
              {message.failedCount > 0 && (
                <span className="text-red-600">Failed: {message.failedCount}</span>
              )}
              <span>Email: {message.sendEmail ? "Yes" : "No"}</span>
              <span>Feed: {message.postToFeed ? "Yes" : "No"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
