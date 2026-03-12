"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lightbulb, Megaphone, Heart, MessageCircle, Eye, Calendar, FileText } from "lucide-react";

interface ProjectSourceSectionProps {
  projectId: string;
}

export function ProjectSourceSection({ projectId }: ProjectSourceSectionProps) {
  const sourceQuery = trpc.project.sourceDetails.useQuery({ id: projectId });

  if (sourceQuery.isLoading) {
    return (
      <Card className="p-5">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 h-24 animate-pulse rounded bg-gray-50" />
      </Card>
    );
  }

  if (sourceQuery.isError || !sourceQuery.data) {
    return null;
  }

  const { sourceIdea, sourceConcept } = sourceQuery.data;

  if (!sourceIdea && !sourceConcept) {
    return null;
  }

  const authorInitials = sourceIdea?.author.name
    ? sourceIdea.author.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <h2 className="font-display text-lg font-semibold text-gray-900">Source</h2>
      </div>

      {sourceIdea && (
        <div className="mt-4 space-y-3">
          <Link
            href={`/ideas/${sourceIdea.id}`}
            className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{sourceIdea.title}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {sourceIdea.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  {sourceIdea.author.image ? (
                    <AvatarImage src={sourceIdea.author.image} alt={sourceIdea.author.name ?? ""} />
                  ) : (
                    <AvatarFallback className="text-[8px]">{authorInitials}</AvatarFallback>
                  )}
                </Avatar>
                <span>{sourceIdea.author.name ?? sourceIdea.author.email}</span>
              </div>

              {sourceIdea.campaign && (
                <span className="flex items-center gap-1">
                  <Megaphone className="h-3.5 w-3.5" />
                  {sourceIdea.campaign.title}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {sourceIdea.likesCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {sourceIdea.commentsCount}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {sourceIdea.viewsCount}
              </span>
              {sourceIdea.submittedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(sourceIdea.submittedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </Link>
        </div>
      )}

      {sourceConcept && (
        <div className="mt-3">
          <Link
            href={`/projects/concepts/${sourceConcept.id}`}
            className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 transition-colors hover:border-amber-300 hover:bg-amber-50/50"
          >
            <FileText className="h-4 w-4 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700">{sourceConcept.title}</p>
              <p className="text-xs text-gray-500">Concept</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {sourceConcept.status.replace(/_/g, " ")}
            </Badge>
          </Link>
        </div>
      )}
    </Card>
  );
}
