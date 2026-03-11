"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Megaphone,
  Hash,
  Lightbulb,
  User,
  Command,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

type SearchEntityType = "idea" | "campaign" | "channel" | "user";

const ENTITY_ICONS: Record<SearchEntityType, React.ElementType> = {
  campaign: Megaphone,
  channel: Hash,
  idea: Lightbulb,
  user: User,
};

const ENTITY_COLORS: Record<SearchEntityType, string> = {
  campaign: "text-blue-500",
  channel: "text-green-500",
  idea: "text-amber-500",
  user: "text-purple-500",
};

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const searchQuery = trpc.search.global.useQuery(
    { query, limit: 10 },
    { enabled: open && query.length >= 1 },
  );

  const results = searchQuery.data ?? [];

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigateToResult(results[selectedIndex]);
    }
  };

  const navigateToResult = (result: { url: string }) => {
    setOpen(false);
    router.push(result.url);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-600"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-4 flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
        role="button"
        tabIndex={-1}
        aria-label="Close search"
      />
      <div className="fixed left-1/2 top-[15%] w-full max-w-xl -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          {/* Search input */}
          <div className="flex items-center border-b border-gray-100 px-4">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search campaigns, ideas, channels, users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent px-3 py-4 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {searchQuery.isFetching && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {query.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Start typing to search across the platform...
              </div>
            )}

            {query.length > 0 && !searchQuery.isFetching && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {results.length > 0 && (
              <ul className="py-2">
                {results.map((result, index) => {
                  const Icon = ENTITY_ICONS[result.type];
                  const color = ENTITY_COLORS[result.type];

                  return (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        onClick={() => navigateToResult(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                          index === selectedIndex ? "bg-primary-50" : "hover:bg-gray-50",
                        )}
                      >
                        <Icon className={cn("h-5 w-5 shrink-0", color)} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {result.title}
                          </div>
                          {result.description && (
                            <div className="truncate text-xs text-gray-500">
                              {result.description}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {result.status && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                              {result.status}
                            </span>
                          )}
                          {index === selectedIndex && (
                            <ArrowRight className="h-4 w-4 text-primary-500" />
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-[10px] text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">
                  ↵
                </kbd>
                Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">
                  esc
                </kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
