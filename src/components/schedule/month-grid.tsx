"use client";

import Link from "next/link";
import type { ScheduleSummary, ScheduleSummaryCaregiver, ScheduleSummaryDay } from "@/lib/api/types";
import { fullName } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  WEEKDAY_SHORT,
  dayDetailHref,
  dayOfMonth,
  formatMinutes,
  isWeekend,
  loadCellClass,
  loadLevel,
  monthDays,
  weekdayOf,
} from "@/lib/schedule";

export function MonthGrid({ summary, today }: { summary: ScheduleSummary; today: string }) {
  const days = monthDays(summary.month);
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="min-w-max border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-line bg-paper px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Caregiver
            </th>
            {days.map((date) => {
              const weekend = isWeekend(date);
              const isToday = date === today;
              return (
                <th
                  key={date}
                  scope="col"
                  className={`min-w-[64px] border-b border-l border-line px-1 py-2 text-center text-xs font-semibold ${
                    weekend ? "bg-paper/70 text-muted" : "bg-paper text-ink"
                  }`}
                >
                  <span className={`block ${isToday ? "text-pine" : ""}`}>{dayOfMonth(date)}</span>
                  <span className="block font-normal text-muted">{WEEKDAY_SHORT[weekdayOf(date)]}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {summary.caregivers.map((caregiver) => (
            <CaregiverRow key={caregiver.id} caregiver={caregiver} days={days} today={today} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaregiverRow({ caregiver, days, today }: { caregiver: ScheduleSummaryCaregiver; days: string[]; today: string }) {
  const byDate = new Map(caregiver.days.map((day) => [day.date, day]));
  const name = fullName(caregiver.firstName, caregiver.lastName, "Caregiver");
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 border-b border-line bg-card px-4 py-2 text-left align-top">
        <Link href={`/caregivers/${caregiver.id}`} className="block max-w-[180px] truncate text-sm font-semibold text-pine hover:underline">
          {name}
        </Link>
        <span className="block text-xs text-muted">{caregiver.position || "—"}</span>
        {!caregiver.hasAvailability ? <span className="block text-xs text-muted">{SCHEDULE_TEXT.legend.neutral}</span> : null}
      </th>
      {days.map((date) => (
        <DayCell key={date} caregiverId={caregiver.id} date={date} day={byDate.get(date)} isToday={date === today} />
      ))}
    </tr>
  );
}

function DayCell({
  caregiverId,
  date,
  day,
  isToday,
}: {
  caregiverId: string;
  date: string;
  day: ScheduleSummaryDay | undefined;
  isToday: boolean;
}) {
  const level = day ? loadLevel(day) : "empty";
  const shade = loadCellClass(level);
  const hatched = day?.hasTimeOff ? "hatched" : "";
  const title = day
    ? [
        `${day.visitCount} ${day.visitCount === 1 ? "visit" : "visits"}`,
        `${SCHEDULE_TEXT.day.booked} ${formatMinutes(day.bookedMinutes)}`,
        day.availableMinutes != null ? `${SCHEDULE_TEXT.day.available} ${formatMinutes(day.availableMinutes)}` : SCHEDULE_TEXT.legend.neutral,
        day.hasTimeOff ? SCHEDULE_TEXT.legend.timeOff : "",
        day.missedCount > 0 ? `${day.missedCount} missed` : "",
        day.cancelledCount > 0 ? `${day.cancelledCount} cancelled` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "No data";

  return (
    <td className={`border-b border-l border-line p-0 align-top ${isToday ? "ring-1 ring-inset ring-pine/40" : ""}`}>
      <Link
        href={dayDetailHref(caregiverId, date)}
        title={title}
        aria-label={`${date}: ${title}`}
        className={`flex h-16 w-full flex-col justify-between px-1.5 py-1 text-xs transition hover:ring-2 hover:ring-inset hover:ring-pine/50 ${shade} ${hatched}`}
      >
        {day && day.visitCount > 0 ? (
          <>
            <span className="font-semibold text-ink">
              {day.visitCount}
              <span className="font-normal text-muted"> {day.visitCount === 1 ? "visit" : "visits"}</span>
            </span>
            <span className="text-muted">{formatMinutes(day.bookedMinutes)}</span>
          </>
        ) : (
          <span className="text-muted/70">{day?.hasTimeOff ? SCHEDULE_TEXT.legend.timeOff : ""}</span>
        )}
        {day && (day.missedCount > 0 || day.cancelledCount > 0) ? (
          <span className="flex gap-1">
            {day.missedCount > 0 ? (
              <span className="inline-block size-2 rounded-full bg-visit-missed" aria-hidden title={`${day.missedCount} missed`} />
            ) : null}
            {day.cancelledCount > 0 ? (
              <span className="inline-block size-2 rounded-full bg-visit-cancelled" aria-hidden title={`${day.cancelledCount} cancelled`} />
            ) : null}
          </span>
        ) : null}
      </Link>
    </td>
  );
}

export function LoadLegend() {
  const legend = SCHEDULE_TEXT.legend;
  const items: Array<{ label: string; className: string }> = [
    { label: legend.low, className: loadCellClass("low") },
    { label: legend.mid, className: loadCellClass("mid") },
    { label: legend.high, className: loadCellClass("high") },
    { label: legend.neutral, className: loadCellClass("neutral") },
    { label: legend.timeOff, className: "hatched bg-card" },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block size-3.5 rounded border border-line ${item.className}`} aria-hidden />
          {item.label}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full bg-visit-missed" aria-hidden />
        {legend.missed}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full bg-visit-cancelled" aria-hidden />
        {legend.cancelled}
      </li>
    </ul>
  );
}
