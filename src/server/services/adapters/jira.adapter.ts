import { logger } from "@/server/lib/logger";
import type {
  ExternalProviderAdapter,
  ExternalIssueInput,
  ExternalIssueResult,
  ExternalStatusUpdate,
  ConnectionTestResult,
} from "./external-provider.adapter";

const childLogger = logger.child({ adapter: "jira" });

export class JiraAdapter implements ExternalProviderAdapter {
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
      Authorization: `Basic ${Buffer.from(`api:${this.apiToken}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async createIssue(input: ExternalIssueInput): Promise<ExternalIssueResult> {
    const url = `${this.baseUrl}/rest/api/3/issue`;

    const body = {
      fields: {
        project: { key: this.projectKey },
        summary: input.title,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: input.description || "No description" }],
            },
          ],
        },
        issuetype: { name: (input.fields["issueType"] as string) ?? "Task" },
        ...this.mapCustomFields(input.fields),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      childLogger.error({ status: response.status, errorText }, "Jira create issue failed");
      throw new Error(`Jira API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { id: string; key: string; self: string };

    childLogger.info({ externalId: data.key }, "Created Jira issue");

    return {
      externalId: data.key,
      externalUrl: `${this.baseUrl}/browse/${data.key}`,
      status: "To Do",
    };
  }

  async updateStatus(input: ExternalStatusUpdate): Promise<void> {
    const transitionsUrl = `${this.baseUrl}/rest/api/3/issue/${input.externalId}/transitions`;

    const transitionsResponse = await fetch(transitionsUrl, {
      method: "GET",
      headers: this.headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!transitionsResponse.ok) {
      const errorText = await transitionsResponse.text();
      throw new Error(
        `Jira transitions fetch failed: ${transitionsResponse.status} - ${errorText}`,
      );
    }

    const transitionsData = (await transitionsResponse.json()) as {
      transitions: Array<{ id: string; name: string }>;
    };

    const transition = transitionsData.transitions.find(
      (t) => t.name.toLowerCase() === input.status.toLowerCase(),
    );

    if (!transition) {
      throw new Error(
        `No transition found for status "${input.status}". Available: ${transitionsData.transitions.map((t) => t.name).join(", ")}`,
      );
    }

    const response = await fetch(transitionsUrl, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ transition: { id: transition.id } }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira transition failed: ${response.status} - ${errorText}`);
    }

    childLogger.info(
      { externalId: input.externalId, status: input.status },
      "Updated Jira issue status",
    );
  }

  async getIssue(externalId: string): Promise<ExternalIssueResult> {
    const url = `${this.baseUrl}/rest/api/3/issue/${externalId}?fields=summary,status`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira get issue failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      key: string;
      fields: { status: { name: string } };
    };

    return {
      externalId: data.key,
      externalUrl: `${this.baseUrl}/browse/${data.key}`,
      status: data.fields.status.name,
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const url = `${this.baseUrl}/rest/api/3/myself`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { success: false, message: `Authentication failed: ${response.status}` };
      }

      return { success: true, message: "Connected to Jira successfully" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      return { success: false, message };
    }
  }

  private mapCustomFields(fields: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key === "issueType") continue;
      if (key.startsWith("customfield_")) {
        mapped[key] = value;
      }
    }
    return mapped;
  }
}
