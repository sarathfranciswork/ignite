type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

function write(entry: LogEntry): void {
  const output = JSON.stringify(entry);
  if (entry.level === "error") {
    process.stderr.write(output + "\n");
  } else {
    process.stdout.write(output + "\n");
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    write(createLogEntry("debug", message, meta));
  },
  info(message: string, meta?: Record<string, unknown>): void {
    write(createLogEntry("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    write(createLogEntry("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    write(createLogEntry("error", message, meta));
  },
};
