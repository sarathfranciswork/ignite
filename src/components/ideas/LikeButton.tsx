"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  ideaId: string;
  initialLikesCount: number;
}

export function LikeButton({ ideaId, initialLikesCount }: LikeButtonProps) {
  const utils = trpc.useUtils();

  const likeStatusQuery = trpc.engagement.getLikeStatus.useQuery({ ideaId });
  const liked = likeStatusQuery.data?.liked ?? false;

  const [optimisticLiked, setOptimisticLiked] = React.useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = React.useState<number | null>(null);

  const displayLiked = optimisticLiked ?? liked;
  const displayCount = optimisticCount ?? initialLikesCount;

  const toggleMutation = trpc.engagement.toggleLike.useMutation({
    onMutate: () => {
      const newLiked = !displayLiked;
      setOptimisticLiked(newLiked);
      setOptimisticCount(displayCount + (newLiked ? 1 : -1));
    },
    onSuccess: (data) => {
      setOptimisticLiked(null);
      setOptimisticCount(data.likesCount);
      void utils.engagement.getLikeStatus.invalidate({ ideaId });
      void utils.idea.getById.invalidate({ id: ideaId });
    },
    onError: () => {
      setOptimisticLiked(null);
      setOptimisticCount(null);
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5 text-gray-500 hover:text-red-500", displayLiked && "text-red-500")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMutation.mutate({ ideaId });
      }}
      disabled={toggleMutation.isPending || likeStatusQuery.isLoading}
    >
      <Heart className={cn("h-4 w-4", displayLiked && "fill-current")} />
      <span className="text-xs">{displayCount}</span>
    </Button>
  );
}
