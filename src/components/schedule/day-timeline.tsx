"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import type { ScheduleDay, ScheduleVisit, TimeSlot } from "@/lib/api/types";
import { formatClock, formatLocalDateTime, humanizeCode, minutesFromHhmm } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  TIMELINE_END_HOUR,
  TIMELINE_HOUR_PX,
  TIMELINE_START_HOUR,
  editVisitHref,
  formatTimeRange,
  seriesHref,
  sortSlots,
  visitCardClass,
  visitStatusLabelFor,
  visitStatusTone,
} from "@/lib/schedule";

const DAY_END = 24 * 60;

function bounds(day: ScheduleDay): { start: number; end: number } {
  let start = TIMELINE_START_HOUR * 60;
  let end = TIMELINE_END_HOUR * 60;
  const consider = (slot: { startTime: string | null; endTime: string | null }) => {
    const slotStart = slot.startTime ? minutesFromHhmm(slot.startTime) : null;
    const slotEnd = slot.endTime ? minutesFromHhmm(slot.endTime) : null;
    if (slotStart != null) start = Math.min(start, Math.floor(slotStart / 60) * 60);
    if (slotEnd != null) end = Math.max(end, Math.ceil(slotEnd / 60) * 60);
  };
  day.availability.forEach(consider);
  day.visits.forEach(consider);
  day.timeOff.filter((item) => !item.allDay).forEach(consider);
  return { start: Math.max(0, start), end: Math.min(DAY_END, Math.max(end, start + 60)) };
}

function visitAnchor(appointmentId: string): string {
  return `visit-${appointmentId}`;
}

