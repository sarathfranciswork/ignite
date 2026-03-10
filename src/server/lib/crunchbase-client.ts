import { z } from "zod";
import { logger } from "./logger";
import { getCrunchbaseApiKey, getEnv } from "./env";
import type {
  CrunchbaseSearchResult,
  CrunchbaseOrgDetail,
} from "@/types/partner";

// ============================================================
// Crunchbase API v4 Response Schemas
// ============================================================

const CrunchbaseEntitySchema = z.object({
  uuid: z.string(),
  properties: z.record(z.unknown()),
});

const CrunchbaseSearchResponseSchema = z.object({
  count: z.number(),
  entities: z.array(CrunchbaseEntitySchema),
});

const CrunchbaseEntityResponseSchema = z.object({
  properties: z.record(z.unknown()),
  cards: z.record(z.unknown()).optional(),
});

// ============================================================
// Error Types
// ============================================================

export class CrunchbaseApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "CrunchbaseApiError";
  }
}

export class CrunchbaseRateLimitError extends CrunchbaseApiError {
  constructor(public readonly retryAfterMs: number) {
    super("Crunchbase API rate limit exceeded", 429);
    this.name = "CrunchbaseRateLimitError";
  }
}

export class CrunchbaseNotConfiguredError extends Error {
  constructor() {
    super("Crunchbase API key is not configured");
    this.name = "CrunchbaseNotConfiguredError";
  }
}

// ============================================================
// Client
// ============================================================

interface FetchFunction {
  (url: string, init?: RequestInit): Promise<Response>;
}

export interface CrunchbaseClientConfig {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: FetchFunction;
}

export class CrunchbaseClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFunction;

  constructor(config?: CrunchbaseClientConfig) {
    this.apiKey = config?.apiKey ?? getCrunchbaseApiKey();
    this.baseUrl = config?.baseUrl ?? getEnv().CRUNCHBASE_API_BASE_URL;
    this.fetchFn = config?.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    options?: { method?: string; body?: unknown },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = options?.method ?? "GET";

    logger.info("Crunchbase API request", { method, path });

    const headers: Record<string, string> = {
      "X-cb-user-key": this.apiKey,
      "Content-Type": "application/json",
    };

    const response = await this.fetchFn(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
      throw new CrunchbaseRateLimitError(retryMs);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error("Crunchbase API error", {
        status: response.status,
        path,
        body: body.slice(0, 500),
      });
      throw new CrunchbaseApiError(
        `Crunchbase API returned ${response.status}`,
        response.status,
        body,
      );
    }

    const json: unknown = await response.json();
    return schema.parse(json);
  }

  async searchOrganizations(query: string): Promise<CrunchbaseSearchResult[]> {
    const data = await this.request(
      "/searches/organizations",
      CrunchbaseSearchResponseSchema,
      {
        method: "POST",
        body: {
          field_ids: [
            "identifier",
            "short_description",
            "image_url",
            "website_url",
            "location_identifiers",
            "founded_on",
            "num_employees_enum",
            "last_funding_type",
            "funding_total",
            "category_groups",
          ],
          query: query,
          limit: 25,
        },
      },
    );

    return data.entities.map((entity) => mapSearchResult(entity));
  }

  async getOrganization(permalink: string): Promise<CrunchbaseOrgDetail> {
    const data = await this.request(
      `/entities/organizations/${encodeURIComponent(permalink)}?card_ids=founders,raised_funding_rounds,press_references`,
      CrunchbaseEntityResponseSchema,
    );

    return mapOrgDetail(permalink, data);
  }

  async getOrganizationForEnrichment(
    permalink: string,
  ): Promise<CrunchbaseOrgDetail> {
    return this.getOrganization(permalink);
  }
}

// ============================================================
// Mapping Functions (Crunchbase API → Internal Types)
// ============================================================

function mapSearchResult(entity: {
  uuid: string;
  properties: Record<string, unknown>;
}): CrunchbaseSearchResult {
  const props = entity.properties;
  const identifier = props.identifier as
    | { permalink?: string; value?: string }
    | undefined;

  return {
    uuid: entity.uuid,
    permalink: identifier?.permalink ?? entity.uuid,
    name: (identifier?.value as string) ?? (props.name as string) ?? "Unknown",
    shortDescription: asStringOrNull(props.short_description),
    logoUrl: asStringOrNull(props.image_url),
    websiteUrl: asStringOrNull(props.website_url),
    industry: extractIndustry(props.category_groups),
    location: extractLocation(props.location_identifiers),
    foundedYear: extractFoundedYear(props.founded_on),
    employeeCount: asStringOrNull(props.num_employees_enum),
    fundingStage: asStringOrNull(props.last_funding_type),
    fundingTotal: formatFunding(props.funding_total),
  };
}

