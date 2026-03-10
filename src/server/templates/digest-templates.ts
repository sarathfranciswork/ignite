import Handlebars from "handlebars";

interface DigestGroup {
  label: string;
  count: number;
  items: Array<{
    title: string;
    body?: string;
    link?: string;
  }>;
}

export interface DigestData {
  userName: string;
  frequency: "daily" | "weekly";
  period: string;
  groups: DigestGroup[];
  totalCount: number;
}

const DIGEST_BODY = `<h2>{{greeting}}, {{userName}}</h2>
<p>Here's your {{frequency}} digest for {{period}}.</p>
<p>You have <strong>{{totalCount}}</strong> notification{{#if isPlural}}s{{/if}} to catch up on.</p>

{{#each groups}}
<div class="digest-section">
  <h3>{{this.label}} <span class="badge">{{this.count}}</span></h3>
  {{#each this.items}}
  <div class="digest-item">
    {{#if this.link}}<a href="{{this.link}}">{{this.title}}</a>{{else}}{{this.title}}{{/if}}
    {{#if this.body}}<br><span style="color: #888;">{{this.body}}</span>{{/if}}
  </div>
  {{/each}}
</div>
{{/each}}

<p style="margin-top: 24px;"><a href="{{appUrl}}/notifications" class="btn">View All Notifications</a></p>`;

const compiledDigest = Handlebars.compile(DIGEST_BODY);

export function renderDigestSubject(data: DigestData): string {
  const prefix = data.frequency === "daily" ? "Daily" : "Weekly";
  return `${prefix} Digest: ${data.totalCount} notification${data.totalCount === 1 ? "" : "s"} — ${data.period}`;
}

export function renderDigestBody(
  data: DigestData & { appUrl: string },
): string {
  const greeting =
    data.frequency === "daily" ? "Good morning" : "Here's your weekly summary";
  return compiledDigest({
    ...data,
    greeting,
    isPlural: data.totalCount !== 1,
  });
}