export function DayTimeline({
  day,
  onPickSlot,
}: {
  day: ScheduleDay;
  onPickSlot: (slot: TimeSlot) => void;
}) {
  const { start, end } = bounds(day);
  const total = end - start;
  const height = (total / 60) * TIMELINE_HOUR_PX;
  const hours = Array.from({ length: total / 60 + 1 }, (_, index) => start + index * 60);

  const top = (time: string | null, fallback: number) => {
    const minutes = time ? minutesFromHhmm(time) : null;
    const clamped = Math.min(end, Math.max(start, minutes ?? fallback));
    return ((clamped - start) / total) * 100;
  };
  const block = (startTime: string | null, endTime: string | null) => {
    const topPct = top(startTime, start);
    const bottomPct = top(endTime, end);
    return { top: `${topPct}%`, height: `${Math.max(bottomPct - topPct, 0.5)}%` };
  };

  const allDayOff = day.timeOff.filter((item) => item.allDay);
  const partialOff = day.timeOff.filter((item) => !item.allDay);

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      {allDayOff.length > 0 ? (
        <div className="hatched mb-3 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink">
          {SCHEDULE_TEXT.day.timeOffAllDay}
          {allDayOff.map((item) => (item.reason ? ` · ${item.reason}` : "")).join("")}
        </div>
      ) : null}
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
        <div className="relative" style={{ height }}>
          {hours.map((minute) => (
            <span
              key={minute}
              className="absolute right-1 -translate-y-1/2 text-[11px] text-muted"
              style={{ top: `${((minute - start) / total) * 100}%` }}
            >
              {formatClock(`${String(Math.floor(minute / 60)).padStart(2, "0")}:00`)}
            </span>
          ))}
        </div>
        <div className={`relative overflow-hidden rounded-lg border border-line ${allDayOff.length > 0 ? "hatched" : "bg-paper/50"}`} style={{ height }}>
          {hours.map((minute) => (
            <div
              key={minute}
              className="absolute inset-x-0 border-t border-line/70"
              style={{ top: `${((minute - start) / total) * 100}%` }}
              aria-hidden
            />
          ))}
          {day.availability.map((slot, index) => (
            <div
              key={`avail-${index}`}
              className="absolute inset-x-0 bg-availability"
              style={block(slot.startTime, slot.endTime)}
              title={`${SCHEDULE_TEXT.day.availability} ${formatTimeRange(slot.startTime, slot.endTime)}`}
              aria-hidden
            />
          ))}
          {partialOff.map((item) => (
            <div
              key={item.id}
              className="hatched absolute inset-x-0 border-y border-timeoff/80 px-2 py-1 text-[11px] font-semibold text-ink"
              style={block(item.startTime, item.endTime)}
              title={`${SCHEDULE_TEXT.day.timeOffPartial} ${formatTimeRange(item.startTime, item.endTime)}${item.reason ? ` · ${item.reason}` : ""}`}
            >
              {SCHEDULE_TEXT.day.timeOffPartial}
              {item.reason ? ` · ${item.reason}` : ""}
            </div>
          ))}
          {(day.freeSlots ?? []).map((slot, index) => (
            <button
              key={`free-${index}`}
              type="button"
              className="absolute inset-x-2 flex items-center justify-center rounded-md border border-dashed border-pine/50 text-[11px] font-semibold text-pine hover:bg-moss/70"
              style={block(slot.startTime, slot.endTime)}
              onClick={() => onPickSlot(slot)}
              title={`${SCHEDULE_TEXT.day.addVisit} ${formatTimeRange(slot.startTime, slot.endTime)}`}
            >
              {SCHEDULE_TEXT.day.freeSlot} · {formatTimeRange(slot.startTime, slot.endTime)}
            </button>
          ))}
          {sortSlots(day.visits).map((visit) => (
            <a
              key={visit.appointmentId}
              href={`#${visitAnchor(visit.appointmentId)}`}
              className={`absolute inset-x-2 overflow-hidden rounded-md border-l-4 px-2 py-1 text-[11px] leading-tight shadow-sm ring-1 ring-line/60 ${visitCardClass(visit.visitStatus)}`}
              style={block(visit.startTime, visit.endTime)}
              title={`${visit.clientName} · ${formatTimeRange(visit.startTime, visit.endTime)} · ${visitStatusLabelFor(visit.visitStatus)}`}
            >
              <span className="block truncate font-semibold">{visit.clientName || "Client"}</span>
              <span className="block truncate">{formatTimeRange(visit.startTime, visit.endTime)}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VisitCard({
  visit,
  busy,
  onCancel,
  onDelete,
}: {
  visit: ScheduleVisit;
  busy: boolean;
  onCancel: (visit: ScheduleVisit) => void;
  onDelete: (visit: ScheduleVisit) => void;
}) {
  const text = SCHEDULE_TEXT.day;
  const cancellable = visit.visitStatus === "scheduled";
  const locationText = visit.location
    ? [visit.location.street, visit.location.city, visit.location.state, visit.location.zipCode].filter(Boolean).join(", ")
    : "";
  return (
    <li
      id={visitAnchor(visit.appointmentId)}
      className={`scroll-mt-24 rounded-xl border-l-4 bg-card p-4 shadow-sm ring-1 ring-line ${visitCardClass(visit.visitStatus).replace("line-through", "")}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {visit.clientId ? (
              <Link href={`/clients/${visit.clientId}`} className="font-semibold text-pine hover:underline">
                {visit.clientName || "Client"}
              </Link>
            ) : (
              <span className="font-semibold text-ink">{visit.clientName || "Client"}</span>
            )}
            <Badge tone={visitStatusTone(visit.visitStatus)}>{visitStatusLabelFor(visit.visitStatus)}</Badge>
            {visit.seriesId ? (
              <Link href={seriesHref(visit.seriesId)} title={text.recurring}>
                <Badge tone="neutral">{visit.isException ? text.edited : text.recurring}</Badge>
              </Link>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink">
            {formatTimeRange(visit.startTime, visit.endTime)}
            <span className="text-muted"> · {humanizeCode(visit.appointmentType)}</span>
          </p>
          <p className="text-sm text-muted">{visit.services.map((service) => service.name).join(", ") || "No services listed"}</p>
          {locationText ? <p className="text-sm text-muted">{locationText}</p> : null}
          {visit.checkInAt || visit.checkOutAt ? (
            <p className="mt-1 text-xs text-muted">
              {visit.checkInAt ? `${text.checkIn} ${formatLocalDateTime(visit.checkInAt)}` : ""}
              {visit.checkInAt && visit.checkOutAt ? " · " : ""}
              {visit.checkOutAt ? `${text.checkOut} ${formatLocalDateTime(visit.checkOutAt)}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/appointments/${visit.appointmentId}`}>
            <Button variant="secondary">{text.open}</Button>
          </Link>
          <Link href={editVisitHref(visit.appointmentId, visit.seriesId)}>
            <Button variant="secondary">{text.edit}</Button>
          </Link>
          {cancellable ? (
            <Button variant="ghost" onClick={() => onCancel(visit)} disabled={busy}>
              {text.cancel}
            </Button>
          ) : null}
          <Button variant="danger" onClick={() => onDelete(visit)} disabled={busy}>
            {text.delete}
          </Button>
        </div>
      </div>
    </li>
  );
}
