"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Megaphone, Lightbulb, FileText, Handshake, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function NewCampaignPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [teaser, setTeaser] = React.useState("");
  const [submissionType, setSubmissionType] = React.useState<
    "CALL_FOR_IDEAS" | "CALL_FOR_PROPOSALS" | "CALL_FOR_GENERIC" | "PARTNERSHIP_PROPOSALS"
  >("CALL_FOR_IDEAS");
  const [submissionCloseDate, setSubmissionCloseDate] = React.useState("");
  const [plannedCloseDate, setPlannedCloseDate] = React.useState("");

  const createMutation = trpc.campaign.create.useMutation();
  const handleSuccess = React.useCallback(
    (id: string) => {
      router.push(`/campaigns/${id}`);
    },
    [router],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        teaser: teaser.trim() || undefined,
        submissionType,
        submissionCloseDate: submissionCloseDate
          ? new Date(submissionCloseDate).toISOString()
          : undefined,
        plannedCloseDate: plannedCloseDate ? new Date(plannedCloseDate).toISOString() : undefined,
      },
      {
        onSuccess: (data) => {
          handleSuccess(data.id);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Megaphone className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <CardTitle>Create Campaign</CardTitle>
              <CardDescription>
                Set up a new innovation campaign with the simple setup wizard.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>Campaign Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: "CALL_FOR_IDEAS" as const,
                    label: "Call for Ideas",
                    description: "Collect ideas with full discussion & voting workflow",
                    icon: Lightbulb,
                  },
                  {
                    value: "CALL_FOR_PROPOSALS" as const,
                    label: "Call for Proposals",
                    description: "Collect detailed proposals with evaluation",
                    icon: FileText,
                  },
                  {
                    value: "PARTNERSHIP_PROPOSALS" as const,
                    label: "Partnership Proposals",
                    description: "Simplified workflow for partner proposals (no discussion/voting)",
                    icon: Handshake,
                  },
                  {
                    value: "CALL_FOR_GENERIC" as const,
                    label: "Generic",
                    description: "Flexible campaign with customizable workflow",
                    icon: Package,
                  },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = submissionType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSubmissionType(type.value)}
                      className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                        isSelected
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 h-5 w-5 shrink-0 ${isSelected ? "text-primary-600" : "text-gray-400"}`}
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${isSelected ? "text-primary-700" : "text-gray-900"}`}
                        >
                          {type.label}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Campaign Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Innovation Challenge 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teaser">Teaser</Label>
              <Input
                id="teaser"
                placeholder="Short description shown on campaign cards"
                value={teaser}
                onChange={(e) => setTeaser(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the campaign..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="submissionCloseDate">Submission Close Date</Label>
                <Input
                  id="submissionCloseDate"
                  type="date"
                  value={submissionCloseDate}
                  onChange={(e) => setSubmissionCloseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedCloseDate">Planned Close Date</Label>
                <Input
                  id="plannedCloseDate"
                  type="date"
                  value={plannedCloseDate}
                  onChange={(e) => setPlannedCloseDate(e.target.value)}
                />
              </div>
            </div>

            {createMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {createMutation.error.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Link href="/campaigns">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
