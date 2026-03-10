export interface EventPayload {
  actor: { id: string; email: string };
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface EventMap {
  "user.registered": EventPayload & {
    user: { id: string; email: string; name: string | null };
  };
  "user.login": EventPayload;
  "orgUnit.created": EventPayload & {
    orgUnit: { id: string; name: string };
  };
  "orgUnit.updated": EventPayload & {
    orgUnit: { id: string; name: string };
  };
  "userGroup.created": EventPayload & {
    userGroup: { id: string; name: string; orgUnitId: string };
  };
  "userGroup.memberAdded": EventPayload & {
    userGroup: { id: string; name: string };
    member: { userId: string };
  };
  "userGroup.memberRemoved": EventPayload & {
    userGroup: { id: string; name: string };
    member: { userId: string };
  };
}

export type EventName = keyof EventMap;
