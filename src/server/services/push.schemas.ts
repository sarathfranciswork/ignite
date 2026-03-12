import { z } from "zod";

export const pushSubscriptionSubscribeInput = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export const pushSubscriptionUnsubscribeInput = z.object({
  endpoint: z.string().url(),
});

export const pushNotificationSendInput = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  url: z.string().optional(),
  tag: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export type PushSubscriptionSubscribeInput = z.infer<typeof pushSubscriptionSubscribeInput>;
export type PushSubscriptionUnsubscribeInput = z.infer<typeof pushSubscriptionUnsubscribeInput>;
export type PushNotificationSendInput = z.infer<typeof pushNotificationSendInput>;
