import type {
  AvailabilityWindow,
  BookingWarning,
  ScheduleSummaryDay,
  ScheduleVisitStatus,
  TimeSlot,
} from "@/lib/api/types";
import { formatCalendarDate, formatClock, minutesFromHhmm, toHhmm } from "@/lib/format";
import { calendarDateInTimeZone, inclusiveDayCount, VISIT_REPORT_TIME_ZONE } from "@/lib/visit-report";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Schedule endpoints read dates in this zone, matching the visit report. */
export const SCHEDULE_TIME_ZONE = VISIT_REPORT_TIME_ZONE;

export const SCHEDULE_HEADERS = {
  "X-Timezone": SCHEDULE_TIME_ZONE,
} as const;

export const SERIES_MAX_RANGE_DAYS = 92;
export const SCHEDULE_FILTER_MAX_CAREGIVERS = 50;
export const SERIES_MIN_TIME_SLOTS = 1;
export const SERIES_MAX_TIME_SLOTS = 6;

export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 22;
export const TIMELINE_HOUR_PX = 56;

export const REGULAR_VISIT_TYPE = "regular_visit";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export const WORK_WEEKDAYS = [1, 2, 3, 4, 5];

export type ScheduleView = "calendar" | "month" | "week";

// ---------------------------------------------------------------------------
// Labels and messages
// ---------------------------------------------------------------------------

