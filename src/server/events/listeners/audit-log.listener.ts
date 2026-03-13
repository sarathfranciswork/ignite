import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { createAuditLogEntry } from "@/server/services/audit-log.service";
import type { EventName, EventPayload } from "@/server/events/types";

const childLogger = logger.child({ service: "audit-log-listener" });

const globalForListeners = globalThis as unknown as {
  auditLogListenersRegistered: boolean | undefined;
};

function extractEntityFromEventName(eventName: string): string {
  const parts = eventName.split(".");
  return parts[0] ?? eventName;
}

function extractActionFromEventName(eventName: string): string {
  return eventName;
}

async function handleEvent(eventName: EventName, payload: EventPayload) {
  try {
    const actorEmail = payload.metadata?.actorEmail as string | undefined;

    await createAuditLogEntry({
      actorId: payload.actor,
      actorEmail,
      action: extractActionFromEventName(eventName),
      entity: extractEntityFromEventName(eventName),
      entityId: payload.entityId,
      metadata: {
        ...payload.metadata,
        eventEntity: payload.entity,
        timestamp: payload.timestamp,
      },
    });
  } catch (error) {
    childLogger.error({ error, eventName, payload }, "Failed to record audit log entry");
  }
}

const auditedEvents: EventName[] = [
  "campaign.created",
  "campaign.updated",
  "campaign.phaseChanged",
  "campaign.copied",
  "campaign.membersUpdated",
  "idea.created",
  "idea.submitted",
  "idea.updated",
  "idea.deleted",
  "idea.statusChanged",
  "idea.transitioned",
  "idea.archived",
  "idea.split",
  "idea.merged",
  "idea.confidentialityChanged",
  "comment.created",
  "comment.updated",
  "comment.deleted",
  "comment.flagged",
  "user.registered",
  "user.profileUpdated",
  "user.adminCreated",
  "user.adminUpdated",
  "user.statusChanged",
  "evaluation.sessionCreated",
  "evaluation.sessionUpdated",
  "evaluation.sessionActivated",
  "evaluation.sessionCompleted",
  "evaluation.evaluatorAssigned",
  "evaluation.evaluatorRemoved",
  "rbac.roleAssigned",
  "rbac.roleRemoved",
  "rbac.globalRoleChanged",
  "orgUnit.created",
  "orgUnit.updated",
  "orgUnit.deleted",
  "orgUnit.userAssigned",
  "orgUnit.userRemoved",
  "group.created",
  "group.updated",
  "group.deleted",
  "group.memberAdded",
  "group.memberRemoved",
  "space.created",
  "space.updated",
  "space.archived",
  "space.activated",
  "space.memberAdded",
  "space.memberRemoved",
  "channel.created",
  "channel.updated",
  "channel.archived",
  "organization.created",
  "organization.updated",
  "organization.archived",
  "organization.deleted",
  "sso.providerCreated",
  "sso.providerUpdated",
  "sso.providerDeleted",
  "sso.providerEnabled",
  "sso.providerDisabled",
  "sso.userProvisioned",
  "scim.userProvisioned",
  "scim.userDeprovisioned",
  "webhook.created",
  "webhook.updated",
  "webhook.deleted",
  "apiKey.created",
  "apiKey.revoked",
  "apiKey.deleted",
  "twoFactor.enabled",
  "twoFactor.disabled",
  "session.terminated",
  "session.allTerminated",
  "whiteLabel.updated",
  "communication.messageCreated",
  "communication.messageSent",
  "project.created",
  "project.updated",
  "project.deleted",
  "project.gateDecision",
  "concept.created",
  "concept.updated",
  "concept.deleted",
  "concept.approved",
  "concept.rejected",
];

export function registerAuditLogListeners(): void {
  if (globalForListeners.auditLogListenersRegistered) return;

  for (const eventName of auditedEvents) {
    eventBus.on(eventName, (payload) => {
      void handleEvent(eventName, payload);
    });
  }

  childLogger.info({ eventCount: auditedEvents.length }, "Audit log listeners registered");
  globalForListeners.auditLogListenersRegistered = true;
}
