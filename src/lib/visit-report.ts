import { ApiError, errorMessage } from "@/lib/api/errors";
import type { VisitReportPeriod, VisitReportRow, VisitReportStatusFilter } from "@/lib/api/types";
import { formatWeekdayDate, fullName, humanizeCode, todayInputValue } from "@/lib/format";

export const VISIT_REPORT_TIME_ZONE = "America/Vancouver";
export const VISIT_REPORT_PAGE_SIZE = 20;
export const VISIT_REPORT_MAX_RANGE_DAYS = 366;

export const VISIT_REPORT_HEADERS = {
  "X-Timezone": VISIT_REPORT_TIME_ZONE,
} as const;

export interface VisitReportRequest {
  period: VisitReportPeriod;
  date: string;
  from: string;
  to: string;
  caregiverId: string;
  clientId: string;
  status: VisitReportStatusFilter;
  page: number;
}

export const PERIOD_OPTIONS: Array<{ value: VisitReportPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export const STATUS_OPTIONS: Array<{ value: VisitReportStatusFilter; label: string }> = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export function calendarDateInTimeZone(timeZone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    return todayInputValue(now);
  }
  return todayInputValue(now);
}

export function reportToday(now = new Date()): string {
  return calendarDateInTimeZone(VISIT_REPORT_TIME_ZONE, now);
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function inclusiveDayCount(from: string, to: string): number | null {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return null;
  const ms =
    Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day);
  return Math.round(ms / 86_400_000) + 1;
}

export function reportFilterMessage(input: Pick<VisitReportRequest, "period" | "date" | "from" | "to">): string {
  if (input.period === "custom") {
    if (!parseIsoDate(input.from) || !parseIsoDate(input.to)) return "Choose a start and end date.";
    const days = inclusiveDayCount(input.from, input.to);
    if (days == null) return "Choose a start and end date.";
    if (days < 1) return "The end date must be on or after the start date.";
    if (days > VISIT_REPORT_MAX_RANGE_DAYS) return "Choose a range of 366 days or fewer.";
    return "";
  }
  if (!parseIsoDate(input.date)) return "Choose a date.";
  return "";
}

export function visitReportQuery(
  input: VisitReportRequest,
  mode: "list" | "export",
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    period: input.period,
    status: input.status,
  };
  if (input.period === "custom") {
    query.from = input.from;
    query.to = input.to;
  } else {
    query.date = input.date;
  }
  if (input.caregiverId) query.caregiverId = input.caregiverId;
  if (input.clientId) query.clientId = input.clientId;
  if (mode === "list") {
    query.page = input.page;
    query.pageSize = VISIT_REPORT_PAGE_SIZE;
  }
  return query;
}

export function reportRequestError(error: unknown): string {
  if (!(error instanceof ApiError)) return errorMessage(error);
  const range = error.fields.range?.trim();
  if (error.status === 422 && range) {
    const message = error.message.trim();
    if (message && message !== "Validation failed" && message !== "Request failed") {
      return message.toLowerCase().includes("narrow") ? message : `${message} Narrow the filters and try again.`;
    }
    return `Narrow the filters and try again. ${range}`;
  }
  if (error.message.trim() === "Validation failed") {
    const details = Object.values(error.fields)
      .map((value) => value.trim())
      .filter(Boolean);
    if (details.length > 0) return details.join(" ");
  }
  return error.message || errorMessage(error);
}

export function formatHours(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

export function formatCompletionRate(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const percent = Math.round(value * 1000) / 10;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

export function formatReportTimestamp(value: string | null | undefined, timeZone: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const zone = timeZone.trim() || VISIT_REPORT_TIME_ZONE;
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
  };
  try {
    return new Intl.DateTimeFormat("en-GB", options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: VISIT_REPORT_TIME_ZONE }).format(date);
  }
}

export function formatReportWindow(from: string, to: string): string {
  if (!from && !to) return "—";
  if (from === to || !to) return formatWeekdayDate(from);
  if (!from) return formatWeekdayDate(to);
  return `${formatWeekdayDate(from)} – ${formatWeekdayDate(to)}`;
}

export function visitDayStatusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "pending") return "Pending";
  if (status === "missed") return "Missed";
  if (status === "cancelled") return "Cancelled";
  return humanizeCode(status);
}

export function visitDayStatusTone(status: string): "good" | "warn" | "bad" | "neutral" {
  if (status === "completed") return "good";
  if (status === "missed") return "warn";
  if (status === "cancelled") return "bad";
  return "neutral";
}

export function arrivalLabel(arrival: VisitReportRow["arrival"]): string {
  if (arrival.status === "late") {
    if (arrival.minutesLate == null) return "Late";
    return `Late by ${formatMinuteCount(arrival.minutesLate)}`;
  }
  if (arrival.status === "on_time") {
    if ((arrival.minutesEarly ?? 0) > 0) return `${formatMinuteCount(arrival.minutesEarly ?? 0)} early`;
    return "On time";
  }
  if (arrival.status === "no_check_in") return "No check-in";
  return humanizeCode(arrival.status);
}

function formatMinuteCount(value: number): string {
  const minutes = Math.round(value);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function itemTypeLabel(itemType: string): string {
  if (itemType === "task") return "Task";
  if (itemType === "medication") return "Medication";
  if (itemType === "diet") return "Diet";
  if (itemType === "hygiene") return "Hygiene";
  return humanizeCode(itemType);
}

export function formatVisitLocation(row: Pick<VisitReportRow, "locationStreet" | "locationCity" | "locationState" | "locationZipCode">): string {
  return [row.locationStreet, row.locationCity, row.locationState, row.locationZipCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function visitRowKey(row: VisitReportRow, index: number): string {
  if (row.dailyVisitId) return row.dailyVisitId;
  return `${row.appointmentId}:${row.serviceDate}:${index}`;
}

export function sameVisitRow(left: VisitReportRow, right: VisitReportRow): boolean {
  if (left.dailyVisitId && right.dailyVisitId) return left.dailyVisitId === right.dailyVisitId;
  return left.appointmentId === right.appointmentId && left.serviceDate === right.serviceDate;
}

export function personLabel(person: { firstName: string; lastName: string } | null | undefined, fallback = "—"): string {
  if (!person) return fallback;
  return fullName(person.firstName, person.lastName, fallback);
}

export function validateAdjustedHours(value: string): { hours: number } | { error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { error: "Enter the corrected hours." };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { error: "Enter a number from 0 to 24 with at most 2 decimal places." };
  }
  const hours = Number(trimmed);
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
    return { error: "Enter a number from 0 to 24 with at most 2 decimal places." };
  }
  return { hours };
}

export function validateCorrectionReason(value: string): { reason: string } | { error: string } {
  const reason = value.trim();
  if (!reason) return { error: "Enter a reason." };
  if (reason.length > 500) return { error: "Reason must be 500 characters or fewer." };
  return { reason };
}

export function periodDateHint(period: VisitReportPeriod): string {
  if (period === "weekly") return "Monday through Sunday of the week containing this date.";
  if (period === "monthly") return "The calendar month of this date.";
  return "";
}
