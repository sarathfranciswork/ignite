"use client";

import { useState } from "react";
import type {
  InsightType,
  InsightScope,
  InsightCreateInput,
} from "@/types/insight";

interface InsightCreateFormProps {
  onSubmit: (data: InsightCreateInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const INSIGHT_TYPES: Array<{
  value: InsightType;
  label: string;
  description: string;
}> = [
  {
    value: "SIGNAL",
    label: "Signal",
    description: "An early indicator or weak signal worth tracking",
  },
  {
    value: "OBSERVATION",
    label: "Observation",
    description: "A notable pattern or behavior observed",
  },
  {
    value: "OPPORTUNITY",
    label: "Opportunity",
    description: "A potential area for innovation or improvement",
  },
  {
    value: "RISK",
    label: "Risk",
    description: "A threat or challenge that needs attention",
  },
];

const SCOPES: Array<{ value: InsightScope; label: string }> = [
  { value: "GLOBAL", label: "Global — Share with the entire organization" },
  { value: "CAMPAIGN", label: "Campaign — Link to a specific campaign" },
  { value: "TREND", label: "Trend — Link to a specific trend" },
];

/**
 * Form for creating a new community insight.
 * Collects: title, content, type, scope, source URL, and optional file attachments.
 */
export function InsightCreateForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: InsightCreateFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [insightType, setInsightType] = useState<InsightType>("SIGNAL");
  const [scope, setScope] = useState<InsightScope>("GLOBAL");
  const [scopeEntityId, setScopeEntityId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 200) {
      newErrors.title = "Title must be 200 characters or less";
    }

    if (!content.trim()) {
      newErrors.content = "Content is required";
    } else if (content.length > 10000) {
      newErrors.content = "Content must be 10,000 characters or less";
    }

    if (scope !== "GLOBAL" && !scopeEntityId.trim()) {
      newErrors.scopeEntityId = `Please select a ${scope.toLowerCase()} to link to`;
    }

    if (sourceUrl && !isValidUrl(sourceUrl)) {
      newErrors.sourceUrl = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      insightType,
      scope,
      scopeEntityId: scope !== "GLOBAL" ? scopeEntityId : undefined,
      sourceUrl: sourceUrl || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Share Insight
      </h2>

      {/* Title */}
      <div>
        <label
          htmlFor="insight-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="insight-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="What's the key takeaway?"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">{title.length}/200</p>
      </div>

      {/* Content */}
      <div>
        <label
          htmlFor="insight-content"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          id="insight-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={10000}
          rows={6}
          placeholder="Describe your insight in detail…"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">{content.length}/10,000</p>
      </div>

      {/* Insight Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Insight Type <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {INSIGHT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setInsightType(type.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                insightType === type.value
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-900/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500"
              }`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {type.label}
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scope */}
      <div>
        <label
          htmlFor="insight-scope"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Scope <span className="text-red-500">*</span>
        </label>
        <select
          id="insight-scope"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value as InsightScope);
            setScopeEntityId("");
          }}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Scope Entity ID (when not GLOBAL) */}
      {scope !== "GLOBAL" && (
        <div>
          <label
            htmlFor="insight-scope-entity"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {scope === "CAMPAIGN" ? "Campaign" : "Trend"} ID{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            id="insight-scope-entity"
            type="text"
            value={scopeEntityId}
            onChange={(e) => setScopeEntityId(e.target.value)}
            placeholder={`Enter the ${scope.toLowerCase()} ID`}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          {errors.scopeEntityId && (
            <p className="mt-1 text-sm text-red-600">{errors.scopeEntityId}</p>
          )}
        </div>
      )}

      {/* Source URL */}
      <div>
        <label
          htmlFor="insight-source-url"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Source URL
        </label>
        <input
          id="insight-source-url"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/article"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        {errors.sourceUrl && (
          <p className="mt-1 text-sm text-red-600">{errors.sourceUrl}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isSubmitting ? "Sharing…" : "Share Insight"}
        </button>
      </div>
    </form>
  );
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
