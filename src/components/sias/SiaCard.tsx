"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface SiaCardProps {
  sia: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    campaignCount: number;
    createdAt: string;
  };
  onClick: (id: string) => void;
}

export function SiaCard({ sia, onClick }: SiaCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(sia.id)}
    >
      {sia.color && <div className="h-2 rounded-t-xl" style={{ backgroundColor: sia.color }} />}
      <CardHeader className={cn(!sia.color && "pt-6")}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{sia.name}</h3>
          <Badge variant={sia.isActive ? "success" : "secondary"}>
            {sia.isActive ? "Active" : "Archived"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {sia.description && (
          <p className="mb-4 line-clamp-2 text-sm text-gray-500">{sia.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Megaphone className="h-3.5 w-3.5" />
            {sia.campaignCount} {sia.campaignCount === 1 ? "campaign" : "campaigns"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
