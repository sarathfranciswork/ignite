"use client";

import { useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { generateId } from "@/lib/utils";
import { CustomFieldType } from "@/types/campaign";
import type { CampaignWizardData, CustomField } from "@/types/campaign";
import { FormFieldBuilder } from "../FormFieldBuilder";
import { SubmissionFormPreview } from "./SubmissionFormPreview";

export function StepSubmissionForm() {
  const { register, watch, setValue } = useFormContext<CampaignWizardData>();

  const customFields = watch("customFields");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = customFields.findIndex((f) => f.id === active.id);
    const newIndex = customFields.findIndex((f) => f.id === over.id);

    const updated = [...customFields];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);

    const reordered = updated.map((field, index) => ({
      ...field,
      displayOrder: index,
    }));

    setValue("customFields", reordered);
  }

  function addField() {
    const newField: CustomField = {
      id: generateId(),
      type: CustomFieldType.TEXT,
      label: "",
      helpText: "",
      isMandatory: false,
      displayOrder: customFields.length,
    };
    setValue("customFields", [...customFields, newField]);
  }

  function updateField(id: string, updates: Partial<CustomField>) {
    setValue(
      "customFields",
      customFields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  }

  function removeField(id: string) {
    const filtered = customFields
      .filter((f) => f.id !== id)
      .map((f, index) => ({ ...f, displayOrder: index }));

    // Also remove any visibility conditions referencing this field
    const cleaned = filtered.map((f) => {
      if (f.visibilityCondition?.dependsOnFieldId === id) {
        const { visibilityCondition: _, ...rest } = f;
        return rest;
      }
      return f;
    });

    setValue("customFields", cleaned);
  }

  return (
    <div className="space-y-6">
      {/* Campaign Guidance */}
      <div>
        <label
          htmlFor="campaignGuidance"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Campaign Guidance
        </label>
        <textarea
          id="campaignGuidance"
          {...register("campaignGuidance")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="Provide guidance for idea submitters..."
        />
      </div>

      {/* Custom Fields Builder */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Custom Submission Fields
          </h3>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <Plus size={14} />
            Add Field
          </button>
        </div>

        {customFields.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">No custom fields yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Add fields to customize the submission form.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={customFields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {customFields.map((field) => (
                  <FormFieldBuilder
                    key={field.id}
                    field={field}
                    allFields={customFields}
                    onUpdate={(updates) => updateField(field.id, updates)}
                    onRemove={() => removeField(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Live Preview */}
      {customFields.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Form Preview
          </h3>
          <SubmissionFormPreview fields={customFields} />
        </div>
      )}

      {/* Default Idea Image */}
      <div>
        <label
          htmlFor="defaultIdeaImageUrl"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Default Idea Image URL
        </label>
        <input
          id="defaultIdeaImageUrl"
          type="url"
          {...register("defaultIdeaImageUrl")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="URL for default idea image (or leave empty to use banner)"
        />
      </div>
    </div>
  );
}
