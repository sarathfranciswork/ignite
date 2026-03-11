"use client";

import { Flame, Users, MessageCircle, Heart, Star, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface GraduationProgressProps {
  ideaId: string;
}

interface ThresholdBarProps {
  label: string;
  current: number;
  target: number;
  met: boolean;
  icon: React.ReactNode;
}

function ThresholdBar({ label, current, target, met, icon }: ThresholdBarProps) {
  if (target === 0) return null;

  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          {icon}
          <span>{label}</span>
        </div>
        <span className={met ? "font-medium text-green-600" : "text-gray-500"}>
          {current} / {target}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            met ? "bg-green-500" : "bg-amber-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function GraduationProgress({ ideaId }: GraduationProgressProps) {
  const progressQuery = trpc.activity.graduationProgress.useQuery(
    { ideaId },
    { enabled: !!ideaId },
  );

  if (progressQuery.isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (progressQuery.isError || !progressQuery.data) return null;

  const progress = progressQuery.data;

  if (!progress.eligible) return null;

  const thresholds = progress.thresholds;
  const allMet = Object.values(thresholds).every((t) => t.target === 0 || t.met);
  const metCount = Object.values(thresholds).filter((t) => t.target === 0 || t.met).length;
  const activeCount = Object.values(thresholds).filter((t) => t.target > 0).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${allMet ? "text-orange-500" : "text-gray-400"}`} />
          <h2 className="font-display text-lg font-semibold text-gray-900">
            HOT Graduation Progress
          </h2>
        </div>
        {allMet ? (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
            All thresholds met!
          </span>
        ) : (
          <span className="text-sm text-gray-500">
            {metCount - (6 - activeCount)} of {activeCount} met
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <ThresholdBar
          label="Visitors"
          current={thresholds.visitors.current}
          target={thresholds.visitors.target}
          met={thresholds.visitors.met}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <ThresholdBar
          label="Commenters"
          current={thresholds.commenters.current}
          target={thresholds.commenters.target}
          met={thresholds.commenters.met}
          icon={<MessageCircle className="h-3.5 w-3.5" />}
        />
        <ThresholdBar
          label="Likes"
          current={thresholds.likes.current}
          target={thresholds.likes.target}
          met={thresholds.likes.met}
          icon={<Heart className="h-3.5 w-3.5" />}
        />
        <ThresholdBar
          label="Voters"
          current={thresholds.voters.current}
          target={thresholds.voters.target}
          met={thresholds.voters.met}
          icon={<Star className="h-3.5 w-3.5" />}
        />
        <ThresholdBar
          label="Avg. Vote Score"
          current={Math.round(thresholds.votingLevel.current * 10) / 10}
          target={thresholds.votingLevel.target}
          met={thresholds.votingLevel.met}
          icon={<Star className="h-3.5 w-3.5" />}
        />
        <ThresholdBar
          label="Days in Discussion"
          current={thresholds.daysInStatus.current}
          target={thresholds.daysInStatus.target}
          met={thresholds.daysInStatus.met}
          icon={<Clock className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
}
