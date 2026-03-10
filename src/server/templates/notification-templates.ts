import Handlebars from "handlebars";
import { NotificationType } from "../events/types";

interface TemplateConfig {
  subject: string;
  body: string;
}

const templates: Record<string, TemplateConfig> = {
  [NotificationType.IDEA_SUBMITTED]: {
    subject: "New idea submitted: {{title}}",
    body: `<h2>New Idea Submitted</h2>
<p><strong>{{title}}</strong></p>
{{#if body}}<p>{{body}}</p>{{/if}}
{{#if link}}<p><a href="{{link}}" class="btn">View Idea</a></p>{{/if}}`,
  },

  [NotificationType.IDEA_STATUS_CHANGED]: {
    subject: "Idea status update: {{title}}",
    body: `<h2>Idea Status Changed</h2>
<p>The idea <strong>{{title}}</strong> has been updated.</p>
{{#if body}}<p>{{body}}</p>{{/if}}
{{#if link}}<p><a href="{{link}}" class="btn">View Idea</a></p>{{/if}}`,
  },

  [NotificationType.IDEA_HOT_GRADUATION]: {
    subject: "Your idea is HOT! {{title}}",
    body: `<h2>Congratulations! Your Idea is HOT!</h2>
<p>Your idea <strong>{{title}}</strong> has reached the community engagement threshold and graduated to HOT status.</p>
{{#if link}}<p><a href="{{link}}" class="btn">View Idea</a></p>{{/if}}`,
  },

  [NotificationType.COMMENT_ADDED]: {
    subject: "New comment on: {{title}}",
    body: `<h2>New Comment</h2>
<p>A new comment was added on <strong>{{title}}</strong>.</p>
{{#if body}}<p>{{body}}</p>{{/if}}
{{#if link}}<p><a href="{{link}}" class="btn">View Comment</a></p>{{/if}}`,
  },

  [NotificationType.EVALUATION_REQUESTED]: {
    subject: "Evaluation requested: {{title}}",
    body: `<h2>Evaluation Requested</h2>
<p>You have been invited to evaluate ideas in <strong>{{title}}</strong>.</p>
{{#if body}}<p>{{body}}</p>{{/if}}
{{#if link}}<p><a href="{{link}}" class="btn">Start Evaluation</a></p>{{/if}}`,
  },

  [NotificationType.EVALUATION_REMINDER]: {
    subject: "Evaluation reminder: {{title}}",
    body: `<h2>Evaluation Reminder</h2>
<p>You have pending evaluations in <strong>{{title}}</strong>. Please complete them before the deadline.</p>
{{#if link}}<p><a href="{{link}}" class="btn">Complete Evaluation</a></p>{{/if}}`,
  },

  [NotificationType.CAMPAIGN_PHASE_CHANGED]: {
    subject: "Campaign update: {{title}}",
    body: `<h2>Campaign Phase Changed</h2>
<p>The campaign <strong>{{title}}</strong> has moved to a new phase.</p>
{{#if body}}<p>{{body}}</p>{{/if}}
{{#if link}}<p><a href="{{link}}" class="btn">View Campaign</a></p>{{/if}}`,
  },

  [NotificationType.MENTION]: {
    subject: "You were mentioned in: {{title}}",
    body: `<h2>You Were Mentioned</h2>
<p>You were mentioned in <strong>{{title}}</strong>.</p>
{{#if body}}<p>{{body}}</p>{{/if}}
{{#if link}}<p><a href="{{link}}" class="btn">View</a></p>{{/if}}`,
  },

  [NotificationType.DRAFT_REMINDER]: {
    subject: "Don't forget your draft: {{title}}",
    body: `<h2>Draft Reminder</h2>
<p>You have an unfinished draft: <strong>{{title}}</strong>. Would you like to continue working on it?</p>
{{#if link}}<p><a href="{{link}}" class="btn">Continue Editing</a></p>{{/if}}`,
  },
};

const compiledSubjects = new Map<string, Handlebars.TemplateDelegate>();
const compiledBodies = new Map<string, Handlebars.TemplateDelegate>();

function getCompiledSubject(type: string): Handlebars.TemplateDelegate {
  let compiled = compiledSubjects.get(type);
  if (compiled) return compiled;

  const template = templates[type];
  if (!template) {
    compiled = Handlebars.compile("{{title}}");
  } else {
    compiled = Handlebars.compile(template.subject);
  }
  compiledSubjects.set(type, compiled);
  return compiled;
}

function getCompiledBody(type: string): Handlebars.TemplateDelegate {
  let compiled = compiledBodies.get(type);
  if (compiled) return compiled;

  const template = templates[type];
  if (!template) {
    compiled = Handlebars.compile(
      `<h2>{{title}}</h2>{{#if body}}<p>{{body}}</p>{{/if}}{{#if link}}<p><a href="{{link}}" class="btn">View</a></p>{{/if}}`,
    );
  } else {
    compiled = Handlebars.compile(template.body);
  }
  compiledBodies.set(type, compiled);
  return compiled;
}

export function renderSubject(
  type: string,
  data: Record<string, unknown>,
): string {
  return getCompiledSubject(type)(data);
}

export function renderBody(
  type: string,
  data: Record<string, unknown>,
): string {
  return getCompiledBody(type)(data);
}

export { templates };
