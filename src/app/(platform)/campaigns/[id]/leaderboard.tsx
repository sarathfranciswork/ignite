"use client";

import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardUser {
  id: string;
  rank: number;
  totalScore: number;
  ideasCount: number;
  commentsCount: number;
  likesCount: number;
  evaluationsCount: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface LeaderboardProps {
  items: LeaderboardUser[];
  campaignId: string;
  showLeaderboard: boolean;
  isLoading?: boolean;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" aria-label="First place" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" aria-label="Second place" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" aria-label="Third place" />;
  return <span className="text-sm font-medium text-gray-500">#{rank}</span>;
}

function getRankBgClass(rank: number): string {
  if (rank === 1) return "bg-yellow-50 border-yellow-200";
  if (rank === 2) return "bg-gray-50 border-gray-200";
  if (rank === 3) return "bg-amber-50 border-amber-200";
  return "bg-white border-gray-100";
}

export function Leaderboard({ items, showLeaderboard, isLoading }: LeaderboardProps) {
  if (!showLeaderboard) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">Leaderboard is hidden for this campaign.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <Trophy className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          No scores yet. Start contributing to appear on the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
      <div className="space-y-2">
        {items.map((entry) => (
          <div
            key={entry.user.id}
            className={cn(
              "flex items-center gap-4 rounded-lg border p-3 transition-shadow hover:shadow-sm",
              getRankBgClass(entry.rank),
            )}
          >
            <div className="flex w-10 items-center justify-center">{getRankIcon(entry.rank)}</div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
              {entry.user.name?.charAt(0)?.toUpperCase() ??
                entry.user.email.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {entry.user.name ?? entry.user.email}
              </p>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{entry.ideasCount} ideas</span>
                <span>{entry.commentsCount} comments</span>
                <span>{entry.likesCount} likes</span>
                <span>{entry.evaluationsCount} evals</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{entry.totalScore}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
