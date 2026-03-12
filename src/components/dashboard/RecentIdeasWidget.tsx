"use client";

import { Lightbulb, Heart, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface RecentIdea {
  id: string;
  title: string;
  status: string;
  campaignId: string;
  campaignTitle: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface RecentIdeasWidgetProps {
  ideas: RecentIdea[];
}

export function RecentIdeasWidget({ ideas }: RecentIdeasWidgetProps) {
  if (ideas.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Lightbulb className="h-4 w-4 text-primary-600" />
          My Recent Ideas
        </h3>
        <p className="mt-4 text-center text-sm text-gray-500">
          You haven&apos;t submitted any ideas yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Lightbulb className="h-4 w-4 text-primary-600" />
        My Recent Ideas
      </h3>
      <div className="mt-4 space-y-3">
        {ideas.map((idea) => (
          <Link
            key={idea.id}
            href={`/ideas/${idea.id}`}
            className="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                {idea.title}
              </p>
              <StatusBadge
                status={idea.status as Parameters<typeof StatusBadge>[0]["status"]}
                className="ml-2"
              />
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500">{idea.campaignTitle}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {idea.likesCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {idea.commentsCount}
              </span>
              <span>{formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
