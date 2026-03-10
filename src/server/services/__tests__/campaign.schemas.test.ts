import { describe, it, expect } from "vitest";
import {
  customFieldSchema,
  customFieldsArraySchema,
  visibilityConditionSchema,
  campaignUpdateInput,
} from "../campaign.schemas";

describe("visibilityConditionSchema", () => {
  it("accepts valid condition", () => {
    const result = visibilityConditionSchema.safeParse({
      fieldId: "field_1",
      operator: "equals",
      value: "yes",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid operator", () => {
    const result = visibilityConditionSchema.safeParse({
      fieldId: "field_1",
      operator: "contains",
      value: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty fieldId", () => {
    const result = visibilityConditionSchema.safeParse({
      fieldId: "",
      operator: "equals",
      value: "test",
    });
    expect(result.success).toBe(false);
  });
});

describe("customFieldSchema", () => {
  it("accepts valid text field", () => {
    const result = customFieldSchema.safeParse({
      id: "field_1",
      type: "text",
      label: "Project Name",
      helpText: "Enter your project name",
      isMandatory: true,
      displayOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid selection field with options", () => {
    const result = customFieldSchema.safeParse({
      id: "field_2",
      type: "selection",
      label: "Category",
      helpText: "",
      isMandatory: false,
      displayOrder: 1,
      options: ["Technology", "Process", "Culture"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts field with visibility condition", () => {
    const result = customFieldSchema.safeParse({
      id: "field_3",
      type: "textarea",
      label: "Details",
      helpText: "",
      isMandatory: false,
      displayOrder: 2,
      visibilityCondition: {
        fieldId: "field_2",
        operator: "equals",
        value: "Technology",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts null visibility condition", () => {
    const result = customFieldSchema.safeParse({
      id: "field_3",
      type: "checkbox",
      label: "Agree",
      helpText: "",
      isMandatory: true,
      displayOrder: 0,
      visibilityCondition: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing label", () => {
    const result = customFieldSchema.safeParse({
      id: "field_1",
      type: "text",
      label: "",
      helpText: "",
      isMandatory: false,
      displayOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid field type", () => {
    const result = customFieldSchema.safeParse({
      id: "field_1",
      type: "email",
      label: "Email",
      helpText: "",
      isMandatory: false,
      displayOrder: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects label exceeding max length", () => {
    const result = customFieldSchema.safeParse({
      id: "field_1",
      type: "text",
      label: "x".repeat(201),
      helpText: "",
      isMandatory: false,
      displayOrder: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("customFieldsArraySchema", () => {
  it("accepts empty array", () => {
    const result = customFieldsArraySchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("accepts array of valid fields", () => {
    const result = customFieldsArraySchema.safeParse([
      {
        id: "f1",
        type: "text",
        label: "Name",
        helpText: "",
        isMandatory: true,
        displayOrder: 0,
      },
      {
        id: "f2",
        type: "keyword",
        label: "Tags",
        helpText: "Enter keywords",
        isMandatory: false,
        displayOrder: 1,
      },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects array exceeding max 30 fields", () => {
    const fields = Array.from({ length: 31 }, (_, i) => ({
      id: `f${i}`,
      type: "text" as const,
      label: `Field ${i}`,
      helpText: "",
      isMandatory: false,
      displayOrder: i,
    }));
    const result = customFieldsArraySchema.safeParse(fields);
    expect(result.success).toBe(false);
  });
});

describe("campaignUpdateInput with customFields", () => {
  it("accepts update with typed custom fields", () => {
    const result = campaignUpdateInput.safeParse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      customFields: [
        {
          id: "f1",
          type: "text",
          label: "Name",
          helpText: "",
          isMandatory: true,
          displayOrder: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts update with new wizard fields", () => {
    const result = campaignUpdateInput.safeParse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      callToAction: "Submit your idea!",
      supportContent: "Contact us at support@example.com",
      tags: ["innovation", "tech"],
      setupType: "ADVANCED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid setupType", () => {
    const result = campaignUpdateInput.safeParse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      setupType: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});
