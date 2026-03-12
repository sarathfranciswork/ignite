"use client";

import * as React from "react";
import { ArrowLeftRight, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComparisonPanel } from "./ComparisonPanel";
import { useIdeaBoardStore } from "@/stores/ideaBoard.store";

export function DualWindowComparison() {
  const { comparison, clearComparisonSlot, swapComparisonSlots } = useIdeaBoardStore();

  const { leftIdeaId, rightIdeaId } = comparison;
  const hasLeft = leftIdeaId !== null;
  const hasRight = rightIdeaId !== null;
  const hasBoth = hasLeft && hasRight;

  if (!hasLeft && !hasRight) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <Columns2 className="mx-auto h-10 w-10 text-gray-300" />
        <h3 className="mt-3 text-sm font-medium text-gray-700">Select ideas to compare</h3>
        <p className="mt-1 text-xs text-gray-500">
          Click on ideas in the table above to populate the comparison panels.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasBoth && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={swapComparisonSlots}>
            <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
            Swap panels
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-[600px] overflow-hidden rounded-xl border border-gray-200 bg-white">
          {hasLeft ? (
            <ComparisonPanel ideaId={leftIdeaId} onClose={() => clearComparisonSlot("left")} />
          ) : (
            <EmptySlot label="Left panel" hint="Click an idea to fill this slot" />
          )}
        </div>

        <div className="h-[600px] overflow-hidden rounded-xl border border-gray-200 bg-white">
          {hasRight ? (
            <ComparisonPanel ideaId={rightIdeaId} onClose={() => clearComparisonSlot("right")} />
          ) : (
            <EmptySlot label="Right panel" hint="Click an idea to fill this slot" />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptySlot({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <Columns2 className="h-8 w-8 text-gray-300" />
      <p className="mt-2 text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}
