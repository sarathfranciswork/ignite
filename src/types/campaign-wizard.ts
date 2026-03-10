/** Types for Campaign Wizard custom form fields (Step 2). */

export type CustomFieldType = "text" | "textarea" | "keyword" | "selection" | "checkbox";

export interface VisibilityCondition {
  fieldId: string;
  operator: "equals" | "notEquals";
  value: string;
}

export interface CustomField {
  id: string;
  type: CustomFieldType;
  label: string;
  helpText: string;
  isMandatory: boolean;
  displayOrder: number;
  options?: string[];
  visibilityCondition?: VisibilityCondition | null;
}

export interface WizardStepDescriptionData {
  title: string;
  teaser?: string;
  description?: string;
  bannerUrl?: string | null;
  videoUrl?: string | null;
  callToAction?: string;
  supportContent?: string;
  tags?: string[];
  submissionCloseDate?: string | null;
  votingCloseDate?: string | null;
  plannedCloseDate?: string | null;
}

export interface WizardStepSubmissionFormData {
  customFields: CustomField[];
}

export const WIZARD_STEPS = [
  { id: 1, label: "Description", description: "Campaign content & timeline" },
  { id: 2, label: "Submission Form", description: "Custom form fields" },
  { id: 3, label: "Audience", description: "Target participants", locked: true },
  { id: 4, label: "Evaluation", description: "Scoring criteria", locked: true },
  { id: 5, label: "Settings", description: "Advanced options", locked: true },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];
