"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Search,
  Columns3,
  Heart,
  MessageSquare,
  Eye,
  ChevronDown,
  RotateCcw,
  Columns2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { DualWindowComparison } from "./DualWindowComparison";
import { trpc } from "@/lib/trpc";
import {
  useIdeaBoardStore,
  type IdeaBoardColumn,
  type IdeaBoardSortField,
} from "@/stores/ideaBoard.store";
import { type IdeaStatus, isIdeaStatus } from "@/types/idea";

interface BoardIdeaItem {
  id: string;
  title: string;
  teaser: string | null;
  status: IdeaStatus;
  category: string | null;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  contributor?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS: { value: IdeaStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "COMMUNITY_DISCUSSION", label: "Community Discussion" },
  { value: "HOT", label: "Hot" },
  { value: "EVALUATION", label: "Evaluation" },
  { value: "SELECTED_IMPLEMENTATION", label: "Selected" },
  { value: "IMPLEMENTED", label: "Implemented" },
  { value: "ARCHIVED", label: "Archived" },
];

const ALL_COLUMNS: { id: IdeaBoardColumn; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "status", label: "Status" },
  { id: "contributor", label: "Contributor" },
  { id: "category", label: "Category" },
  { id: "tags", label: "Tags" },
  { id: "likesCount", label: "Likes" },
  { id: "commentsCount", label: "Comments" },
  { id: "viewsCount", label: "Views" },
  { id: "createdAt", label: "Created" },
  { id: "updatedAt", label: "Updated" },
];

const SORTABLE_COLUMNS: IdeaBoardSortField[] = [
  "title",
  "status",
  "category",
  "likesCount",
  "commentsCount",
  "viewsCount",
  "createdAt",
  "updatedAt",
];

interface IdeaBoardProps {
  campaignId: string;
}

