"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Layers, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PortfolioCardProps {
  portfolio: {
    id: string;
    title: string;
    description: string | null;
    itemCount: number;
    updatedAt: string;
  };
  onClick: (id: string) => void;
}

export function PortfolioCard({ portfolio, onClick }: PortfolioCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(portfolio.id)}
    >
      <CardHeader>
        <h3 className="font-display text-lg font-semibold leading-tight">{portfolio.title}</h3>
      </CardHeader>
      <CardContent>
        {portfolio.description && (
          <p className="mb-4 line-clamp-2 text-sm text-gray-500">{portfolio.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {portfolio.itemCount} {portfolio.itemCount === 1 ? "item" : "items"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(portfolio.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
