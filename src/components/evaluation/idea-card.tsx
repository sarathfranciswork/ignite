"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Idea } from "@/types/evaluation";
import { ChevronDown, ChevronUp, MessageSquare, Heart } from "lucide-react";

interface IdeaCardProps {
  idea: Idea;
  label: string;
  accentColor?: "primary" | "accent";
}

export function IdeaCard({
  idea,
  label,
  accentColor = "primary",
}: IdeaCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const borderColor =
    accentColor === "primary"
      ? "border-t-[var(--primary-500)]"
      : "border-t-[var(--accent-500)]";

  const labelBg =
    accentColor === "primary"
      ? "bg-[var(--primary-50)] text-[var(--primary-700)]"
      : "bg-[var(--accent-50)] text-[var(--accent-700)]";

  return (
    <Card className={cn("flex flex-col border-t-4", borderColor)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              labelBg,
            )}
          >
            {label}
          </span>
        </div>
        <CardTitle className="mt-2">{idea.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p
          className={cn(
            "text-sm leading-relaxed text-[var(--gray-600)]",
            !showDetails && "line-clamp-3",
          )}
        >
          {idea.description}
        </p>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 self-start"
          onClick={() => setShowDetails(!showDetails)}
          aria-expanded={showDetails}
        >
          {showDetails ? (
            <>
              Hide Details <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show Details <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>

        {showDetails && (
          <div className="mt-3 border-t border-[var(--border-light)] pt-3">
            <div className="flex items-center gap-4 text-xs text-[var(--gray-500)]">
              <span>By {idea.authorName}</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {idea.commentCount}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {idea.likeCount}
              </span>
            </div>
            {idea.imageUrl && (
              <Image
                src={idea.imageUrl}
                alt={idea.title}
                width={400}
                height={192}
                className="mt-3 max-h-48 w-full rounded-lg object-cover"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
