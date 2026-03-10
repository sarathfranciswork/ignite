import { Queue } from "bullmq";
import { getRedisConnection } from "../lib/redis";

export const EMAIL_QUEUE_NAME = "email";
export const DIGEST_QUEUE_NAME = "digest";

let emailQueue: Queue | undefined;
let digestQueue: Queue | undefined;

export function getEmailQueue(): Queue {
  if (emailQueue) return emailQueue;
  emailQueue = new Queue(EMAIL_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
  return emailQueue;
}

export function getDigestQueue(): Queue {
  if (digestQueue) return digestQueue;
  digestQueue = new Queue(DIGEST_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
  return digestQueue;
}
