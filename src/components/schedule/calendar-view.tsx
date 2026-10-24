"use client";

import Link from "next/link";
import type { ScheduleCaregiver, ScheduleDay, ScheduleRange, ScheduleVisit } from "@/lib/api/types";
import { formatClock, formatWeekdayDate, fullName } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  WEEKDAY_SHORT,
  dayDetailHref,
  dayOfMonth,
  monthDays,
  sortSlots,
  visitDotClass,
  weekdayOf,
} from "@/lib/schedule";

export function CalendarBoard({ range, month, today }: { range: ScheduleRange; month: string; today: string }) {
  const days = monthDays(month);
  const leading = days.length > 0 ? weekdayOf(days[0]) : 0;
  return (
    <div className="space-y-4">
      {range.caregivers.map((caregiver) => (
        <CaregiverCalendar key={caregiver.id} caregiver={caregiver} days={days} leading={leading} today={today} />
      ))}
    </div>
  );
}

function CaregiverCalendar({
  caregiver,
  days,
  leading,
  today,
}: {
  caregiver: ScheduleCaregiver;
  days: string[];
  leading: number;
  today: string;
}) {
  const byDate = new Map(caregiver.days.map((day) => [day.date, day]));
  const name = fullName(caregiver.firstName, caregiver.lastName, "Caregiver");
  return (
    <section className="rounded-xl border border-line bg-card p-3">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href={`/caregivers/${caregiver.id}`} className="font-display text-xl text-pine hover:underline">
            {name}
          </Link>
          <p className="text-xs text-muted">{caregiver.position || "—"}</p>
        </div>
        {!caregiver.hasAvailability ? <p className="text-xs text-muted">{SCHEDULE_TEXT.legend.neutral}</p> : null}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
        {WEEKDAY_SHORT.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={`${name} calendar`}>
        {Array.from({ length: leading }, (_, index) => (
          <div key={`pad-${caregiver.id}-${index}`} />
        ))}
        {days.map((date) => (
          <CalendarDay key={date} caregiverId={caregiver.id} date={date} day={byDate.get(date)} isToday={date === today} />
        ))}
      </div>
    </section>
  );
}

function CalendarDay({
  caregiverId,
  date,
  day,
  isToday,
}: {
  caregiverId: string;
  date: string;
  day: ScheduleDay | undefined;
  isToday: boolean;
}) {
  const visits = day ? sortSlots(day.visits) : [];
  const hasTimeOff = Boolean(day && day.timeOff.length > 0);
  const todayRing = isToday ? "ring-1 ring-inset ring-pine" : "";
  return (
    <div
      role="gridcell"
      className={`flex min-h-28 flex-col gap-1 rounded-lg bg-paper/40 p-1.5 text-left ${todayRing} ${hasTimeOff ? "hatched" : ""}`}
    >
      <Link
        href={dayDetailHref(caregiverId, date)}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold hover:bg-moss ${
          isToday ? "text-pine" : "text-ink"
        }`}
        aria-label={formatWeekdayDate(date)}
      >
        {dayOfMonth(date)}
      </Link>
      {hasTimeOff ? <p className="truncate px-0.5 text-[11px] font-semibold text-muted">{SCHEDULE_TEXT.legend.timeOff}</p> : null}
      <ul className="space-y-1">
        {visits.map((visit) => (
          <li key={visit.appointmentId}>
            <AppointmentChip visit={visit} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AppointmentChip({ visit }: { visit: ScheduleVisit }) {
  const cancelled = visit.visitStatus === "cancelled";
  return (
    <Link
      href={`/appointments/${visit.appointmentId}`}
      title={`${visit.clientName} · ${formatClock(visit.startTime)} – ${formatClock(visit.endTime)}`}
      className={`flex items-center gap-1 rounded-md bg-card px-1 py-0.5 text-[11px] leading-tight ring-1 ring-line hover:ring-pine ${
        cancelled ? "text-muted line-through" : "text-ink"
      }`}
    >
      <span className={`inline-block size-1.5 shrink-0 rounded-full ${visitDotClass(visit.visitStatus)}`} aria-hidden />
      <span className="truncate">
        <span className="font-semibold">{formatClock(visit.startTime)}</span> {visit.clientName}
      </span>
    </Link>
  );
}
