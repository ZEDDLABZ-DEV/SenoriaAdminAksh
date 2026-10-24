"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, MonthYearButtons } from "@/components/date-calendar";
import { MultiPicker } from "@/components/pickers";
import { CalendarBoard } from "@/components/schedule/calendar-view";
import { LoadLegend, MonthGrid } from "@/components/schedule/month-grid";
import { WeekGrid } from "@/components/schedule/week-grid";
import { Alert, Button, PageHeader, SegmentedControl, StateBlock } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { getSchedule, getScheduleSummary, listAllCaregivers } from "@/lib/api/resources";
import type { CaregiverRecord, NamedCatalogItem, ScheduleRange, ScheduleSummary } from "@/lib/api/types";
import { formatCalendarDate, fullName } from "@/lib/format";
import {
  SCHEDULE_FILTER_MAX_CAREGIVERS,
  SCHEDULE_TEXT,
  addDays,
  caregiverIdsParam,
  currentMonth,
  isYearMonth,
  isYmd,
  monthDays,
  newSeriesHref,
  parseCaregiverIdsParam,
  scheduleToday,
  shiftMonth,
  weekDays,
  weekStart,
  type ScheduleView,
} from "@/lib/schedule";

const VIEW_OPTIONS: Array<{ id: ScheduleView; label: string }> = [
  { id: "calendar", label: SCHEDULE_TEXT.calendarView },
  { id: "month", label: SCHEDULE_TEXT.monthView },
  { id: "week", label: SCHEDULE_TEXT.weekView },
];

function parseView(value: string | null): ScheduleView {
  if (value === "month" || value === "week") return value;
  return "calendar";
}

