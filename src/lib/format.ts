export const NAVIGATION_PREFIX = "Navigation Instructions: ";

export const EMAIL_PATTERN = /^[\w.+-]+@([\w-]+\.)+[\w-]{2,4}$/;

export function browserTimeZoneOffset(date = new Date()): string {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const mins = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}

export function fullName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "",
): string {
  const first = (firstName ?? "").replace(/\s+/g, " ").trim();
  const last = (lastName ?? "").replace(/\s+/g, " ").trim();
  if (last && first) return `${last}, ${first}`;
  return last || first || fallback;
}

/** Turns a stored "First Last" string into "Last, First". A name that already has a comma is left in that order. */
export function listedName(value: string | null | undefined, fallback = ""): string {
  const name = (value ?? "").replace(/\s+/g, " ").trim();
  if (!name) return fallback;
  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    const surname = last.trim();
    const given = rest.join(",").trim();
    if (surname && given) return `${surname}, ${given}`;
    return name;
  }
  const parts = name.split(" ").filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
}

export function splitFullName(value: string): { firstName: string; lastName: string } {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const comma = trimmed.indexOf(",");
  if (comma >= 0) {
    return {
      lastName: trimmed.slice(0, comma).trim(),
      firstName: trimmed.slice(comma + 1).trim(),
    };
  }
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  const letters = `${(firstName ?? "").trim().charAt(0)}${(lastName ?? "").trim().charAt(0)}`.toUpperCase();
  return letters || "?";
}

export function ageFromDateOfBirth(value: string | null | undefined, today = new Date()): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  if (currentMonth < month || (currentMonth === month && currentDay < day)) age -= 1;
  if (age < 0 || age > 150) return null;
  return age;
}

export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Weekday label such as "Mon, 26 Oct 2026" for a calendar date. */
export function formatWeekdayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function dateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}

export function todayInputValue(today = new Date()): string {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDobInRange(value: string, today = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  if (year < 1900) return false;
  const date = new Date(year, Number(match[2]) - 1, Number(match[3]));
  if (date.getFullYear() !== year || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
    return false;
  }
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date.getTime() <= end.getTime();
}

/** Appointment dates stay on the UTC calendar day so a timezone does not shift the day. */
export function utcAppointmentDay(value: string | null | undefined): { label: string; ymd: string } {
  if (!value) return { label: "—", ymd: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: value, ymd: "" };
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, day)));
  return { label, ymd };
}

export function toHhmm(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?$/i.exec(value.trim());
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hours < 12) hours += 12;
  if (suffix === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function formatClock(value: string | null | undefined): string {
  const hhmm = toHhmm(value);
  if (!hhmm) return value?.trim() ? value : "—";
  return hhmm;
}

export function minutesFromHhmm(value: string): number | null {
  const hhmm = toHhmm(value);
  if (!hhmm) return null;
  const [hourText, minuteText] = hhmm.split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

export function formatLocalDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function careTypeLabel(category: string | null | undefined): string {
  const value = (category ?? "").trim();
  if (!value) return "General Care";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function serviceCategoryLabel(category: string | null | undefined): string {
  return (category ?? "").trim().toLowerCase() === "medical" ? "Medical" : "Non-medical";
}

export function humanizeCode(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type VisitStatus = "scheduled" | "completed" | "cancelled";

export function collapseVisitStatus(value: string | null | undefined): VisitStatus {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "completed") return "completed";
  if (raw === "cancelled" || raw === "canceled" || raw === "no_show") return "cancelled";
  return "scheduled";
}

export function visitStatusLabel(status: VisitStatus): string {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Scheduled";
}

export function clientStatusLabel(status: string | null | undefined): string {
  if (!status || status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return status;
}

export function navigationFieldValue(stored: string | null | undefined): string {
  const value = stored ?? "";
  return value.startsWith(NAVIGATION_PREFIX) ? value.slice(NAVIGATION_PREFIX.length) : value;
}

export function navigationPayload(field: string): string {
  const text = field.trim();
  if (!text) return "";
  if (text.startsWith(NAVIGATION_PREFIX)) return text;
  return `${NAVIGATION_PREFIX}${text}`;
}

export function stripAllergyPrefix(name: string): string {
  return name.replace(/^Allergy:\s*/, "");
}

export function sameList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

export function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
