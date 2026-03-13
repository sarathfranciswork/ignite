"use client";

import * as React from "react";
import { Bell, Pencil, RotateCcw, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { sanitizeHtml } from "@/lib/sanitize";
import { trpc } from "@/lib/trpc";
import { TEMPLATE_VARIABLES } from "@/server/services/notification-template.schemas";

type NotificationType =
  | "IDEA_SUBMITTED"
  | "EVALUATION_REQUESTED"
  | "STATUS_CHANGE"
  | "HOT_GRADUATION"
  | "CAMPAIGN_PHASE_CHANGE"
  | "COMMENT_ON_FOLLOWED"
  | "MENTION";

const TYPE_LABELS: Record<NotificationType, string> = {
  IDEA_SUBMITTED: "Idea Submitted",
  EVALUATION_REQUESTED: "Evaluation Requested",
  STATUS_CHANGE: "Status Change",
  HOT_GRADUATION: "HOT Graduation",
  CAMPAIGN_PHASE_CHANGE: "Campaign Phase Change",
  COMMENT_ON_FOLLOWED: "Comment on Followed",
  MENTION: "Mention",
};

export default function NotificationTemplatesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.notificationTemplateList.useQuery();

  const upsertMutation = trpc.admin.notificationTemplateUpsert.useMutation({
    onSuccess: () => {
      void utils.admin.notificationTemplateList.invalidate();
      setEditOpen(false);
    },
  });

  const toggleMutation = trpc.admin.notificationTemplateToggle.useMutation({
    onSuccess: () => {
      void utils.admin.notificationTemplateList.invalidate();
    },
  });

  const resetMutation = trpc.admin.notificationTemplateReset.useMutation({
    onSuccess: () => {
      void utils.admin.notificationTemplateList.invalidate();
    },
  });

  const [editOpen, setEditOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewContent, setPreviewContent] = React.useState<{
    subject?: string;
    body?: string;
    title?: string;
  } | null>(null);
  const [editForm, setEditForm] = React.useState({
    type: "IDEA_SUBMITTED" as NotificationType,
    emailSubject: "",
    emailBody: "",
    inAppTitle: "",
    inAppBody: "",
    isActive: true,
  });

  function openEdit(template: {
    type: string;
    emailSubject: string;
    emailBody: string;
    inAppTitle: string;
    inAppBody: string;
    isActive: boolean;
  }) {
    setEditForm({
      type: template.type as NotificationType,
      emailSubject: template.emailSubject,
      emailBody: template.emailBody,
      inAppTitle: template.inAppTitle,
      inAppBody: template.inAppBody,
      isActive: template.isActive,
    });
    setEditOpen(true);
  }

  function handleSave() {
    upsertMutation.mutate(editForm);
  }

  function handleToggle(type: NotificationType, isActive: boolean) {
    toggleMutation.mutate({ type, isActive });
  }

  function handleReset(type: NotificationType) {
    resetMutation.mutate({ type });
  }

  function handlePreview(template: {
    type: string;
    emailSubject: string;
    emailBody: string;
    inAppTitle: string;
    inAppBody: string;
  }) {
    const variables = TEMPLATE_VARIABLES[template.type] ?? [];
    const sampleData: Record<string, string> = {};
    for (const v of variables) {
      sampleData[v] = `[${v}]`;
    }

    const subject = template.emailSubject.replace(
      /\{\{(\w+)\}\}/g,
      (m, k: string) => sampleData[k] ?? m,
    );
    const body = template.emailBody.replace(/\{\{(\w+)\}\}/g, (m, k: string) => sampleData[k] ?? m);
    const title = template.inAppTitle.replace(
      /\{\{(\w+)\}\}/g,
      (m, k: string) => sampleData[k] ?? m,
    );

    setPreviewContent({ subject, body, title });
    setPreviewOpen(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  const templates = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <Bell className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">Notification Templates</h1>
          <p className="text-sm text-gray-500">
            Edit notification templates with variable placeholders for email and in-app
            notifications
          </p>
        </div>
      </div>

      {/* Variable Help */}
      <Card className="border-blue-100 bg-blue-50/50 p-4">
        <p className="text-sm text-blue-700">
          Templates support <code className="rounded bg-blue-100 px-1">{"{{variable}}"}</code>{" "}
          placeholders that are automatically replaced when notifications are sent. Available
          variables are shown for each notification type.
        </p>
      </Card>

      {/* Template List */}
      <div className="space-y-3">
        {templates.map((template) => {
          const type = template.type as NotificationType;
          const variables = TEMPLATE_VARIABLES[type] ?? [];

          return (
            <Card key={type} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{TYPE_LABELS[type] ?? type}</span>
                    {template.isCustomized && <Badge variant="default">Customized</Badge>}
                    {!template.isActive && <Badge variant="secondary">Disabled</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Subject: {template.emailSubject}</p>
                  {variables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {variables.map((v) => (
                        <span
                          key={v}
                          className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(template)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(type, !template.isActive)}
                    title={template.isActive ? "Disable" : "Enable"}
                  >
                    {template.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                  {template.isCustomized && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(type)}
                      title="Reset to default"
                    >
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClose={() => setEditOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template: {TYPE_LABELS[editForm.type] ?? editForm.type}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {/* Available Variables */}
            <div>
              <Label>Available Variables</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {(TEMPLATE_VARIABLES[editForm.type] ?? []).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${v}}}`).catch(() => {});
                    }}
                    className="inline-block cursor-pointer rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                    title={`Click to copy {{${v}}}`}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Template */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Email Template</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-email-subject">Subject</Label>
                  <Input
                    id="edit-email-subject"
                    value={editForm.emailSubject}
                    onChange={(e) => setEditForm((f) => ({ ...f, emailSubject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email-body">Body (HTML)</Label>
                  <textarea
                    id="edit-email-body"
                    value={editForm.emailBody}
                    onChange={(e) => setEditForm((f) => ({ ...f, emailBody: e.target.value }))}
                    rows={5}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* In-App Template */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">In-App Template</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-inapp-title">Title</Label>
                  <Input
                    id="edit-inapp-title"
                    value={editForm.inAppTitle}
                    onChange={(e) => setEditForm((f) => ({ ...f, inAppTitle: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-inapp-body">Body</Label>
                  <textarea
                    id="edit-inapp-body"
                    value={editForm.inAppBody}
                    onChange={(e) => setEditForm((f) => ({ ...f, inAppBody: e.target.value }))}
                    rows={3}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent onClose={() => setPreviewOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewContent && (
            <div className="mt-4 space-y-4">
              {previewContent.subject && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Email Preview</h3>
                  <p className="text-sm font-medium text-gray-900">
                    Subject: {previewContent.subject}
                  </p>
                  <div
                    className="mt-2 rounded border border-gray-100 bg-gray-50 p-3 text-sm"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(previewContent.body ?? ""),
                    }}
                  />
                </div>
              )}
              {previewContent.title && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">In-App Preview</h3>
                  <p className="text-sm font-medium text-gray-900">{previewContent.title}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
