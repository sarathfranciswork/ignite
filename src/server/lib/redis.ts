import IORedis from "ioredis";
import { getEnv } from "./env";

let connection: IORedis | undefined;

export function getRedisConnection(): IORedis {
  if (connection) return connection;
  const env = getEnv();
  connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  return connection;
}
