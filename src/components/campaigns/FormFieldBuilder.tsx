"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CustomFieldType } from "@/types/campaign";
import type { CustomField, VisibilityCondition } from "@/types/campaign";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  [CustomFieldType.TEXT]: "Text",
  [CustomFieldType.KEYWORD]: "Keyword",
  [CustomFieldType.SELECTION]: "Selection",
  [CustomFieldType.CHECKBOX]: "Checkbox",
  [CustomFieldType.NUMBER]: "Number",
};

interface FormFieldBuilderProps {
  field: CustomField;
  allFields: CustomField[];
  onUpdate: (updates: Partial<CustomField>) => void;
  onRemove: () => void;
}

export function FormFieldBuilder({
  field,
  allFields,
  onUpdate,
  onRemove,
}: FormFieldBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const otherFields = allFields.filter((f) => f.id !== field.id);

  function updateVisibilityCondition(
    updates: Partial<VisibilityCondition> | null,
  ) {
    if (updates === null) {
      onUpdate({ visibilityCondition: undefined });
      return;
    }
    const current = field.visibilityCondition ?? {
      dependsOnFieldId: "",
      operator: "equals" as const,
      value: "",
    };
    onUpdate({ visibilityCondition: { ...current, ...updates } });
  }

  function handleOptionsChange(value: string) {
    onUpdate({
      options: value
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border border-gray-200 rounded-lg bg-white",
        isDragging && "opacity-50 shadow-lg",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
        <button
          type="button"
          className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
          {FIELD_TYPE_LABELS[field.type]}
        </span>

        <span className="text-sm font-medium text-gray-700 truncate flex-1">
          {field.label || "Untitled field"}
        </span>

        {field.isMandatory && (
          <span className="text-xs text-danger-500 font-medium">Required</span>
        )}

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="p-1 hover:bg-red-100 text-gray-400 hover:text-danger-500 rounded transition-colors"
          aria-label="Remove field"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Field Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Field Type
              </label>
              <select
                value={field.type}
                onChange={(e) =>
                  onUpdate({
                    type: e.target.value as CustomFieldType,
                    options:
                      e.target.value === CustomFieldType.SELECTION
                        ? (field.options ?? [])
                        : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Label <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Field label"
              />
            </div>
          </div>

          {/* Help Text */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Help Text
            </label>
            <input
              type="text"
              value={field.helpText}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Instructions for the user"
            />
          </div>

          {/* Type-specific options */}
          {field.type === CustomFieldType.TEXT && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.isMultiLine ?? false}
                onChange={(e) => onUpdate({ isMultiLine: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                Multi-line (textarea)
              </span>
            </label>
          )}

          {field.type === CustomFieldType.KEYWORD && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.isMultiSelect ?? false}
                onChange={(e) => onUpdate({ isMultiSelect: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                Allow multiple keywords
              </span>
            </label>
          )}

          {field.type === CustomFieldType.SELECTION && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Options (comma-separated)
              </label>
              <input
                type="text"
                value={field.options?.join(", ") ?? ""}
                onChange={(e) => handleOptionsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}

          {/* Mandatory toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.isMandatory}
              onChange={(e) => onUpdate({ isMandatory: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Required field</span>
          </label>

          {/* Visibility Conditions */}
          {otherFields.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={!!field.visibilityCondition}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateVisibilityCondition({
                        dependsOnFieldId: otherFields[0].id,
                        operator: "equals",
                        value: "",
                      });
                    } else {
                      updateVisibilityCondition(null);
                    }
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Conditional visibility
                </span>
              </label>

              {field.visibilityCondition && (
                <div className="ml-6 grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Show when field
                    </label>
                    <select
                      value={field.visibilityCondition.dependsOnFieldId}
                      onChange={(e) =>
                        updateVisibilityCondition({
                          dependsOnFieldId: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {otherFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label || "Untitled"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Condition
                    </label>
                    <select
                      value={field.visibilityCondition.operator}
                      onChange={(e) =>
                        updateVisibilityCondition({
                          operator: e.target.value as
                            | "equals"
                            | "not_equals"
                            | "contains",
                        })
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not equals</option>
                      <option value="contains">Contains</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Value
                    </label>
                    <input
                      type="text"
                      value={field.visibilityCondition.value}
                      onChange={(e) =>
                        updateVisibilityCondition({ value: e.target.value })
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Expected value"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
