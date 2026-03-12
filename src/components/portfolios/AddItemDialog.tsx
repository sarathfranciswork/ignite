"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Search, Target, TrendingUp, Cpu, Lightbulb, Loader2 } from "lucide-react";

type EntityType = "TREND" | "TECHNOLOGY" | "IDEA" | "SIA";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (entityType: EntityType, entityId: string) => void;
  isLoading: boolean;
  existingEntityIds: Set<string>;
}

const ENTITY_TABS: { type: EntityType; label: string; icon: React.ElementType }[] = [
  { type: "SIA", label: "SIAs", icon: Target },
  { type: "TREND", label: "Trends", icon: TrendingUp },
  { type: "TECHNOLOGY", label: "Technologies", icon: Cpu },
  { type: "IDEA", label: "Ideas", icon: Lightbulb },
];

export function AddItemDialog({
  open,
  onOpenChange,
  onAdd,
  isLoading,
  existingEntityIds,
}: AddItemDialogProps) {
  const [activeTab, setActiveTab] = useState<EntityType>("SIA");
  const [search, setSearch] = useState("");

  const siasQuery = trpc.sia.list.useQuery(
    { limit: 50, search: search || undefined, sortBy: "name", sortDirection: "asc" },
    { enabled: open && activeTab === "SIA" },
  );

  const trendsQuery = trpc.trend.list.useQuery(
    { limit: 50, search: search || undefined, sortBy: "title", sortDirection: "asc" },
    { enabled: open && activeTab === "TREND" },
  );

  const techsQuery = trpc.technology.list.useQuery(
    { limit: 50, search: search || undefined, sortBy: "title", sortDirection: "asc" },
    { enabled: open && activeTab === "TECHNOLOGY" },
  );

  const ideasQuery = trpc.search.global.useQuery(
    { query: search || "a", entityTypes: ["idea"], limit: 50 },
    { enabled: open && activeTab === "IDEA" && search.length > 0 },
  );

  const getItems = (): { id: string; title: string; subtitle?: string }[] => {
    if (activeTab === "SIA" && siasQuery.data) {
      return siasQuery.data.items.map((s) => ({
        id: s.id,
        title: s.name,
        subtitle: s.isActive ? "Active" : "Archived",
      }));
    }
    if (activeTab === "TREND" && trendsQuery.data) {
      return trendsQuery.data.items.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.type,
      }));
    }
    if (activeTab === "TECHNOLOGY" && techsQuery.data) {
      return techsQuery.data.items.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.maturityLevel ?? undefined,
      }));
    }
    if (activeTab === "IDEA" && ideasQuery.data) {
      return ideasQuery.data.map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: i.status ?? undefined,
      }));
    }
    return [];
  };

  const isQuerying =
    (activeTab === "SIA" && siasQuery.isLoading) ||
    (activeTab === "TREND" && trendsQuery.isLoading) ||
    (activeTab === "TECHNOLOGY" && techsQuery.isLoading) ||
    (activeTab === "IDEA" && ideasQuery.isLoading);

  const items = getItems();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Item to Portfolio</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex gap-1 border-b">
          {ENTITY_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.type}
                onClick={() => {
                  setActiveTab(tab.type);
                  setSearch("");
                }}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.type
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${ENTITY_TABS.find((t) => t.type === activeTab)?.label}...`}
            className="pl-9"
          />
        </div>

        <div className="mt-2 max-h-64 overflow-y-auto">
          {isQuerying && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!isQuerying && items.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No items found</p>
          )}

          {!isQuerying &&
            items.map((item) => {
              const alreadyAdded = existingEntityIds.has(item.id);
              return (
                <button
                  key={item.id}
                  disabled={alreadyAdded || isLoading}
                  onClick={() => onAdd(activeTab, item.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                    alreadyAdded ? "cursor-not-allowed bg-gray-50 opacity-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
                  </div>
                  {alreadyAdded && (
                    <Badge variant="secondary" className="text-xs">
                      Added
                    </Badge>
                  )}
                </button>
              );
            })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
