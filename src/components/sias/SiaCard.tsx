"use client";

import Link from "next/link";
import Image from "next/image";
import { Briefcase, User } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface SiaCardProps {
  sia: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    isActive: boolean;
    campaignCount: number;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    createdAt: string;
  };
}

export function SiaCard({ sia }: SiaCardProps) {
  return (
    <Link href={`/strategy/sias/${sia.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        {sia.imageUrl ? (
          <div className="relative h-40 w-full overflow-hidden rounded-t-xl bg-gray-100">
            <Image src={sia.imageUrl} alt={sia.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-t-xl bg-gradient-to-br from-primary-50 to-primary-100">
            <Briefcase className="h-12 w-12 text-primary-300" />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base group-hover:text-primary-600">
              {sia.name}
            </CardTitle>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                sia.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {sia.isActive ? "Active" : "Archived"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {sia.description && (
            <p className="line-clamp-2 text-sm text-gray-500">{sia.description}</p>
          )}
        </CardContent>
        <CardFooter className="text-xs text-gray-400">
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {sia.createdBy.name ?? sia.createdBy.email}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {sia.campaignCount} campaign{sia.campaignCount !== 1 ? "s" : ""}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
