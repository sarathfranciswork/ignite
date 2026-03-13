"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Settings, RotateCcw, Trash2 } from "lucide-react";

function WeightInput({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default function GamificationConfigPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [isActive, setIsActive] = useState(false);
  const [ideaWeight, setIdeaWeight] = useState(5);
  const [commentWeight, setCommentWeight] = useState(3);
  const [likeWeight, setLikeWeight] = useState(1);
  const [evaluationWeight, setEvaluationWeight] = useState(4);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // tRPC mutation would be called here: trpc.gamification.configure.mutate(...)
    // For now, this is the form structure
    setTimeout(() => setIsSaving(false), 500);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Gamification Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Enable Gamification</p>
            <p className="text-xs text-gray-500">
              Track user scores and display leaderboard for this campaign
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? "bg-primary-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Score weights */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Scoring Weights</h2>
          <p className="text-xs text-gray-500">Points awarded for each type of contribution</p>
          <div className="grid grid-cols-2 gap-4">
            <WeightInput
              label="Idea Submission"
              value={ideaWeight}
              onChange={setIdeaWeight}
              description="Points per new idea"
            />
            <WeightInput
              label="Comment"
              value={commentWeight}
              onChange={setCommentWeight}
              description="Points per comment"
            />
            <WeightInput
              label="Like"
              value={likeWeight}
              onChange={setLikeWeight}
              description="Points per like given"
            />
            <WeightInput
              label="Evaluation"
              value={evaluationWeight}
              onChange={setEvaluationWeight}
              description="Points per evaluation response"
            />
          </div>
        </div>

        {/* Leaderboard visibility */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Show Leaderboard</p>
            <p className="text-xs text-gray-500">
              Make the campaign leaderboard visible to participants
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showLeaderboard}
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showLeaderboard ? "bg-primary-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                showLeaderboard ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Recalculate
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Reset Scores
            </button>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>

      {/* Hidden fields for tRPC integration */}
      <input type="hidden" name="campaignId" value={campaignId} />
    </div>
  );
}
