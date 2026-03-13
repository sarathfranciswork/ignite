export interface ExternalIssueInput {
  title: string;
  description: string;
  fields: Record<string, unknown>;
}

export interface ExternalIssueResult {
  externalId: string;
  externalUrl: string;
  status: string;
}

export interface ExternalStatusUpdate {
  externalId: string;
  status: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface ExternalProviderAdapter {
  createIssue(input: ExternalIssueInput): Promise<ExternalIssueResult>;
  updateStatus(input: ExternalStatusUpdate): Promise<void>;
  getIssue(externalId: string): Promise<ExternalIssueResult>;
  testConnection(): Promise<ConnectionTestResult>;
}
