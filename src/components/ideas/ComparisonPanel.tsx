"use client";

import * as React from "react";
import { X, Heart, MessageCircle, Eye, Tag, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";

interface ComparisonPanelProps {
  ideaId: string;
  onClose: () => void;
}

export function ComparisonPanel({ ideaId, onClose }: ComparisonPanelProps) {
  const ideaQuery = trpc.idea.getById.useQuery({ id: ideaId }, { enabled: !!ideaId });

  if (ideaQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (ideaQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-red-600">Failed to load idea.</p>
      </div>
    );
  }

  if (!ideaQuery.data) return null;

  const idea = ideaQuery.data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="truncate font-display text-sm font-semibold text-gray-900">{idea.title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 shrink-0 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={idea.status} />
            {idea.category && (
              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {idea.category}
              </span>
            )}
          </div>

          {idea.teaser && <p className="text-sm text-gray-600">{idea.teaser}</p>}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {idea.contributor && (
              <div className="flex items-center gap-1.5">
                <ContributorAvatar image={idea.contributor.image} name={idea.contributor.name} />
                <span>{idea.contributor.name ?? idea.contributor.email}</span>
              </div>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(idea.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {idea.likesCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {idea.commentsCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {idea.viewsCount}
            </span>
          </div>

          {idea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {idea.description && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <h4 className="mb-2 text-xs font-medium text-gray-700">Description</h4>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-xs text-gray-600">
                {idea.description}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <CompactMetric label="Status" value={idea.status.replace(/_/g, " ")} />
            <CompactMetric
              label="Submitted"
              value={
                idea.submittedAt ? new Date(idea.submittedAt).toLocaleDateString() : "Not submitted"
              }
            />
            <CompactMetric label="Confidential" value={idea.isConfidential ? "Yes" : "No"} />
            <CompactMetric
              label="Invention Disclosure"
              value={idea.inventionDisclosure ? "Yes" : "No"}
            />
          </div>

          {idea.coAuthors && idea.coAuthors.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-gray-700">Co-Authors</h4>
              <div className="flex flex-wrap gap-2">
                {idea.coAuthors.map((coAuthor) => (
                  <div key={coAuthor.id} className="flex items-center gap-1.5">
                    <ContributorAvatar image={coAuthor.image} name={coAuthor.name} />
                    <span className="text-xs text-gray-600">{coAuthor.name ?? coAuthor.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContributorAvatar({ image, name }: { image: string | null; name: string | null }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Avatar className="h-5 w-5">
      {image ? (
        <AvatarImage src={image} alt={name ?? "User"} />
      ) : (
        <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-2">
      <p className="text-[10px] font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-xs font-semibold capitalize text-gray-900">{value.toLowerCase()}</p>
    </div>
  );
}
