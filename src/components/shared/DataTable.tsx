"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (item: T) => string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
  selectedRows?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  sortField,
  sortDirection,
  onSort,
  selectedRows,
  onToggleRow,
  onToggleAll,
  isLoading,
  emptyMessage = "No data found.",
}: DataTableProps<T>) {
  const allIds = data.map(getRowId);
  const allSelected =
    allIds.length > 0 && selectedRows && allIds.every((id) => selectedRows.has(id));
  const someSelected = selectedRows && allIds.some((id) => selectedRows.has(id)) && !allSelected;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {onToggleRow && onToggleAll && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected ?? false;
                  }}
                  onChange={() => {
                    if (allSelected) {
                      onToggleAll([]);
                    } else {
                      onToggleAll(allIds);
                    }
                  }}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  "px-3 py-3 text-xs font-medium uppercase tracking-wider text-gray-500",
                  col.sortable && "cursor-pointer select-none hover:text-gray-700",
                  col.className,
                )}
                onClick={col.sortable && onSort ? () => onSort(col.id) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <SortIndicator
                      field={col.id}
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {isLoading && data.length === 0 && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {onToggleRow && onToggleAll && (
                    <td className="px-3 py-3">
                      <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.id} className="px-3 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))}
            </>
          )}

          {!isLoading && data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (onToggleRow && onToggleAll ? 1 : 0)}
                className="px-3 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}

          {data.map((item) => {
            const rowId = getRowId(item);
            const isSelected = selectedRows?.has(rowId) ?? false;

            return (
              <tr
                key={rowId}
                className={cn("transition-colors hover:bg-gray-50", isSelected && "bg-primary-50")}
              >
                {onToggleRow && onToggleAll && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={isSelected}
                      onChange={() => onToggleRow(rowId)}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.id} className={cn("px-3 py-3 text-sm text-gray-700", col.className)}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortIndicator({
  field,
  sortField,
  sortDirection,
}: {
  field: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}) {
  if (sortField !== field) {
    return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
  }

  return sortDirection === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-gray-700" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-gray-700" />
  );
}
