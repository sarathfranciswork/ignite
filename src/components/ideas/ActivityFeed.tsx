"use client";

import * as React from "react";
import {
  Send,
  ArrowRightLeft,
  MessageCircle,
  Heart,
  Star,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Archive,
  RotateCcw,
  Flame,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  ideaId: string;
}

const EVENT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  IDEA_SUBMITTED: {
    icon: <Send className="h-3.5 w-3.5" />,
    color: "bg-blue-100 text-blue-600",
  },
  IDEA_TRANSITIONED: {
    icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
    color: "bg-purple-100 text-purple-600",
  },
  IDEA_STATUS_CHANGED: {
    icon: <Flame className="h-3.5 w-3.5" />,
    color: "bg-orange-100 text-orange-600",
  },
  IDEA_ARCHIVED: {
    icon: <Archive className="h-3.5 w-3.5" />,
    color: "bg-gray-100 text-gray-600",
  },
  IDEA_UNARCHIVED: {
    icon: <RotateCcw className="h-3.5 w-3.5" />,
    color: "bg-green-100 text-green-600",
  },
  COMMENT_CREATED: {
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    color: "bg-sky-100 text-sky-600",
  },
  IDEA_LIKED: {
    icon: <Heart className="h-3.5 w-3.5" />,
    color: "bg-pink-100 text-pink-600",
  },
  IDEA_VOTED: {
    icon: <Star className="h-3.5 w-3.5" />,
    color: "bg-amber-100 text-amber-600",
  },
  IDEA_FOLLOWED: {
    icon: <Bell className="h-3.5 w-3.5" />,
    color: "bg-indigo-100 text-indigo-600",
  },
  IDEA_COACH_QUALIFIED: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "bg-green-100 text-green-600",
  },
  IDEA_COACH_REJECTED: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-red-100 text-red-600",
  },
  IDEA_COACH_REQUESTED_CHANGES: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "bg-yellow-100 text-yellow-600",
  },
};

const DEFAULT_CONFIG = {
  icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
  color: "bg-gray-100 text-gray-600",
};

export function ActivityFeed({ ideaId }: ActivityFeedProps) {
  const [allItems, setAllItems] = React.useState<
    Array<{
      id: string;
      eventType: string;
      title: string;
      body: string | null;
      createdAt: string;
      actor?: { id: string; name: string | null; email: string; image: string | null } | null;
    }>
  >([]);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = React.useState(true);

  const activityQuery = trpc.activity.listByIdea.useQuery(
    { ideaId, limit: 20, cursor },
    { enabled: !!ideaId },
  );

  React.useEffect(() => {
    if (activityQuery.data) {
      setAllItems((prev) => {
        if (!cursor) return activityQuery.data.items;
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = activityQuery.data.items.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
      setHasMore(!!activityQuery.data.nextCursor);
    }
  }, [activityQuery.data, cursor]);

  const loadMore = () => {
    if (activityQuery.data?.nextCursor) {
      setCursor(activityQuery.data.nextCursor);
    }
  };

  if (activityQuery.isLoading && !cursor) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-gray-900">Activity</h2>
        <p className="mt-2 text-sm text-gray-500">No activity yet for this idea.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="font-display text-lg font-semibold text-gray-900">Activity</h2>

      <div className="mt-4 space-y-0">
        {allItems.map((event, index) => {
          const config = EVENT_TYPE_CONFIG[event.eventType] ?? DEFAULT_CONFIG;
          const isLast = index === allItems.length - 1;

          return (
            <div key={event.id} className="relative flex gap-3 pb-4">
              {!isLast && (
                <div className="absolute left-4 top-8 h-[calc(100%-16px)] w-px bg-gray-200" />
              )}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}
              >
                {config.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{event.title}</span>
                  {event.actor && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      by
                      <Avatar className="h-4 w-4">
                        {event.actor.image ? (
                          <AvatarImage src={event.actor.image} alt={event.actor.name ?? "User"} />
                        ) : (
                          <AvatarFallback className="text-[8px]">
                            {(event.actor.name ?? "?")[0]?.toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {event.actor.name ?? event.actor.email}
                    </span>
                  )}
                </div>
                {event.body && <p className="mt-0.5 text-sm text-gray-500">{event.body}</p>}
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-2 text-center">
          <Button variant="ghost" size="sm" onClick={loadMore} disabled={activityQuery.isFetching}>
            {activityQuery.isFetching ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
