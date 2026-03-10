type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

function writeLog(entry: LogEntry): void {
  const output = JSON.stringify(entry);

  switch (entry.level) {
    case "error":
      process.stderr.write(output + "\n");
      break;
    case "warn":
      process.stderr.write(output + "\n");
      break;
    default:
      process.stdout.write(output + "\n");
      break;
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    writeLog(createLogEntry("debug", message, context)),
  info: (message: string, context?: Record<string, unknown>) =>
    writeLog(createLogEntry("info", message, context)),
  warn: (message: string, context?: Record<string, unknown>) =>
    writeLog(createLogEntry("warn", message, context)),
  error: (message: string, context?: Record<string, unknown>) =>
    writeLog(createLogEntry("error", message, context)),
};
