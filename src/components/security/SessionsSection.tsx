"use client";

import { Smartphone, Monitor, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

export function SessionsSection() {
  const utils = trpc.useUtils();

  const { data: sessions, isLoading } = trpc.security.sessionList.useQuery();

  const terminateMutation = trpc.security.sessionTerminate.useMutation({
    onSuccess() {
      void utils.security.sessionList.invalidate();
    },
  });

  const terminateAllMutation = trpc.security.sessionTerminateAll.useMutation({
    onSuccess() {
      void utils.security.sessionList.invalidate();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Monitor className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active sessions across devices</CardDescription>
            </div>
          </div>
          {sessions && sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                if (sessions[0]) {
                  terminateAllMutation.mutate({ currentSessionId: sessions[0].id });
                }
              }}
              disabled={terminateAllMutation.isPending}
            >
              {terminateAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Terminate All Others
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {(!sessions || sessions.length === 0) && (
          <p className="text-sm text-gray-500">No active sessions found</p>
        )}
        <div className="divide-y">
          {sessions?.map((session, index) => (
            <div key={session.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {session.deviceInfo ?? "Unknown device"}
                    {index === 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.ipAddress ?? "Unknown IP"} &middot; Last active{" "}
                    {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {index > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => terminateMutation.mutate({ sessionId: session.id })}
                  disabled={terminateMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