export const SCHEDULE_TEXT = {
  nav: "Schedule",
  pageTitle: "Caregiver schedule",
  pageDescription: "Visits per caregiver per day. Shading shows how much of the configured hours is booked.",
  calendarView: "Calendar",
  monthView: "Month",
  weekView: "Week",
  today: "Today",
  previous: "Previous",
  next: "Next",
  filterCaregivers: "Caregivers",
  filterAllCaregivers: "All active caregivers",
  filterTooMany: `Choose up to ${SCHEDULE_FILTER_MAX_CAREGIVERS} caregivers.`,
  scheduleVisits: "Schedule visits",
  newAppointment: "New appointment",
  recurringSchedules: "Recurring schedules",
  loadingSchedule: "Loading the schedule",
  noCaregivers: "No caregivers to show",
  noCaregiversBody: "Active caregivers appear here once they exist, or widen the caregiver filter.",
  legend: {
    low: "Light load",
    mid: "Busy",
    high: "Nearly full",
    neutral: "Hours not set",
    timeOff: "Time off",
    missed: "Missed",
    cancelled: "Cancelled",
  },
  day: {
    eyebrow: "Day detail",
    back: "Back to calendar",
    addVisit: "+ Add visit",
    openCaregiver: "Caregiver profile",
    loading: "Loading the day",
    notFound: "No schedule for this caregiver on that date.",
    availability: "Working hours",
    noAvailability: "Working hours are not configured for this caregiver, so free slots and hours warnings are not shown.",
    timeOffAllDay: "Time off all day",
    timeOffPartial: "Time off",
    freeSlot: "Free",
    noVisits: "No visits on this day.",
    visits: "Visits",
    booked: "Booked",
    available: "Available",
    free: "Free",
    recurring: "Recurring",
    edited: "Edited",
    open: "Open",
    edit: "Edit",
    cancel: "Cancel visit",
    delete: "Delete visit",
    cancelTitle: "Cancel this visit?",
    cancelBody: "The visit stays on the calendar as cancelled. The caregiver is freed for that time.",
    cancelConfirm: "Cancel visit",
    deleteTitle: "Delete this visit?",
    deleteBody: "The visit is removed. If it belongs to a recurring schedule it is not recreated. This cannot be undone.",
    deleteConfirm: "Delete visit",
    cancelled: "Visit cancelled",
    deleted: "Visit deleted",
    checkIn: "In",
    checkOut: "Out",
  },
  availability: {
    title: "Working hours",
    intro: "Weekly hours used for the schedule grid and for warnings when a visit is booked outside them.",
    emptyHint:
      "No hours configured. Visits can be booked at any time and no \"outside working hours\" warnings are raised.",
    addWindow: "Add hours",
    removeWindow: "Remove",
    copyMonday: "Copy Monday to weekdays",
    save: "Save hours",
    saved: "Working hours saved",
    overlap: "Hours on this day overlap.",
    endBeforeStart: "End must be after start.",
    missingTime: "Enter both a start and an end time.",
    noHours: "No hours",
  },
  timeOff: {
    title: "Time off",
    intro: "Booked visits during time off are kept. Booking during time off shows a warning the admin can accept.",
    add: "Add time off",
    empty: "No time off recorded.",
    allDay: "All day",
    startDate: "From",
    endDate: "To",
    startTime: "Start",
    endTime: "End",
    reason: "Reason",
    reasonPlaceholder: "Vacation, appointment, training…",
    fullDay: "Full day(s)",
    partDay: "Part of the day",
    save: "Save time off",
    saved: "Time off saved",
    remove: "Remove",
    removeTitle: "Remove this time off?",
    removeBody: "The caregiver becomes bookable again for these dates without a warning.",
    removeConfirm: "Remove time off",
    removed: "Time off removed",
    affectedTitle: "These visits are still booked during this time off",
    affectedBody: "Nothing was cancelled. Edit a visit to move it, or reassign it to another caregiver.",
    affectedEdit: "Edit or reassign",
    endBeforeStart: "The end date must be on or after the start date.",
    timesBothOrNone: "Give both a start and an end time, or neither for a full day.",
    endTimeBeforeStart: "End time must be after the start time.",
    startRequired: "Choose a start date.",
    upcoming: "Upcoming and recent",
  },
  series: {
    eyebrow: "Recurring schedule",
    listTitle: "Recurring schedules",
    listDescription: "Visits booked on repeating days or on chosen dates. Edit a schedule to change its future visits at once.",
    newTitle: "Schedule visits",
    newDescription: "Book the same visit times for a client on repeating days, or on dates you pick. The caregiver's free time is checked for clashes.",
    editTitle: "Edit schedule",
    editDescription: "Changes apply to visits from the chosen date onward. Earlier visits are left as they are.",
    detailLoading: "Loading the schedule",
    listLoading: "Loading schedules",
    notFound: "Schedule not found",
    empty: "No recurring schedules",
    emptyBody: "Use Schedule visits to book a client's recurring visits.",
    statusActive: "Active",
    statusEnded: "Ended",
    statusAll: "All",
    columns: {
      client: "Client",
      caregiver: "Caregiver",
      range: "Range",
      days: "Days",
      times: "Times",
      status: "Status",
    },
    everyDay: "Every day",
    weekdays: "Weekdays",
    dateChoice: "Dates",
    repeatChoice: "Repeat",
    pickDates: "Pick dates",
    selectedDates: "Selected dates",
    datesHint: `Select the days to book. Up to ${SERIES_MAX_RANGE_DAYS} dates, no past dates, and the first and last can be at most ${SERIES_MAX_RANGE_DAYS} days apart. Visit times apply to every selected day.`,
    datesEditHint: `Choose the days that should remain on or after the date above. Earlier dates stay booked. Keep at least one date, at most ${SERIES_MAX_RANGE_DAYS}, and the first and last can be at most ${SERIES_MAX_RANGE_DAYS} days apart. Visit times apply to every selected day.`,
    datesPlaceholder: "Select days on the calendar.",
    datesLocked: "Earlier dates stay booked and cannot be changed here.",
    pickedCount: (count: number) => `${count} ${count === 1 ? "date" : "dates"}`,
    client: "Client",
    caregiver: "Caregiver",
    startDate: "Start date",
    endDate: "End date",
    repeatOn: "Repeat on",
    visitTimes: "Visit times",
    addTime: "Add a time",
    removeTime: "Remove",
    appointmentType: "Appointment type",
    applyFrom: "Apply changes to visits from",
    applyFromHint:
      "Visits that were edited individually, checked in, completed, or cancelled are kept as they are. Visits deleted individually are not recreated. Past visits never change.",
    rangeHint: `Up to ${SERIES_MAX_RANGE_DAYS} days. The start cannot be in the past.`,
    timesHint: `${SERIES_MIN_TIME_SLOTS} to ${SERIES_MAX_TIME_SLOTS} times per day. The same client may be visited more than once a day.`,
    locationHint: "Prefilled from the client's address. Leave blank to use the client's address.",
    preview: (count: number) => `This will create ${count} ${count === 1 ? "visit" : "visits"}.`,
    previewEdit: (count: number) => `Visits from the chosen date will be rebuilt as ${count} ${count === 1 ? "visit" : "visits"}.`,
    previewNone: "No days match. Pick at least one weekday inside the range.",
    previewDatesNone: "Pick at least one date.",
    submitCreate: "Schedule visits",
    submitEdit: "Apply changes",
    created: (count: number) => `${count} ${count === 1 ? "visit" : "visits"} scheduled`,
    updated: (created: number, removed: number) => `${removed} removed, ${created} rebuilt`,
    skippedTitle: "Skipped because the caregiver was already booked",
    acknowledgedTitle: "Booked despite these warnings",
    viewSeries: "View schedule",
    backToCalendar: "Back to calendar",
    occurrences: "Visits",
    occurrencesEmpty: "No visits on this schedule.",
    edit: "Edit schedule",
    end: "End schedule",
    endTitle: "End this schedule?",
    endBody: (date: string) =>
      `Remove visits from ${date} onward that haven't started? Past and checked-in visits are kept.`,
    endFrom: "Remove visits from",
    endConfirm: "End schedule",
    ended: (count: number) => `Schedule ended. ${count} ${count === 1 ? "visit" : "visits"} removed.`,
    partOfSeries: "This visit is part of a recurring schedule. Changes apply to this visit only. To change all future visits, edit the schedule.",
    openSeries: "Open the schedule",
    errors: {
      client: "Choose a client.",
      caregiver: "Choose a caregiver.",
      startDate: "Choose a start date.",
      startPast: "The start date cannot be in the past.",
      endDate: "Choose an end date.",
      endBeforeStart: "The end date must be on or after the start date.",
      tooLong: `Choose a range of ${SERIES_MAX_RANGE_DAYS} days or fewer.`,
      weekdays: "Pick at least one weekday.",
      dates: "Pick at least one date.",
      datesPast: "Dates cannot be in the past.",
      datesTooMany: `Choose ${SERIES_MAX_RANGE_DAYS} dates or fewer.`,
      datesTooFar: `The first and last date can be at most ${SERIES_MAX_RANGE_DAYS} days apart.`,
      slots: `Add between ${SERIES_MIN_TIME_SLOTS} and ${SERIES_MAX_TIME_SLOTS} visit times.`,
      slotTimes: "Each visit time needs a start and an end.",
      slotOrder: "End time must be after the start time.",
      slotOverlap: "Visit times must not overlap.",
      fromDate: "Choose the date to apply changes from.",
      fromPast: "That date is in the past.",
      type: "Choose an appointment type.",
    },
  },
  booking: {
    conflictTitle: "The caregiver is already booked",
    conflictBody: "These requested times clash with existing visits.",
    conflictSingleBody: "This caregiver already has a visit during that time.",
    conflictSkip: "Skip clashing visits and book the rest",
    conflictClose: "Change the times",
    conflictWith: (clientName: string, start: string, end: string) =>
      `Clashes with ${clientName || "another client"} ${start} – ${end}`,
    warningTitle: "Book outside availability?",
    warningBody: "The caregiver is not available at these times. Book anyway?",
    warningConfirm: "Book anyway",
    warningCancel: "Go back",
    outsideHours: "Outside working hours",
    onTimeOff: (reason: string | null) => (reason ? `On time off: ${reason}` : "On time off"),
    appointmentCreated: "Appointment created",
    appointmentSaved: "Appointment saved",
    appointmentCreatedWithWarnings: (count: number) =>
      `Appointment created with ${count} availability ${count === 1 ? "warning" : "warnings"} acknowledged`,
  },
} as const;