export function IdeaBoard({ campaignId }: IdeaBoardProps) {
  const {
    columns,
    filters,
    sortField,
    sortDirection,
    selectedRows,
    comparison,
    toggleColumn,
    setFilter,
    resetFilters,
    toggleSort,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    toggleComparisonMode,
    setComparisonSlot,
  } = useIdeaBoardStore();

  const [showColumnPicker, setShowColumnPicker] = React.useState(false);
  const columnPickerRef = React.useRef<HTMLDivElement>(null);

  // Close column picker on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    }
    if (showColumnPicker) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showColumnPicker]);

  const ideasQuery = trpc.idea.listForBoard.useQuery({
    campaignId,
    limit: 25,
    search: filters.search || undefined,
    status: filters.status,
    category: filters.category,
    tag: filters.tag,
    sortField,
    sortDirection,
  });

  const data = ideasQuery.data as { items: BoardIdeaItem[]; nextCursor?: string } | undefined;
  const items = data?.items ?? [];

  const hasActiveFilters = filters.search || filters.status || filters.category || filters.tag;

  function handleCompareSelect(ideaId: string) {
    if (!comparison.leftIdeaId) {
      setComparisonSlot("left", ideaId);
    } else if (!comparison.rightIdeaId && ideaId !== comparison.leftIdeaId) {
      setComparisonSlot("right", ideaId);
    } else if (ideaId !== comparison.rightIdeaId) {
      // If both slots are filled, replace left and shift right to left
      setComparisonSlot("left", comparison.rightIdeaId ?? ideaId);
      setComparisonSlot("right", ideaId);
    }
  }

  const tableColumns = buildTableColumns(
    columns,
    comparison.isComparisonMode
      ? {
          onSelect: handleCompareSelect,
          leftIdeaId: comparison.leftIdeaId,
          rightIdeaId: comparison.rightIdeaId,
        }
      : null,
  );

  function handleSort(field: string) {
    if (SORTABLE_COLUMNS.includes(field as IdeaBoardSortField)) {
      toggleSort(field as IdeaBoardSortField);
    }
  }

  function handleToggleAll(ids: string[]) {
    if (ids.length === 0) {
      clearSelection();
    } else {
      selectAllRows(ids);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search ideas..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <select
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          value={filters.status ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setFilter("status", value && isIdeaStatus(value) ? value : undefined);
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Category filter */}
        <Input
          placeholder="Category..."
          className="w-36"
          value={filters.category ?? ""}
          onChange={(e) => setFilter("category", e.target.value || undefined)}
        />

        {/* Tag filter */}
        <Input
          placeholder="Tag..."
          className="w-36"
          value={filters.tag ?? ""}
          onChange={(e) => setFilter("tag", e.target.value || undefined)}
        />

        {/* Reset filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        )}

        {/* Comparison mode toggle */}
        <Button
          variant={comparison.isComparisonMode ? "default" : "outline"}
          size="sm"
          onClick={toggleComparisonMode}
        >
          <Columns2 className="mr-1.5 h-3.5 w-3.5" />
          Compare
        </Button>

        {/* Column picker */}
        <div className="relative" ref={columnPickerRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnPicker(!showColumnPicker)}
          >
            <Columns3 className="mr-1.5 h-3.5 w-3.5" />
            Columns
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          {showColumnPicker && (
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-gray-300"
                    checked={columns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk actions toolbar */}
      <BulkActionsToolbar
        selectedIds={selectedRows}
        campaignId={campaignId}
        onClearSelection={clearSelection}
        onActionComplete={() => void ideasQuery.refetch()}
      />

      {/* Error state */}
      {ideasQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load ideas. Please try again.</p>
        </div>
      )}

      {/* Table */}
      {!ideasQuery.isError && (
        <DataTable
          columns={tableColumns}
          data={items}
          getRowId={(item) => item.id}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectedRows={selectedRows}
          onToggleRow={toggleRowSelection}
          onToggleAll={handleToggleAll}
          isLoading={ideasQuery.isLoading}
          emptyMessage="No ideas match your filters."
        />
      )}

      {/* Dual-window comparison */}
      {comparison.isComparisonMode && <DualWindowComparison />}

      {/* Load more */}
      {data?.nextCursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // For board view, we use the cursor for pagination
              // This will be handled by loading the next page
            }}
            disabled={ideasQuery.isFetching}
          >
            {ideasQuery.isFetching ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

interface ComparisonColumnConfig {
  onSelect: (ideaId: string) => void;
  leftIdeaId: string | null;
  rightIdeaId: string | null;
}

function buildTableColumns(
  visibleColumns: IdeaBoardColumn[],
  comparisonConfig: ComparisonColumnConfig | null,
): DataTableColumn<BoardIdeaItem>[] {
  const columnDefs: Record<IdeaBoardColumn, DataTableColumn<BoardIdeaItem>> = {
    title: {
      id: "title",
      header: "Title",
      sortable: true,
      className: "min-w-[200px]",
      render: (item) => (
        <Link
          href={`/ideas/${item.id}`}
          className="font-medium text-gray-900 hover:text-primary-600 hover:underline"
        >
          {item.title}
        </Link>
      ),
    },
    status: {
      id: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    contributor: {
      id: "contributor",
      header: "Contributor",
      sortable: false,
      render: (item) => (
        <span className="text-gray-600">
          {item.contributor?.name ?? item.contributor?.email ?? "-"}
        </span>
      ),
    },
    category: {
      id: "category",
      header: "Category",
      sortable: true,
      render: (item) =>
        item.category ? (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {item.category}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    tags: {
      id: "tags",
      header: "Tags",
      sortable: false,
      render: (item) =>
        item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    likesCount: {
      id: "likesCount",
      header: "Likes",
      sortable: true,
      className: "text-right",
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-gray-600">
          <Heart className="h-3.5 w-3.5" />
          {item.likesCount}
        </span>
      ),
    },
    commentsCount: {
      id: "commentsCount",
      header: "Comments",
      sortable: true,
      className: "text-right",
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-gray-600">
          <MessageSquare className="h-3.5 w-3.5" />
          {item.commentsCount}
        </span>
      ),
    },
    viewsCount: {
      id: "viewsCount",
      header: "Views",
      sortable: true,
      className: "text-right",
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-gray-600">
          <Eye className="h-3.5 w-3.5" />
          {item.viewsCount}
        </span>
      ),
    },
    createdAt: {
      id: "createdAt",
      header: "Created",
      sortable: true,
      render: (item) => (
        <span className="whitespace-nowrap text-gray-500">
          {format(new Date(item.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    updatedAt: {
      id: "updatedAt",
      header: "Updated",
      sortable: true,
      render: (item) => (
        <span className="whitespace-nowrap text-gray-500">
          {format(new Date(item.updatedAt), "MMM d, yyyy")}
        </span>
      ),
    },
  };

  const result = visibleColumns.map((colId) => columnDefs[colId]).filter(Boolean);

  if (comparisonConfig) {
    const compareColumn: DataTableColumn<BoardIdeaItem> = {
      id: "__compare",
      header: "Compare",
      sortable: false,
      className: "w-24 text-center",
      render: (item) => {
        const isLeft = comparisonConfig.leftIdeaId === item.id;
        const isRight = comparisonConfig.rightIdeaId === item.id;
        const isSelected = isLeft || isRight;
        const slotLabel = isLeft ? "L" : isRight ? "R" : "";

        return (
          <button
            type="button"
            onClick={() => comparisonConfig.onSelect(item.id)}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              isSelected
                ? "bg-primary-600 text-white"
                : "border border-gray-300 bg-white text-gray-500 hover:border-primary-400 hover:text-primary-600"
            }`}
          >
            {slotLabel || "+"}
          </button>
        );
      },
    };
    result.push(compareColumn);
  }

  return result;
}
