"use client";

import { CustomFieldType } from "@/types/campaign";
import type { CustomField } from "@/types/campaign";

interface SubmissionFormPreviewProps {
  fields: CustomField[];
}

export function SubmissionFormPreview({ fields }: SubmissionFormPreviewProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-800 mb-4">
        Submission Form Preview
      </h4>
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label || "Untitled"}{" "}
              {field.isMandatory && <span className="text-danger-500">*</span>}
            </label>
            {field.helpText && (
              <p className="text-xs text-gray-500 mb-1">{field.helpText}</p>
            )}
            {field.visibilityCondition && (
              <p className="text-xs text-accent-500 italic mb-1">
                Conditional: visible when conditions are met
              </p>
            )}
            <PreviewInput field={field} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewInput({ field }: { field: CustomField }) {
  const baseClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white";

  switch (field.type) {
    case CustomFieldType.TEXT:
      if (field.isMultiLine) {
        return (
          <textarea
            disabled
            rows={3}
            className={`${baseClasses} resize-none opacity-60`}
            placeholder={`Enter ${field.label || "text"}...`}
          />
        );
      }
      return (
        <input
          disabled
          type="text"
          className={`${baseClasses} opacity-60`}
          placeholder={`Enter ${field.label || "text"}...`}
        />
      );

    case CustomFieldType.KEYWORD:
      return (
        <input
          disabled
          type="text"
          className={`${baseClasses} opacity-60`}
          placeholder={`Type ${field.isMultiSelect ? "keywords" : "a keyword"} and press Enter...`}
        />
      );

    case CustomFieldType.SELECTION:
      return (
        <select disabled className={`${baseClasses} opacity-60`}>
          <option value="">Select an option...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case CustomFieldType.CHECKBOX:
      return (
        <label className="flex items-center gap-2 opacity-60">
          <input
            disabled
            type="checkbox"
            className="w-4 h-4 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">
            {field.label || "Checkbox"}
          </span>
        </label>
      );

    case CustomFieldType.NUMBER:
      return (
        <input
          disabled
          type="number"
          className={`${baseClasses} opacity-60`}
          placeholder="0"
        />
      );

    default:
      return null;
  }
}