function mapOrgDetail(
  permalink: string,
  data: {
    properties: Record<string, unknown>;
    cards?: Record<string, unknown>;
  },
): CrunchbaseOrgDetail {
  const props = data.properties;
  const cards = data.cards ?? {};

  const identifier = props.identifier as
    | { permalink?: string; value?: string }
    | undefined;

  return {
    uuid: (props.uuid as string) ?? permalink,
    permalink: identifier?.permalink ?? permalink,
    name: (identifier?.value as string) ?? (props.name as string) ?? "Unknown",
    shortDescription: asStringOrNull(props.short_description),
    logoUrl: asStringOrNull(props.image_url),
    websiteUrl: asStringOrNull(props.website_url),
    industry: extractIndustry(props.category_groups),
    location: extractLocation(props.location_identifiers),
    foundedYear: extractFoundedYear(props.founded_on),
    employeeCount: asStringOrNull(props.num_employees_enum),
    fundingStage: asStringOrNull(props.last_funding_type),
    fundingTotal: formatFunding(props.funding_total),
    managementTeam: extractManagementTeam(cards.founders),
    fundingRounds: extractFundingRounds(cards.raised_funding_rounds),
    newsItems: extractNewsItems(cards.press_references),
    categories: extractCategories(props.category_groups),
  };
}

// ============================================================
// Field Extraction Helpers
// ============================================================

function asStringOrNull(val: unknown): string | null {
  if (typeof val === "string") return val;
  return null;
}

function extractIndustry(categoryGroups: unknown): string | null {
  if (!Array.isArray(categoryGroups)) return null;
  const first = categoryGroups[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "value" in first) {
    return String((first as { value: unknown }).value);
  }
  return null;
}

function extractLocation(locationIdentifiers: unknown): string | null {
  if (!Array.isArray(locationIdentifiers)) return null;
  const parts = locationIdentifiers
    .map((loc) => {
      if (typeof loc === "string") return loc;
      if (loc && typeof loc === "object" && "value" in loc) {
        return String((loc as { value: unknown }).value);
      }
      return null;
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function extractFoundedYear(foundedOn: unknown): number | null {
  if (typeof foundedOn === "string" && foundedOn.length >= 4) {
    const year = parseInt(foundedOn.slice(0, 4), 10);
    return isNaN(year) ? null : year;
  }
  if (typeof foundedOn === "number") return foundedOn;
  return null;
}

function formatFunding(total: unknown): string | null {
  if (typeof total === "number") {
    if (total >= 1e9) return `$${(total / 1e9).toFixed(1)}B`;
    if (total >= 1e6) return `$${(total / 1e6).toFixed(1)}M`;
    if (total >= 1e3) return `$${(total / 1e3).toFixed(0)}K`;
    return `$${total}`;
  }
  if (typeof total === "object" && total !== null) {
    const obj = total as { value?: number; currency?: string };
    if (typeof obj.value === "number") return formatFunding(obj.value);
  }
  if (typeof total === "string") return total;
  return null;
}

function extractManagementTeam(
  founders: unknown,
): CrunchbaseOrgDetail["managementTeam"] {
  if (!founders || typeof founders !== "object") return null;
  const items = Array.isArray(founders) ? founders : [];
  if (items.length === 0) return null;

  return items.map((item: Record<string, unknown>) => ({
    name:
      asStringOrNull(
        (item.identifier as { value?: string })?.value ?? item.name,
      ) ?? "Unknown",
    title: asStringOrNull(item.title),
    linkedinUrl: asStringOrNull(item.linkedin),
  }));
}

function extractFundingRounds(
  rounds: unknown,
): CrunchbaseOrgDetail["fundingRounds"] {
  if (!Array.isArray(rounds)) return null;
  if (rounds.length === 0) return null;

  return rounds.map((round: Record<string, unknown>) => ({
    roundType: asStringOrNull(round.investment_type) ?? "Unknown",
    amount: formatFunding(round.money_raised),
    date: asStringOrNull(round.announced_on),
    investors: Array.isArray(round.investor_identifiers)
      ? round.investor_identifiers.map((inv: unknown) =>
          typeof inv === "object" && inv !== null && "value" in inv
            ? String((inv as { value: unknown }).value)
            : String(inv),
        )
      : null,
  }));
}

function extractNewsItems(newsRefs: unknown): CrunchbaseOrgDetail["newsItems"] {
  if (!Array.isArray(newsRefs)) return null;
  if (newsRefs.length === 0) return null;

  return newsRefs.slice(0, 10).map((item: Record<string, unknown>) => ({
    title: asStringOrNull(item.title) ?? "Untitled",
    url: asStringOrNull(item.url),
    date: asStringOrNull(item.posted_on),
  }));
}

function extractCategories(categoryGroups: unknown): string[] | null {
  if (!Array.isArray(categoryGroups)) return null;
  return categoryGroups
    .map((cat) => {
      if (typeof cat === "string") return cat;
      if (cat && typeof cat === "object" && "value" in cat) {
        return String((cat as { value: unknown }).value);
      }
      return null;
    })
    .filter((v): v is string => v !== null);
}
