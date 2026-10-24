"use client";

import Link from "next/link";
import type { ScheduleCaregiver, ScheduleDay, ScheduleRange } from "@/lib/api/types";
import { formatClock, fullName } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  WEEKDAY_SHORT,
  dayDetailHref,
  dayOfMonth,
  formatMinutes,
  isWeekend,
  sortSlots,
  visitDotClass,
  weekdayOf,
} from "@/lib/schedule";

export function WeekGrid({ range, days, today }: { range: ScheduleRange; days: string[]; today: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-44 border-b border-line bg-paper px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Caregiver
            </th>
            {days.map((date) => (
              <th
                key={date}
                scope="col"
                className={`border-b border-l border-line px-2 py-2 text-xs font-semibold ${
                  isWeekend(date) ? "bg-paper/70 text-muted" : "bg-paper text-ink"
                }`}
              >
                <span className={date === today ? "text-pine" : ""}>
                  {WEEKDAY_SHORT[weekdayOf(date)]} {dayOfMonth(date)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {range.caregivers.map((caregiver) => (
            <WeekRow key={caregiver.id} caregiver={caregiver} days={days} today={today} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekRow({ caregiver, days, today }: { caregiver: ScheduleCaregiver; days: string[]; today: string }) {
  const byDate = new Map(caregiver.days.map((day) => [day.date, day]));
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 border-b border-line bg-card px-4 py-2 text-left align-top">
        <Link href={`/caregivers/${caregiver.id}`} className="block truncate text-sm font-semibold text-pine hover:underline">
          {fullName(caregiver.firstName, caregiver.lastName, "Caregiver")}
        </Link>
        <span className="block text-xs text-muted">{caregiver.position || "—"}</span>
      </th>
      {days.map((date) => (
        <WeekCell key={date} caregiverId={caregiver.id} date={date} day={byDate.get(date)} isToday={date === today} />
      ))}
    </tr>
  );
}

function WeekCell({
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
  return (
    <td className={`border-b border-l border-line p-1.5 align-top ${isToday ? "ring-1 ring-inset ring-pine/40" : ""} ${hasTimeOff ? "hatched" : ""}`}>
      <div className="flex min-h-24 flex-col gap-1">
        {hasTimeOff ? <span className="text-[11px] font-semibold text-muted">{SCHEDULE_TEXT.legend.timeOff}</span> : null}
        {visits.map((visit) => (
          <Link
            key={visit.appointmentId}
            href={`/appointments/${visit.appointmentId}`}
            title={`${visit.clientName} · ${formatClock(visit.startTime)} – ${formatClock(visit.endTime)}`}
            className={`flex items-center gap-1.5 rounded-md bg-card/90 px-1.5 py-1 text-[11px] leading-tight ring-1 ring-line hover:ring-pine ${
              visit.visitStatus === "cancelled" ? "text-muted line-through" : "text-ink"
            }`}
          >
            <span className={`inline-block size-2 shrink-0 rounded-full ${visitDotClass(visit.visitStatus)}`} aria-hidden />
            <span className="truncate">
              <span className="font-semibold">{formatClock(visit.startTime)}</span> {visit.clientName}
            </span>
          </Link>
        ))}
        <Link
          href={dayDetailHref(caregiverId, date)}
          className="mt-auto pt-1 text-[11px] font-semibold text-pine hover:underline"
        >
          {visits.length === 0 ? SCHEDULE_TEXT.day.addVisit : `${SCHEDULE_TEXT.day.booked} ${formatMinutes(day?.bookedMinutes ?? 0)} ›`}
        </Link>
      </div>
    </td>
  );
}
