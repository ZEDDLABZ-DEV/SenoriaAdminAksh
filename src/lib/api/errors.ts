import type { BookingConflict, BookingWarning } from "@/lib/api/types";

export const SCHEDULE_WARNING_CODE = "SCHEDULE_WARNING";

export class ApiError extends Error {
  status: number;
  code?: string;
  fields: Record<string, string>;
  /** Double-booked visits returned with a 422 on create/edit visit flows. */
  conflicts: BookingConflict[];
  /** Soft availability warnings returned with a 409 SCHEDULE_WARNING. */
  warnings: BookingWarning[];

  constructor(
    status: number,
    message: string,
    code?: string,
    fields: Record<string, string> = {},
    extras: { conflicts?: BookingConflict[]; warnings?: BookingWarning[] } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.conflicts = extras.conflicts ?? [];
    this.warnings = extras.warnings ?? [];
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeFields(value: unknown): Record<string, string> | null {
  const record = asRecord(value);
  if (!record) return null;
  const fields: Record<string, string> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (Array.isArray(raw)) fields[key] = raw.map((item) => String(item)).join(" ");
    else if (raw != null) fields[key] = String(raw);
  }
  return fields;
}

export function parseBookingConflicts(value: unknown): BookingConflict[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    return [
      {
        date: text(record.date),
        startTime: text(record.startTime),
        endTime: text(record.endTime),
        appointmentId: text(record.appointmentId),
        clientName: text(record.clientName),
        existingStartTime: text(record.existingStartTime),
        existingEndTime: text(record.existingEndTime),
      },
    ];
  });
}

export function parseBookingWarnings(value: unknown): BookingWarning[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    return [
      {
        type: text(record.type),
        date: text(record.date),
        startTime: text(record.startTime),
        endTime: text(record.endTime),
        reason: nonEmptyString(record.reason),
      },
    ];
  });
}

function fallbackMessage(status: number): string {
  if (status === 400) return "The request was rejected.";
  if (status === 401) return "Your session has ended. Sign in again.";
  if (status === 403) return "You are not allowed to perform this action.";
  if (status === 404) return "Not found.";
  if (status >= 500) return "The server is unavailable. Try again shortly.";
  return "Request failed";
}

export function readError(body: unknown, status: number): ApiError {
  const root = asRecord(body);
  const nested = asRecord(root?.error);
  const message = nonEmptyString(nested?.message) ?? nonEmptyString(root?.message) ?? fallbackMessage(status);
  const code = nonEmptyString(nested?.code) ?? nonEmptyString(root?.code) ?? undefined;
  const fields =
    normalizeFields(nested?.fields) ??
    normalizeFields(root?.fields) ??
    normalizeFields(root?.errors) ??
    {};
  const conflicts = parseBookingConflicts(root?.conflicts ?? nested?.conflicts);
  const warnings = parseBookingWarnings(root?.warnings ?? nested?.warnings);
  return new ApiError(status, message, code, fields, { conflicts, warnings });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") {
    return "The request timed out. Try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fields : {};
}

/** A 422 that names the caregiver's clashing visits. */
export function isBookingConflictError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 422 && error.conflicts.length > 0;
}

/** A 409 asking the admin to confirm booking outside hours or during time off. */
export function isScheduleWarningError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409 && error.code === SCHEDULE_WARNING_CODE;
}
