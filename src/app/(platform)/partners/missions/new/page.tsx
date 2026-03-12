"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function NewScoutingMissionPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [problemStatement, setProblemStatement] = React.useState("");
  const [targetIndustries, setTargetIndustries] = React.useState("");
  const [targetRegions, setTargetRegions] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [requirements, setRequirements] = React.useState<
    { label: string; description: string; priority: "MUST_HAVE" | "NICE_TO_HAVE" }[]
  >([]);

  const createMutation = trpc.scoutingMission.create.useMutation({
    onSuccess: (data) => {
      router.push(`/partners/missions/${data.id}`);
    },
  });

  function addRequirement() {
    setRequirements((prev) => [
      ...prev,
      { label: "", description: "", priority: "MUST_HAVE" as const },
    ]);
  }

  function removeRequirement(index: number) {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRequirement(
    index: number,
    field: "label" | "description" | "priority",
    value: string,
  ) {
    setRequirements((prev) =>
      prev.map((req, i) => (i === index ? { ...req, [field]: value } : req)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const industries = targetIndustries
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const regions = targetRegions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const validRequirements = requirements.filter((r) => r.label.trim());

    createMutation.mutate({
      title,
      problemStatement,
      targetIndustries: industries,
      targetRegions: regions,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      requirements: validRequirements.length > 0 ? validRequirements : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/partners/missions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">New Scouting Mission</h1>
          <p className="mt-1 text-sm text-gray-500">
            Define a structured request for finding partners.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Find AI Vision Partners for Manufacturing QA"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problemStatement">Problem Statement</Label>
              <Textarea
                id="problemStatement"
                placeholder="Describe the problem you're trying to solve and what kind of partner you're looking for..."
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                required
                rows={5}
                maxLength={10000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetIndustries">Target Industries (comma-separated)</Label>
              <Input
                id="targetIndustries"
                placeholder="e.g., AI/ML, Computer Vision, Manufacturing"
                value={targetIndustries}
                onChange={(e) => setTargetIndustries(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetRegions">Target Regions (comma-separated)</Label>
              <Input
                id="targetRegions"
                placeholder="e.g., Europe, North America, APAC"
                value={targetRegions}
                onChange={(e) => setTargetRegions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Requirements</span>
              <Button type="button" variant="outline" size="sm" onClick={addRequirement}>
                Add Requirement
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requirements.length === 0 && (
              <p className="text-sm text-gray-500">
                No requirements added yet. Add structured criteria for partner matching.
              </p>
            )}
            {requirements.map((req, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Requirement label"
                      value={req.label}
                      onChange={(e) => updateRequirement(index, "label", e.target.value)}
                      maxLength={200}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={req.description}
                      onChange={(e) => updateRequirement(index, "description", e.target.value)}
                      rows={2}
                      maxLength={2000}
                    />
                    <select
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                      value={req.priority}
                      onChange={(e) => updateRequirement(index, "priority", e.target.value)}
                    >
                      <option value="MUST_HAVE">Must Have</option>
                      <option value="NICE_TO_HAVE">Nice to Have</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRequirement(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/partners/missions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={!title.trim() || !problemStatement.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Mission"}
          </Button>
        </div>

        {createMutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{createMutation.error.message}</p>
          </div>
        )}
      </form>
    </div>
  );
}
