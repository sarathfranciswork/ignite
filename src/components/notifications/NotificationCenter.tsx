"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  ArrowRightLeft,
  AtSign,
  ClipboardCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const NOTIFICATION_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  IDEA_SUBMITTED: { icon: Lightbulb, label: "Idea Submitted" },
  EVALUATION_REQUESTED: { icon: ClipboardCheck, label: "Evaluation" },
  STATUS_CHANGE: { icon: ArrowRightLeft, label: "Status Change" },
  HOT_GRADUATION: { icon: TrendingUp, label: "HOT Graduation" },
  CAMPAIGN_PHASE_CHANGE: { icon: ArrowRightLeft, label: "Phase Change" },
  COMMENT_ON_FOLLOWED: { icon: MessageSquare, label: "Comment" },
  MENTION: { icon: AtSign, label: "Mention" },
};

type NotificationFilterType =
  | "IDEA_SUBMITTED"
  | "EVALUATION_REQUESTED"
  | "STATUS_CHANGE"
  | "HOT_GRADUATION"
  | "CAMPAIGN_PHASE_CHANGE"
  | "COMMENT_ON_FOLLOWED"
  | "MENTION";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type] ?? {
    icon: Bell,
    label: notification.type,
  };
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-gray-100 px-4 py-3 transition-colors last:border-b-0",
        notification.isRead ? "bg-white" : "bg-primary-50",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          notification.isRead ? "bg-gray-100 text-gray-500" : "bg-primary-100 text-primary-600",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              aria-label="Mark as read"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600">{notification.body}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {config.label}
          </Badge>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<NotificationFilterType | undefined>(
    undefined,
  );
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: unreadData } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.notification.list.useInfiniteQuery(
      { limit: 20, type: activeFilter },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: isOpen,
      },
    );

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      void utils.notification.list.invalidate();
      void utils.notification.unreadCount.invalidate();
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  const notifications = React.useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  React.useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  const filterOptions: { value: NotificationFilterType | undefined; label: string }[] = [
    { value: undefined, label: "All" },
    { value: "IDEA_SUBMITTED", label: "Ideas" },
    { value: "STATUS_CHANGE", label: "Status" },
    { value: "COMMENT_ON_FOLLOWED", label: "Comments" },
    { value: "MENTION", label: "Mentions" },
    { value: "CAMPAIGN_PHASE_CHANGE", label: "Campaigns" },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-4 py-2">
            {filterOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  activeFilter === option.value
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
                )}
                onClick={() => setActiveFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Bell className="mb-2 h-8 w-8" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => markAsReadMutation.mutate({ id })}
                  />
                ))}

                {hasNextPage && (
                  <div className="border-t border-gray-100 px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => void fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
