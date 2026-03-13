import { logger } from "@/server/lib/logger";
import type {
  ExternalProviderAdapter,
  ExternalIssueInput,
  ExternalIssueResult,
  ExternalStatusUpdate,
  ConnectionTestResult,
} from "./external-provider.adapter";

const childLogger = logger.child({ adapter: "azure-devops" });

interface AdoWorkItemResponse {
  id: number;
  fields: {
    "System.State": string;
    "System.Title": string;
  };
  _links: {
    html: { href: string };
  };
}

export class AzureDevOpsAdapter implements ExternalProviderAdapter {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly projectKey: string;

  constructor(baseUrl: string, apiToken: string, projectKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiToken = apiToken;
    this.projectKey = projectKey;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(`:${this.apiToken}`).toString("base64")}`,
      "Content-Type": "application/json-patch+json",
      Accept: "application/json",
    };
  }

  async createIssue(input: ExternalIssueInput): Promise<ExternalIssueResult> {
    const workItemType = (input.fields["workItemType"] as string) ?? "Task";
    const url = `${this.baseUrl}/${this.projectKey}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=7.1`;

    const patchDoc = [
      { op: "add", path: "/fields/System.Title", value: input.title },
      { op: "add", path: "/fields/System.Description", value: input.description || "" },
      ...this.mapCustomFields(input.fields),
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(patchDoc),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      childLogger.error({ status: response.status, errorText }, "ADO create work item failed");
      throw new Error(`Azure DevOps API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AdoWorkItemResponse;

    childLogger.info({ externalId: String(data.id) }, "Created ADO work item");

    return {
      externalId: String(data.id),
      externalUrl: data._links.html.href,
      status: data.fields["System.State"],
    };
  }

  async updateStatus(input: ExternalStatusUpdate): Promise<void> {
    const url = `${this.baseUrl}/${this.projectKey}/_apis/wit/workitems/${input.externalId}?api-version=7.1`;

    const patchDoc = [{ op: "replace", path: "/fields/System.State", value: input.status }];

    const response = await fetch(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(patchDoc),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ADO status update failed: ${response.status} - ${errorText}`);
    }

    childLogger.info(
      { externalId: input.externalId, status: input.status },
      "Updated ADO work item status",
    );
  }

  async getIssue(externalId: string): Promise<ExternalIssueResult> {
    const url = `${this.baseUrl}/${this.projectKey}/_apis/wit/workitems/${externalId}?fields=System.State,System.Title&api-version=7.1`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ADO get work item failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AdoWorkItemResponse;

    return {
      externalId: String(data.id),
      externalUrl: data._links.html.href,
      status: data.fields["System.State"],
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const url = `${this.baseUrl}/_apis/projects/${this.projectKey}?api-version=7.1`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { success: false, message: `Authentication failed: ${response.status}` };
      }

      return { success: true, message: "Connected to Azure DevOps successfully" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      return { success: false, message };
    }
  }

  private mapCustomFields(
    fields: Record<string, unknown>,
  ): Array<{ op: string; path: string; value: unknown }> {
    const patches: Array<{ op: string; path: string; value: unknown }> = [];
    for (const [key, value] of Object.entries(fields)) {
      if (key === "workItemType") continue;
      if (key.startsWith("System.") || key.startsWith("Microsoft.")) {
        patches.push({ op: "add", path: `/fields/${key}`, value });
      }
    }
    return patches;
  }
}
