// T263: Safe logging utilities to prevent PII leakage

/**
 * Fields that should never be logged
 */
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "creditCard",
  "ssn",
  "socialSecurityNumber",
  "bankAccount",
  "routingNumber",
]);

/**
 * Fields that should be partially masked in logs
 */
const MASKABLE_FIELDS = new Set([
  "email",
  "phone",
  "address",
  "addressLine1",
  "addressLine2",
  "postalCode",
  "ipAddress",
]);

/**
 * Mask a string value (show first/last chars, mask middle)
 */
function maskString(value: string, showChars = 2): string {
  if (value.length <= showChars * 2) {
    return "*".repeat(value.length);
  }
  return (
    value.slice(0, showChars) +
    "*".repeat(Math.max(3, value.length - showChars * 2)) +
    value.slice(-showChars)
  );
}

/**
 * Mask an email address
 */
function maskEmail(email: string): string {
  const parts = email.split("@");
  const local = parts[0];
  const domain = parts[1];
  if (!domain || !local) return maskString(email);
  const maskedLocal = maskString(local, 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * Recursively sanitize an object for logging
 * Removes sensitive fields and masks PII
 */
export function sanitizeForLog<T extends object>(
  obj: T,
  depth = 0,
  maxDepth = 5
): Record<string, unknown> {
  if (depth >= maxDepth) {
    return { _truncated: true };
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Remove sensitive fields entirely
    if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Mask PII fields
    if (MASKABLE_FIELDS.has(key) || MASKABLE_FIELDS.has(lowerKey)) {
      if (typeof value === "string" && value.length > 0) {
        sanitized[key] = lowerKey.includes("email")
          ? maskEmail(value)
          : maskString(value);
      } else if (typeof value === "string") {
        sanitized[key] = "";
      } else {
        sanitized[key] = "[MASKED]";
      }
      continue;
    }

    // Handle nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLog(value as object, depth + 1, maxDepth);
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        item && typeof item === "object"
          ? sanitizeForLog(item as object, depth + 1, maxDepth)
          : item
      );
      continue;
    }

    // Pass through other values
    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Create a safe logger that sanitizes all logged data
 */
export const safeLog = {
  info: (message: string, data?: object) => {
    if (process.env.NODE_ENV === "production" && data) {
      console.log(message, sanitizeForLog(data));
    } else if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  },

  warn: (message: string, data?: object) => {
    if (process.env.NODE_ENV === "production" && data) {
      console.warn(message, sanitizeForLog(data));
    } else if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  },

  error: (message: string, error?: Error | object) => {
    if (error instanceof Error) {
      // Log error with sanitized message (stack trace may contain PII in dev)
      console.error(message, {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
      });
    } else if (error && process.env.NODE_ENV === "production") {
      console.error(message, sanitizeForLog(error));
    } else if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  },

  debug: (message: string, data?: object) => {
    // Only log debug in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[DEBUG]", message, data);
    }
  },
};

/**
 * Sanitize an error for client response
 * Never expose internal error details to clients
 */
export function sanitizeErrorForClient(error: Error): {
  message: string;
  code?: string;
} {
  // Known safe error messages
  const safeMessages: Record<string, string> = {
    UNAUTHORIZED: "You must be logged in to access this resource",
    FORBIDDEN: "You do not have permission to access this resource",
    NOT_FOUND: "The requested resource was not found",
    VALIDATION_ERROR: "Invalid input provided",
    RATE_LIMITED: "Too many requests. Please try again later.",
  };

  // Check if it's a known error type
  const errorCode = (error as { code?: string }).code;
  if (errorCode && safeMessages[errorCode]) {
    return { message: safeMessages[errorCode], code: errorCode };
  }

  // Default generic message for production
  if (process.env.NODE_ENV === "production") {
    return { message: "An unexpected error occurred" };
  }

  // In development, include more details
  return { message: error.message };
}
