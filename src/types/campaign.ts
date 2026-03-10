export enum CampaignStatus {
  DRAFT = "DRAFT",
  SEEDING = "SEEDING",
  SUBMISSION = "SUBMISSION",
  DISCUSSION_VOTING = "DISCUSSION_VOTING",
  EVALUATION = "EVALUATION",
  CLOSED = "CLOSED",
}

export enum SubmissionType {
  CALL_FOR_IDEAS = "CALL_FOR_IDEAS",
  CALL_FOR_PROPOSALS = "CALL_FOR_PROPOSALS",
  CALL_FOR_GENERIC = "CALL_FOR_GENERIC",
}

export enum SetupType {
  SIMPLE = "SIMPLE",
  ADVANCED = "ADVANCED",
}

export enum AudienceType {
  ALL_INTERNAL = "ALL_INTERNAL",
  SELECTED_INTERNAL = "SELECTED_INTERNAL",
  ALL_EXTERNAL = "ALL_EXTERNAL",
  SELECTED_EXTERNAL = "SELECTED_EXTERNAL",
  MIXED = "MIXED",
}

export enum CustomFieldType {
  TEXT = "TEXT",
  KEYWORD = "KEYWORD",
  SELECTION = "SELECTION",
  CHECKBOX = "CHECKBOX",
  NUMBER = "NUMBER",
}

export interface VisibilityCondition {
  dependsOnFieldId: string;
  operator: "equals" | "not_equals" | "contains";
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
  isMultiLine?: boolean;
  isMultiSelect?: boolean;
  visibilityCondition?: VisibilityCondition;
}

export interface CampaignAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface SponsorUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface CampaignWizardData {
  // Step 1: Description
  title: string;
  bannerUrl: string;
  bannerFile?: File;
  submissionCloseDate: string;
  votingCloseDate: string;
  sponsors: SponsorUser[];
  teaser: string;
  description: string;
  videoUrl: string;
  attachments: CampaignAttachment[];
  tags: string[];
  callToActionText: string;
  hasSupportSection: boolean;
  supportContactName: string;
  supportContactEmail: string;

  // Step 2: Submission Form
  campaignGuidance: string;
  customFields: CustomField[];
  defaultIdeaImageUrl: string;
}

export const WIZARD_STEPS = [
  { id: 1, label: "Description", key: "description" },
  { id: 2, label: "Submission Form", key: "submission-form" },
  { id: 3, label: "Idea Coach", key: "idea-coach" },
  { id: 4, label: "Community", key: "community" },
  { id: 5, label: "Settings", key: "settings" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];
