"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Building2, Users, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UseCaseStatusBadge } from "./UseCaseStatusBadge";
import { TaskBoard } from "./TaskBoard";
import { trpc } from "@/lib/trpc";

interface UseCaseDetailProps {
  id: string;
}

export function UseCaseDetail({ id }: UseCaseDetailProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const useCaseQuery = trpc.useCase.getById.useQuery({ id });
  const transitionsQuery = trpc.useCase.getTransitions.useQuery({ id });
  const organizationsQuery = trpc.organization.list.useQuery({ limit: 50 });

  const [linkOrgSearch, setLinkOrgSearch] = React.useState("");
  const [showLinkOrg, setShowLinkOrg] = React.useState(false);

  const transitionMutation = trpc.useCase.transition.useMutation({
    onSuccess: () => {
      void utils.useCase.getById.invalidate({ id });
      void utils.useCase.getTransitions.invalidate({ id });
      void utils.useCase.list.invalidate();
      void utils.useCase.funnel.invalidate();
    },
  });

  const deleteMutation = trpc.useCase.delete.useMutation({
    onSuccess: () => {
      void utils.useCase.list.invalidate();
      router.push("/partners/use-cases");
    },
  });

  const linkOrgMutation = trpc.useCase.linkOrganization.useMutation({
    onSuccess: () => {
      void utils.useCase.getById.invalidate({ id });
      setShowLinkOrg(false);
      setLinkOrgSearch("");
    },
  });

  const unlinkOrgMutation = trpc.useCase.unlinkOrganization.useMutation({
    onSuccess: () => {
      void utils.useCase.getById.invalidate({ id });
    },
  });

  function handleDelete() {
    if (window.confirm("Are you sure you want to delete this use case? This cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  }

  function handleTransition(
    targetStatus:
      | "IDENTIFIED"
      | "QUALIFICATION"
      | "EVALUATION"
      | "PILOT"
      | "PARTNERSHIP"
      | "ARCHIVED",
  ) {
    transitionMutation.mutate({ id, targetStatus });
  }

  if (useCaseQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (useCaseQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">
            {useCaseQuery.error.message ?? "Failed to load use case."}
          </p>
          <Link href="/partners/use-cases" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Back to Use Cases
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const uc = useCaseQuery.data;
  if (!uc) return null;

  const linkedOrgIds = new Set(uc.organizations.map((o) => o.organization.id));
  const availableOrgs = (organizationsQuery.data?.items ?? []).filter(
    (org) =>
      !linkedOrgIds.has(org.id) &&
      (linkOrgSearch ? org.name.toLowerCase().includes(linkOrgSearch.toLowerCase()) : true),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/partners/use-cases">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">{uc.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <UseCaseStatusBadge status={uc.status} />
              <span className="text-sm text-gray-500">
                Owner: {uc.owner.name ?? uc.owner.email}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/partners/use-cases/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Pipeline Transitions */}
      {transitionsQuery.data && transitionsQuery.data.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Move to:</span>
              {transitionsQuery.data.map((t) => (
                <Button
                  key={t.status}
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleTransition(
                      t.status as
                        | "IDENTIFIED"
                        | "QUALIFICATION"
                        | "EVALUATION"
                        | "PILOT"
                        | "PARTNERSHIP"
                        | "ARCHIVED",
                    )
                  }
                  disabled={transitionMutation.isPending}
                >
                  <ChevronRight className="mr-1 h-3 w-3" />
                  {t.label}
                </Button>
              ))}
            </div>
            {transitionMutation.isError && (
              <p className="mt-2 text-sm text-red-600">{transitionMutation.error.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {uc.problemDescription && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Problem Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                {uc.problemDescription}
              </dd>
            </div>
          )}
          {uc.suggestedSolution && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Suggested Solution</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                {uc.suggestedSolution}
              </dd>
            </div>
          )}
          {uc.benefit && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Expected Benefit</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{uc.benefit}</dd>
            </div>
          )}
          <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 sm:col-span-2">
            Created on {new Date(uc.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Organizations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary-600" />
              Linked Organizations ({uc.organizations.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowLinkOrg(!showLinkOrg)}>
              <Plus className="mr-1 h-3 w-3" />
              Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showLinkOrg && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <Input
                value={linkOrgSearch}
                onChange={(e) => setLinkOrgSearch(e.target.value)}
                placeholder="Search organizations..."
                className="mb-2 h-8 text-sm"
                autoFocus
              />
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {availableOrgs.slice(0, 10).map((org) => (
                  <button
                    key={org.id}
                    onClick={() =>
                      linkOrgMutation.mutate({ useCaseId: id, organizationId: org.id })
                    }
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                    disabled={linkOrgMutation.isPending}
                  >
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{org.name}</span>
                    {org.industry && (
                      <span className="text-xs text-gray-400">({org.industry})</span>
                    )}
                  </button>
                ))}
                {availableOrgs.length === 0 && (
                  <p className="py-2 text-center text-xs text-gray-400">
                    No organizations available
                  </p>
                )}
              </div>
            </div>
          )}

          {uc.organizations.length === 0 && !showLinkOrg && (
            <p className="text-sm text-gray-500">No organizations linked yet.</p>
          )}

          <div className="space-y-2">
            {uc.organizations.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <Link
                  href={`/partners/${o.organization.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {o.organization.name}
                  {o.organization.industry && (
                    <span className="text-xs text-gray-400">({o.organization.industry})</span>
                  )}
                </Link>
                <button
                  onClick={() =>
                    unlinkOrgMutation.mutate({
                      useCaseId: id,
                      organizationId: o.organization.id,
                    })
                  }
                  className="rounded p-1 text-gray-300 hover:text-red-500"
                  disabled={unlinkOrgMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary-600" />
            Team ({uc.teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uc.teamMembers.length === 0 && (
            <p className="text-sm text-gray-500">No team members assigned yet.</p>
          )}
          <div className="space-y-2">
            {uc.teamMembers.map((tm) => (
              <div
                key={tm.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-medium text-primary-700">
                    {(tm.user.name ?? tm.user.email)?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {tm.user.name ?? tm.user.email}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    {tm.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Board */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Board</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskBoard useCaseId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