function SchedulePage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const today = scheduleToday();

  const view = parseView(params.get("view"));
  const monthParam = params.get("month");
  const month = isYearMonth(monthParam) ? monthParam : currentMonth();
  const monthDates = monthDays(month);
  const monthFrom = monthDates[0] ?? `${month}-01`;
  const monthTo = monthDates[monthDates.length - 1] ?? monthFrom;
  const fromParam = params.get("from");
  const weekFrom = weekStart(isYmd(fromParam) ? fromParam : today);
  const caregiverIds = useMemo(() => parseCaregiverIdsParam(params.get("caregiverIds")), [params]);
  const caregiverKey = caregiverIds.join(",");

  const [caregivers, setCaregivers] = useState<CaregiverRecord[]>([]);
  const [caregiversError, setCaregiversError] = useState("");
  const [summary, setSummary] = useState<ScheduleSummary | null>(null);
  const [range, setRange] = useState<ScheduleRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const setQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    let cancelled = false;
    listAllCaregivers()
      .then((rows) => {
        if (!cancelled) setCaregivers(rows);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setCaregiversError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const ids = parseCaregiverIdsParam(caregiverKey);
    const request =
      view === "month"
        ? getScheduleSummary(month, ids).then((result) => {
            if (cancelled) return;
            setSummary(result);
          })
        : getSchedule(view === "week" ? weekFrom : monthFrom, view === "week" ? addDays(weekFrom, 6) : monthTo, ids).then((result) => {
            if (cancelled) return;
            setRange(result);
          });
    request
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, month, monthFrom, monthTo, weekFrom, caregiverKey, reloadKey]);

  const caregiverChoices = useMemo<NamedCatalogItem[]>(
    () =>
      caregivers.map((caregiver) => ({
        id: caregiver.id,
        name: fullName(caregiver.firstName, caregiver.lastName, caregiver.email || "Unnamed caregiver"),
      })),
    [caregivers],
  );

  function goPrevious() {
    if (view === "week") setQuery({ from: addDays(weekFrom, -7) });
    else setQuery({ month: shiftMonth(month, -1) });
  }

  function goNext() {
    if (view === "week") setQuery({ from: addDays(weekFrom, 7) });
    else setQuery({ month: shiftMonth(month, 1) });
  }

  function goToday() {
    if (view === "week") setQuery({ from: weekStart(today) });
    else setQuery({ month: currentMonth() });
  }

  const rows = view === "month" ? summary?.caregivers.length ?? 0 : range?.caregivers.length ?? 0;
  const showEmpty = !loading && !error && rows === 0;

  return (
    <div>
      <PageHeader
        eyebrow={SCHEDULE_TEXT.nav}
        title={SCHEDULE_TEXT.pageTitle}
        description={SCHEDULE_TEXT.pageDescription}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/schedule/series">
              <Button variant="secondary">{SCHEDULE_TEXT.recurringSchedules}</Button>
            </Link>
            <Link href="/appointments/new">
              <Button variant="secondary">{SCHEDULE_TEXT.newAppointment}</Button>
            </Link>
            <Link href={newSeriesHref()}>
              <Button>{SCHEDULE_TEXT.scheduleVisits}</Button>
            </Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl<ScheduleView>
            label="View"
            value={view}
            options={VIEW_OPTIONS}
            onChange={(next) => setQuery({ view: next === "calendar" ? undefined : next })}
          />
          <div className="flex items-center gap-1 rounded-lg bg-card p-1 ring-1 ring-line">
            <button type="button" className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-paper hover:text-ink" onClick={goPrevious} aria-label={SCHEDULE_TEXT.previous}>
              ‹
            </button>
            <button type="button" className="rounded-md px-3 py-1.5 text-sm font-semibold text-pine hover:bg-moss" onClick={goToday}>
              {SCHEDULE_TEXT.today}
            </button>
            <button type="button" className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-paper hover:text-ink" onClick={goNext} aria-label={SCHEDULE_TEXT.next}>
              ›
            </button>
          </div>
          <h2 className="font-display text-2xl text-ink">
            {view === "week" ? (
              <DatePicker
                appearance="heading"
                aria-label="Choose week"
                value={weekFrom}
                label={`${formatCalendarDate(weekFrom)} – ${formatCalendarDate(addDays(weekFrom, 6))}`}
                onValueChange={(next) => setQuery({ from: weekStart(next) })}
              />
            ) : (
              <MonthYearButtons month={month} onChange={(next) => setQuery({ month: next })} />
            )}
          </h2>
        </div>
        <MultiPicker
          label={SCHEDULE_TEXT.filterCaregivers}
          options={caregiverChoices}
          value={caregiverIds}
          onChange={(ids) => setQuery({ caregiverIds: caregiverIdsParam(ids) })}
          placeholder={SCHEDULE_TEXT.filterAllCaregivers}
          searchPlaceholder="Search caregivers"
          missingLabel="Caregiver"
          max={SCHEDULE_FILTER_MAX_CAREGIVERS}
          error={caregiversError}
          hint={caregiverIds.length >= SCHEDULE_FILTER_MAX_CAREGIVERS ? SCHEDULE_TEXT.filterTooMany : undefined}
        />
      </div>
      {view !== "calendar" ? (
        <div className="mb-3">
          <LoadLegend />
        </div>
      ) : null}
      {loading ? <StateBlock title={SCHEDULE_TEXT.loadingSchedule} /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </Alert>
      ) : null}
      {showEmpty ? <StateBlock title={SCHEDULE_TEXT.noCaregivers} body={SCHEDULE_TEXT.noCaregiversBody} /> : null}
      {!loading && !error && view === "calendar" && range && range.caregivers.length > 0 ? (
        <CalendarBoard range={range} month={month} today={today} />
      ) : null}
      {!loading && !error && view === "month" && summary && summary.caregivers.length > 0 ? (
        <MonthGrid summary={summary} today={today} />
      ) : null}
      {!loading && !error && view === "week" && range && range.caregivers.length > 0 ? (
        <WeekGrid range={range} days={weekDays(weekFrom)} today={today} />
      ) : null}
    </div>
  );
}

export default function SchedulePageRoute() {
  return (
    <Suspense fallback={<StateBlock title={SCHEDULE_TEXT.loadingSchedule} />}>
      <SchedulePage />
    </Suspense>
  );
}
