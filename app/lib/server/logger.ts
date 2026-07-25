type SafeContext = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, context: SafeContext = {}) {
  const entry = { level, event, ...context, timestamp: new Date().toISOString() };
  const output = process.env.NODE_ENV === "development"
    ? `[${level}] ${event} ${JSON.stringify(context)}`
    : JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);
}

export function logServerInfo(event: string, context?: SafeContext) {
  write("info", event, context);
}

export function logServerError(event: string, error: unknown, context: SafeContext = {}) {
  const safeError = error instanceof Error
    ? { errorName: error.name, ...(process.env.NODE_ENV === "development" ? { errorMessage: error.message } : {}) }
    : { errorName: "UnknownError" };
  write("error", event, { ...context, ...safeError });
}
