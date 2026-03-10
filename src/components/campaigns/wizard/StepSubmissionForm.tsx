"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Type,
  AlignLeft,
  Tag,
  ChevronDown,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CustomField, CustomFieldType } from "@/types/campaign-wizard";

interface StepSubmissionFormProps {
  customFields: CustomField[];
  onSave: (fields: CustomField[]) => void;
  isSaving: boolean;
}

const FIELD_TYPE_OPTIONS: { value: CustomFieldType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Single Line Text", icon: <Type className="h-4 w-4" /> },
  { value: "textarea", label: "Multi-Line Text", icon: <AlignLeft className="h-4 w-4" /> },
  { value: "keyword", label: "Keyword / Tags", icon: <Tag className="h-4 w-4" /> },
  { value: "selection", label: "Dropdown Selection", icon: <ChevronDown className="h-4 w-4" /> },
  { value: "checkbox", label: "Checkbox", icon: <CheckSquare className="h-4 w-4" /> },
];

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function StepSubmissionForm({ customFields, onSave, isSaving }: StepSubmissionFormProps) {
  const [fields, setFields] = React.useState<CustomField[]>(customFields);
  const [showPreview, setShowPreview] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addField = (type: CustomFieldType) => {
    const newField: CustomField = {
      id: generateFieldId(),
      type,
      label: "",
      helpText: "",
      isMandatory: false,
      displayOrder: fields.length,
      options: type === "selection" ? ["Option 1"] : undefined,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id).map((f, i) => ({ ...f, displayOrder: i })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);

    setFields(
      arrayMove(fields, oldIndex, newIndex).map((f, i) => ({
        ...f,
        displayOrder: i,
      })),
    );
  };

  const handleSave = () => {
    onSave(fields);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Submission Form Fields</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? "Edit" : "Preview"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showPreview ? (
            <FormPreview fields={fields} />
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <SortableFieldEditor
                        key={field.id}
                        field={field}
                        allFields={fields}
                        onUpdate={(updates) => updateField(field.id, updates)}
                        onRemove={() => removeField(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {fields.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    No custom fields yet. Add fields to build your submission form.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-gray-500">Add Field</p>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addField(opt.value)}
                    >
                      {opt.icon}
                      <span className="ml-1.5">{opt.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Step 2"}
        </Button>
      </div>
    </div>
  );
}

function SortableFieldEditor({
  field,
  allFields,
  onUpdate,
  onRemove,
}: {
  field: CustomField;
  allFields: CustomField[];
  onUpdate: (updates: Partial<CustomField>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [showCondition, setShowCondition] = React.useState(!!field.visibilityCondition);
  const otherFields = allFields.filter((f) => f.id !== field.id && f.label);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4",
        isDragging && "shadow-lg ring-2 ring-primary-200",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 cursor-grab text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {FIELD_TYPE_OPTIONS.find((o) => o.value === field.type)?.label ?? field.type}
            </span>
            <div className="flex-1" />
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={field.isMandatory}
                onChange={(e) => onUpdate({ isMandatory: e.target.checked })}
                className="rounded border-gray-300"
              />
              Required
            </label>
            <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Field label"
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Help Text</Label>
              <Input
                value={field.helpText}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                placeholder="Optional help text"
                maxLength={500}
              />
            </div>
          </div>

          {field.type === "selection" && (
            <SelectionOptions
              options={field.options ?? []}
              onChange={(options) => onUpdate({ options })}
            />
          )}

          {otherFields.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowCondition(!showCondition);
                  if (showCondition) {
                    onUpdate({ visibilityCondition: null });
                  }
                }}
                className="text-xs text-primary-600 hover:underline"
              >
                {showCondition ? "Remove visibility condition" : "Add visibility condition"}
              </button>

              {showCondition && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-gray-50 p-2 text-xs">
                  <span>Show when</span>
                  <select
                    value={field.visibilityCondition?.fieldId ?? ""}
                    onChange={(e) =>
                      onUpdate({
                        visibilityCondition: {
                          fieldId: e.target.value,
                          operator: field.visibilityCondition?.operator ?? "equals",
                          value: field.visibilityCondition?.value ?? "",
                        },
                      })
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value="">Select field...</option>
                    {otherFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={field.visibilityCondition?.operator ?? "equals"}
                    onChange={(e) =>
                      onUpdate({
                        visibilityCondition: {
                          fieldId: field.visibilityCondition?.fieldId ?? "",
                          operator: e.target.value as "equals" | "notEquals",
                          value: field.visibilityCondition?.value ?? "",
                        },
                      })
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    <option value="equals">equals</option>
                    <option value="notEquals">does not equal</option>
                  </select>
                  <Input
                    value={field.visibilityCondition?.value ?? ""}
                    onChange={(e) =>
                      onUpdate({
                        visibilityCondition: {
                          fieldId: field.visibilityCondition?.fieldId ?? "",
                          operator: field.visibilityCondition?.operator ?? "equals",
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="Value"
                    className="h-7 w-32 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectionOptions({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const addOption = () => {
    onChange([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    onChange(updated);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Options</Label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={opt}
            onChange={(e) => updateOption(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
            className="h-8 text-xs"
            maxLength={100}
          />
          {options.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeOption(idx)}
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="mr-1 h-3 w-3" />
        Add Option
      </Button>
    </div>
  );
}

function FormPreview({ fields }: { fields: CustomField[] }) {
  if (fields.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No fields to preview.</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6">
      <h3 className="text-sm font-medium text-gray-700">Form Preview</h3>
      {fields
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((field) => (
          <div key={field.id} className="space-y-1">
            <Label className="text-sm">
              {field.label || "Untitled Field"}
              {field.isMandatory && <span className="ml-1 text-red-500">*</span>}
            </Label>
            {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}

            {field.type === "text" && (
              <Input disabled placeholder="Text input" className="bg-white" />
            )}
            {field.type === "textarea" && (
              <Textarea disabled placeholder="Multi-line input" rows={3} className="bg-white" />
            )}
            {field.type === "keyword" && (
              <Input
                disabled
                placeholder="Enter keywords separated by commas"
                className="bg-white"
              />
            )}
            {field.type === "selection" && (
              <select
                disabled
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400"
              >
                <option>Select an option...</option>
                {field.options?.map((opt, i) => (
                  <option key={i}>{opt}</option>
                ))}
              </select>
            )}
            {field.type === "checkbox" && (
              <label className="flex items-center gap-2 text-sm text-gray-500">
                <input type="checkbox" disabled className="rounded border-gray-300" />
                {field.label || "Checkbox"}
              </label>
            )}
          </div>
        ))}
    </div>
  );
}
