import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const writers: Record<LogLevel, (...data: unknown[]) => void> = {
  debug: (...data) => console.debug(...data),
  info: (...data) => console.info(...data),
  warn: (...data) => console.warn(...data),
  error: (...data) => console.error(...data),
};

function safeStringify(meta: LogMeta): string {
  try {
    return JSON.stringify(meta, (_key, value) =>
      value instanceof Error ? { name: value.name, message: value.message } : value,
    );
  } catch {
    return "[unserializable meta]";
  }
}

// Fire-and-forget alert to an external sink (e.g. a Discord webhook).
// Server-only and env-gated: a no-op unless ALERT_WEBHOOK_URL is set, so it
// adds no behavior until explicitly configured. Never throws, never blocks.
function sendAlert(text: string): void {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url || typeof window !== "undefined") return;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: text.slice(0, 1900) }),
  }).catch(() => {
    // alerting must never affect the request path
  });
}

// Only .critical() forwards to Sentry (not every .error() call) — those are
// already-caught, already-handled errors sprinkled across ~90 routes, and
// sending all of them would blow through Sentry's free-tier event quota in
// hours. .critical() is reserved for security/economy anomalies a human should
// see promptly, so it stays naturally rate-limited.
function sendToSentry(prefix: string, message: string, meta?: LogMeta): void {
  const error = meta?.error;
  Sentry.withScope((scope) => {
    if (meta) scope.setContext("meta", meta as Record<string, unknown>);
    if (error instanceof Error) {
      Sentry.captureException(error, { extra: { message: `${prefix} ${message}` } });
    } else {
      Sentry.captureMessage(`${prefix} ${message}`, "fatal");
    }
  });
}

export function createLogger(moduleName: string) {
  const prefix = `[${moduleName}]`;

  function write(level: LogLevel, message: string, meta?: LogMeta) {
    if (level === "debug" && process.env.NODE_ENV === "production") return;
    if (meta) {
      writers[level](`${prefix} ${message}`, meta);
      return;
    }
    writers[level](`${prefix} ${message}`);
  }

  return {
    debug: (message: string, meta?: LogMeta) => write("debug", message, meta),
    info: (message: string, meta?: LogMeta) => write("info", message, meta),
    warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
    error: (message: string, meta?: LogMeta) => write("error", message, meta),
    // Alert-worthy: logs at error level, forwards to Sentry, AND forwards to
    // the Discord webhook. Use for security/economy anomalies that a human
    // should see promptly.
    critical: (message: string, meta?: LogMeta) => {
      write("error", message, meta);
      sendToSentry(prefix, message, meta);
      sendAlert(`🚨 ${prefix} ${message}${meta ? ` ${safeStringify(meta)}` : ""}`);
    },
  };
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
