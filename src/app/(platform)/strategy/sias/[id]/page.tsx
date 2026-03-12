"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Briefcase, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { usePermission } from "@/hooks/usePermission";
import { Action } from "@/lib/permissions";

export default function SiaDetailPage() {
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const canUpdate = usePermission(Action.SIA_UPDATE);
  const canArchive = usePermission(Action.SIA_ARCHIVE);

  const siaQuery = trpc.sia.getById.useQuery({ id: params.id });

  const archiveMutation = trpc.sia.archive.useMutation({
    onSuccess: () => {
      void utils.sia.getById.invalidate({ id: params.id });
      void utils.sia.list.invalidate();
    },
  });

  if (siaQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (siaQuery.isError || !siaQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load SIA. Please try again.</p>
        <Link href="/strategy/sias" className="mt-4 inline-block">
          <Button variant="outline">Back to SIAs</Button>
        </Link>
      </div>
    );
  }

  const sia = siaQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/strategy/sias">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-gray-900">{sia.name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  sia.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {sia.isActive ? "Active" : "Archived"}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Created by {sia.createdBy.name ?? sia.createdBy.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canUpdate && sia.isActive && (
            <Link href={`/strategy/sias/${sia.id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {canArchive && sia.isActive && (
            <Button
              variant="outline"
              onClick={() => archiveMutation.mutate({ id: sia.id })}
              disabled={archiveMutation.isPending}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {archiveMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {archiveMutation.error.message}
        </div>
      )}

      {sia.imageUrl && (
        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-gray-100">
          <Image src={sia.imageUrl} alt={sia.name} fill className="object-cover" />
        </div>
      )}

      {sia.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {sia.description}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Linked Campaigns ({sia.campaignCount})
        </h2>
        {sia.campaigns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No campaigns linked yet. Link campaigns to track strategic alignment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sia.campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{campaign.title}</p>
                  {campaign.teaser && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{campaign.teaser}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    campaign.status === "DRAFT"
                      ? "bg-gray-100 text-gray-600"
                      : campaign.status === "CLOSED"
                        ? "bg-red-50 text-red-600"
                        : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {campaign.status.replace(/_/g, " ")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
