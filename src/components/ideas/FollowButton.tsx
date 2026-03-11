"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  ideaId: string;
}

export function FollowButton({ ideaId }: FollowButtonProps) {
  const utils = trpc.useUtils();

  const followStatusQuery = trpc.engagement.getFollowStatus.useQuery({ ideaId });
  const following = followStatusQuery.data?.following ?? false;

  const toggleMutation = trpc.engagement.toggleFollow.useMutation({
    onSuccess: () => {
      void utils.engagement.getFollowStatus.invalidate({ ideaId });
    },
  });

  const Icon = following ? BellOff : Bell;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-1.5", following && "border-primary-200 bg-primary-50 text-primary-700")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMutation.mutate({ ideaId });
      }}
      disabled={toggleMutation.isPending || followStatusQuery.isLoading}
    >
      <Icon className="h-3.5 w-3.5" />
      {following ? "Following" : "Follow"}
    </Button>
  );
}