// ---------------------------------------------------------------------------
// Date helpers (all on the YYYY-MM-DD calendar, no time zone shifting)
// ---------------------------------------------------------------------------

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

export function parseYmd(value: string | null | undefined): Ymd | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function isYmd(value: string | null | undefined): value is string {
  return parseYmd(value) !== null;
}

function ymdToUtc(value: Ymd): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}

function utcToYmd(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function scheduleToday(now = new Date()): string {
  return calendarDateInTimeZone(SCHEDULE_TIME_ZONE, now);
}

export function addDays(value: string, days: number): string {
  const parsed = parseYmd(value);
  if (!parsed) return value;
  const date = ymdToUtc(parsed);
  date.setUTCDate(date.getUTCDate() + days);
  return utcToYmd(date);
}

/** 0 = Sunday … 6 = Saturday, matching the API. */
export function weekdayOf(value: string): number {
  const parsed = parseYmd(value);
  if (!parsed) return 0;
  return ymdToUtc(parsed).getUTCDay();
}

export function compareYmd(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isPastDate(value: string, today = scheduleToday()): boolean {
  return compareYmd(value, today) < 0;
}

export function monthOf(value: string): string {
  return value.slice(0, 7);
}

export function isYearMonth(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export function currentMonth(now = new Date()): string {
  return monthOf(scheduleToday(now));
}

export function shiftMonth(month: string, delta: number): string {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthDays(month: string): string[] {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const count = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

export function monthLabel(month: string): string {
  const [yearText, monthText] = month.split("-");
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1)),
  );
}

/** Monday of the week containing the date, matching the weekly report. */
export function weekStart(value: string): string {
  const weekday = weekdayOf(value);
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(value, offset);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function rangeDays(from: string, to: string): string[] {
  const count = inclusiveDayCount(from, to);
  if (count == null || count < 1) return [];
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

export function formatRange(from: string, to: string): string {
  if (from === to || !to) return formatCalendarDate(from);
  return `${formatCalendarDate(from)} – ${formatCalendarDate(to)}`;
}

export function dayOfMonth(value: string): string {
  return String(Number(value.slice(8, 10)));
}

export function isWeekend(value: string): boolean {
  const weekday = weekdayOf(value);
  return weekday === 0 || weekday === 6;
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  return `${formatClock(start)} – ${formatClock(end)}`;
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function slotMinutes(slot: TimeSlot): { start: number; end: number } | null {
  const start = minutesFromHhmm(slot.startTime);
  const end = minutesFromHhmm(slot.endTime);
  if (start == null || end == null) return null;
  return { start, end };
}

/** Returns a message when any slot is incomplete, inverted, or overlaps another; "" when fine. */
export function timeSlotsError(
  slots: TimeSlot[],
  messages: { missing: string; order: string; overlap: string },
): string {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const slot of slots) {
    const range = slotMinutes(slot);
    if (!range) return messages.missing;
    if (range.end <= range.start) return messages.order;
    ranges.push(range);
  }
  const sorted = [...ranges].sort((left, right) => left.start - right.start);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].start < sorted[index - 1].end) return messages.overlap;
  }
  return "";
}

export function sortSlots<T extends TimeSlot>(slots: T[]): T[] {
  return [...slots].sort((left, right) => (minutesFromHhmm(left.startTime) ?? 0) - (minutesFromHhmm(right.startTime) ?? 0));
}

export function normalizeSlot<T extends TimeSlot>(slot: T): T {
  return { ...slot, startTime: toHhmm(slot.startTime) || slot.startTime, endTime: toHhmm(slot.endTime) || slot.endTime };
}

/** Per-weekday validation of availability windows; keys are weekdays with a problem. */
export function availabilityErrors(windows: AvailabilityWindow[]): Record<number, string> {
  const errors: Record<number, string> = {};
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const message = timeSlotsError(
      windows.filter((window) => window.weekday === weekday),
      {
        missing: SCHEDULE_TEXT.availability.missingTime,
        order: SCHEDULE_TEXT.availability.endBeforeStart,
        overlap: SCHEDULE_TEXT.availability.overlap,
      },
    );
    if (message) errors[weekday] = message;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Series helpers
// ---------------------------------------------------------------------------

export function matchingDayCount(from: string, to: string, weekdays: number[]): number {
  const days = rangeDays(from, to);
  if (days.length === 0) return 0;
  const allowed = new Set(weekdays);
  return days.filter((day) => allowed.has(weekdayOf(day))).length;
}

export function plannedVisitCount(from: string, to: string, weekdays: number[], slotCount: number): number {
  return matchingDayCount(from, to, weekdays) * slotCount;
}

export function weekdaysLabel(weekdays: number[]): string {
  const unique = [...new Set(weekdays)].sort((left, right) => left - right);
  if (unique.length === 7) return SCHEDULE_TEXT.series.everyDay;
  if (unique.length === 5 && WORK_WEEKDAYS.every((day) => unique.includes(day))) return SCHEDULE_TEXT.series.weekdays;
  if (unique.length === 0) return "—";
  return unique.map((day) => WEEKDAY_SHORT[day] ?? String(day)).join(", ");
}

/** Repeating series use weekdays. A date array is the exact booked days. */
export function seriesDaysLabel(series: { dates: string[] | null; weekdays: number[] }): string {
  if (series.dates != null) return SCHEDULE_TEXT.series.pickedCount(series.dates.length);
  return weekdaysLabel(series.weekdays);
}

/** Unique calendar dates, sorted. Invalid values are dropped. */
export function normalizeSeriesDates(dates: string[]): string[] {
  const unique = new Set<string>();
  for (const value of dates) {
    const parsed = parseYmd(value);
    if (!parsed) continue;
    unique.add(
      `${String(parsed.year).padStart(4, "0")}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`,
    );
  }
  return [...unique].sort(compareYmd);
}

/** Days between two dates. The same day is 0. */
export function daysApart(from: string, to: string): number | null {
  const count = inclusiveDayCount(from, to);
  if (count == null || count < 1) return null;
  return count - 1;
}

/** Empty string when the dates to send satisfy the visit-series rules. */
export function seriesDatesError(dates: string[], today = scheduleToday()): string {
  const messages = SCHEDULE_TEXT.series.errors;
  const unique = normalizeSeriesDates(dates);
  if (unique.length === 0) return messages.dates;
  if (unique.some((date) => isPastDate(date, today))) return messages.datesPast;
  if (unique.length > SERIES_MAX_RANGE_DAYS) return messages.datesTooMany;
  const apart = daysApart(unique[0], unique[unique.length - 1]);
  if (apart == null || apart > SERIES_MAX_RANGE_DAYS) return messages.datesTooFar;
  return "";
}

export function timeSlotsLabel(slots: TimeSlot[]): string {
  if (slots.length === 0) return "—";
  return sortSlots(slots)
    .map((slot) => formatTimeRange(slot.startTime, slot.endTime))
    .join(" · ");
}

export function sameWeekdays(left: number[], right: number[]): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function seriesStatusTone(status: string): "good" | "neutral" {
  return status === "active" ? "good" : "neutral";
}

export function seriesStatusLabel(status: string): string {
  if (status === "active") return SCHEDULE_TEXT.series.statusActive;
  if (status === "ended") return SCHEDULE_TEXT.series.statusEnded;
  return status || "—";
}

/** Default "apply from" date for editing a series: today, or the start when it is still ahead. */
export function defaultSeriesFromDate(startDate: string, today = scheduleToday()): string {
  return compareYmd(startDate, today) > 0 ? startDate : today;
}

// ---------------------------------------------------------------------------
// Visit status and load shading
// ---------------------------------------------------------------------------

export function visitStatusLabelFor(status: ScheduleVisitStatus): string {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Scheduled";
  }
}

export function visitStatusTone(status: ScheduleVisitStatus): "good" | "warn" | "bad" | "neutral" {
  if (status === "completed") return "good";
  if (status === "in_progress" || status === "missed") return "warn";
  if (status === "cancelled") return "bad";
  return "neutral";
}

/** Tailwind classes for a visit card, using the theme colors defined in globals.css. */
export function visitCardClass(status: ScheduleVisitStatus): string {
  switch (status) {
    case "in_progress":
      return "border-visit-progress bg-visit-progress/15 text-ink";
    case "completed":
      return "border-visit-completed bg-visit-completed/15 text-ink";
    case "missed":
      return "border-visit-missed bg-visit-missed/15 text-ink";
    case "cancelled":
      return "border-visit-cancelled bg-visit-cancelled/15 text-muted line-through decoration-visit-cancelled";
    default:
      return "border-visit-scheduled bg-visit-scheduled/15 text-ink";
  }
}

export function visitDotClass(status: ScheduleVisitStatus): string {
  switch (status) {
    case "in_progress":
      return "bg-visit-progress";
    case "completed":
      return "bg-visit-completed";
    case "missed":
      return "bg-visit-missed";
    case "cancelled":
      return "bg-visit-cancelled";
    default:
      return "bg-visit-scheduled";
  }
}

export type LoadLevel = "empty" | "neutral" | "low" | "mid" | "high";

export function loadLevel(day: Pick<ScheduleSummaryDay, "visitCount" | "bookedMinutes" | "availableMinutes">): LoadLevel {
  if (day.visitCount === 0 && day.bookedMinutes === 0) return "empty";
  if (day.availableMinutes == null || day.availableMinutes <= 0) return "neutral";
  const ratio = day.bookedMinutes / day.availableMinutes;
  if (ratio >= 0.85) return "high";
  if (ratio >= 0.5) return "mid";
  return "low";
}

export function loadCellClass(level: LoadLevel): string {
  switch (level) {
    case "low":
      return "bg-load-low";
    case "mid":
      return "bg-load-mid";
    case "high":
      return "bg-load-high";
    case "neutral":
      return "bg-paper";
    default:
      return "bg-card";
  }
}

// ---------------------------------------------------------------------------
// Booking warnings
// ---------------------------------------------------------------------------

export function warningLabel(warning: BookingWarning): string {
  if (warning.type === "time_off") return SCHEDULE_TEXT.booking.onTimeOff(warning.reason);
  if (warning.type === "outside_hours") return SCHEDULE_TEXT.booking.outsideHours;
  return warning.reason || warning.type || "Availability warning";
}

// ---------------------------------------------------------------------------
// URL query helpers for the Schedule page
// ---------------------------------------------------------------------------

export function parseCaregiverIdsParam(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function caregiverIdsParam(ids: string[]): string | undefined {
  return ids.length > 0 ? ids.join(",") : undefined;
}

export function dayDetailHref(caregiverId: string, date: string): string {
  return `/schedule/day?caregiverId=${encodeURIComponent(caregiverId)}&date=${encodeURIComponent(date)}`;
}

export function newVisitHref(input: {
  caregiverId?: string;
  clientId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}): string {
  const params = new URLSearchParams();
  if (input.caregiverId) params.set("caregiverId", input.caregiverId);
  if (input.clientId) params.set("clientId", input.clientId);
  if (input.date) params.set("date", input.date);
  if (input.startTime) params.set("startTime", input.startTime);
  if (input.endTime) params.set("endTime", input.endTime);
  const query = params.toString();
  return query ? `/appointments/new?${query}` : "/appointments/new";
}

export function editVisitHref(appointmentId: string, seriesId?: string | null): string {
  const base = `/appointments/${encodeURIComponent(appointmentId)}/edit`;
  return seriesId ? `${base}?seriesId=${encodeURIComponent(seriesId)}` : base;
}

export function seriesHref(seriesId: string): string {
  return `/schedule/series/${encodeURIComponent(seriesId)}`;
}

export function newSeriesHref(input: { caregiverId?: string; clientId?: string } = {}): string {
  const params = new URLSearchParams();
  if (input.caregiverId) params.set("caregiverId", input.caregiverId);
  if (input.clientId) params.set("clientId", input.clientId);
  const query = params.toString();
  return query ? `/schedule/series/new?${query}` : "/schedule/series/new";
}
