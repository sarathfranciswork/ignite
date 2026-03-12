"use client";

import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  ideaId: string;
  campaignId: string;
  actorId: string;
  eventType: string;
  title: string;
  body: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface ActivityFeedWidgetProps {
  items: ActivityItem[];
  nextCursor: string | undefined;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function ActivityFeedWidget({ items }: ActivityFeedWidgetProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Activity className="h-4 w-4 text-primary-600" />
          Recent Activity
        </h3>
        <p className="mt-4 text-center text-sm text-gray-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Activity className="h-4 w-4 text-primary-600" />
        Recent Activity
      </h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
              {item.actor ? getInitials(item.actor.name, item.actor.email) : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">
                  {item.actor?.name ?? item.actor?.email ?? "Unknown"}
                </span>{" "}
                {item.title}
              </p>
              {item.body && <p className="mt-0.5 truncate text-xs text-gray-500">{item.body}</p>}
              <p className="mt-0.5 text-xs text-gray-400">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
