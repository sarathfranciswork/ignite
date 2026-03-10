export enum EvalSessionType {
  SCORECARD = "SCORECARD",
  PAIRWISE = "PAIRWISE",
}

export enum EvalSessionStatus {
  SETUP = "SETUP",
  ACTIVE = "ACTIVE",
  EVALUATION_ENDED = "EVALUATION_ENDED",
  FINISHED = "FINISHED",
}

export enum EvalTeamType {
  INDIVIDUAL = "INDIVIDUAL",
  ONE_TEAM = "ONE_TEAM",
  PER_BUCKET = "PER_BUCKET",
  PER_OBJECT = "PER_OBJECT",
}

export enum EvalFieldType {
  SELECTION_5 = "SELECTION_5",
  SELECTION_YES_NO = "SELECTION_YES_NO",
  TEXT_FIELD = "TEXT_FIELD",
  CHECKBOX = "CHECKBOX",
  KEYWORD_SINGLE = "KEYWORD_SINGLE",
  KEYWORD_MULTI = "KEYWORD_MULTI",
}

export interface EvaluationCriterion {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  fieldType: EvalFieldType;
  isMandatory: boolean;
  sortOrder: number;
  options: CriterionOption[] | null;
  higherIsBetter: boolean;
}

export interface CriterionOption {
  value: number;
  label: string;
}

export interface EvaluationSession {
  id: string;
  name: string;
  type: EvalSessionType;
  status: EvalSessionStatus;
  evaluatorGuidance: string | null;
  dueDate: string | null;
  evaluationType: EvalTeamType;
  minComparisonsPerEvaluator: number | null;
  maxComparisonsPerEvaluator: number | null;
  campaignId: string | null;
  organizerId: string;
  criteria: EvaluationCriterion[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  closedAt: string | null;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  authorName: string;
  createdAt: string;
  imageUrl: string | null;
  commentCount: number;
  likeCount: number;
}

export interface PairwiseComparison {
  id: string;
  sessionId: string;
  evaluatorId: string;
  ideaAId: string;
  ideaBId: string;
  criterionId: string;
  score: number;
  isSkipped: boolean;
  createdAt: string;
}

export interface IdeaPair {
  ideaA: Idea;
  ideaB: Idea;
  pairIndex: number;
  totalPairs: number;
}

export interface PairwiseScore {
  criterionId: string;
  score: number; // -1 (A wins) to 1 (B wins), 0 = tie
}

export interface PairwiseSubmission {
  sessionId: string;
  ideaAId: string;
  ideaBId: string;
  scores: PairwiseScore[];
}

export interface EvaluationProgress {
  completedPairs: number;
  totalPairs: number;
  skippedPairs: number;
  percentComplete: number;
}
