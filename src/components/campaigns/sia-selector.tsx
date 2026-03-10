"use client";

import { useState, useCallback } from "react";
import type { SiaSummary } from "@/types/campaign-sia";

// ============================================================
// SIA Selector Component (Story 9.6)
//
// Used in Campaign Advanced Wizard Step 1 to link campaigns
// to one or more Strategic Innovation Areas.
// ============================================================

interface SiaSelectorProps {
  /** All available SIAs to choose from */
  availableSias: SiaSummary[];
  /** Currently selected SIA IDs */
  selectedSiaIds: string[];
  /** Callback when selection changes */
  onChange: (siaIds: string[]) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

export function SiaSelector({
  availableSias,
  selectedSiaIds,
  onChange,
  disabled = false,
  isLoading = false,
}: SiaSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSias = availableSias.filter((sia) =>
    sia.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggle = useCallback(
    (siaId: string) => {
      if (disabled) return;

      const isSelected = selectedSiaIds.includes(siaId);
      if (isSelected) {
        onChange(selectedSiaIds.filter((id) => id !== siaId));
      } else {
        onChange([...selectedSiaIds, siaId]);
      }
    },
    [selectedSiaIds, onChange, disabled],
  );

  const handleRemove = useCallback(
    (siaId: string) => {
      if (disabled) return;
      onChange(selectedSiaIds.filter((id) => id !== siaId));
    },
    [selectedSiaIds, onChange, disabled],
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-gray-200 rounded-md" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Strategic Alignment
        <span className="text-gray-400 font-normal ml-1">(optional)</span>
      </label>

      {/* Selected SIAs as badges */}
      {selectedSiaIds.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="selected-sias">
          {selectedSiaIds.map((siaId) => {
            const sia = availableSias.find((s) => s.id === siaId);
            if (!sia) return null;
            return (
              <span
                key={siaId}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
              >
                {sia.name}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(siaId)}
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-600 hover:bg-blue-200 hover:text-blue-800"
                    aria-label={`Remove ${sia.name}`}
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search innovation areas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          data-testid="sia-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* SIA List */}
      <div
        className="max-h-60 overflow-y-auto rounded-md border border-gray-200"
        data-testid="sia-list"
      >
        {filteredSias.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500 text-center">
            {searchQuery
              ? "No innovation areas match your search"
              : "No innovation areas available"}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredSias.map((sia) => {
              const isSelected = selectedSiaIds.includes(sia.id);
              return (
                <li key={sia.id}>
                  <button
                    type="button"
                    onClick={() => handleToggle(sia.id)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    data-testid={`sia-option-${sia.id}`}
                  >
                    {/* Checkbox indicator */}
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    {/* SIA Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {sia.name}
                      </p>
                      {sia.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {sia.description}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Link this campaign to strategic innovation areas to enable the &quot;Be
        Inspired&quot; tab for contributors.
      </p>
    </div>
  );
}
