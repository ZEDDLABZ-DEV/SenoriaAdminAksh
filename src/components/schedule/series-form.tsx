"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPanel } from "@/components/date-calendar";
import { caregiverOptions, clientOptions, Picker, ServicePicker } from "@/components/pickers";
import { BookingIssueDialogs, BookingOutcome, useBookingFlow } from "@/components/schedule/booking-flow";
import { useToast } from "@/components/toast";
import { Alert, Button, Field, Panel, SegmentedControl, TextArea, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import {
  createVisitSeries,
  getClient,
  listAllCaregivers,
  listAllClients,
  listServices,
  updateVisitSeries,
} from "@/lib/api/resources";
import type {
  BookingConflict,
  BookingFlags,
  BookingWarning,
  CaregiverRecord,
  ClientRecord,
  NamedCatalogItem,
  TimeSlot,
  VisitSeriesDetail,
} from "@/lib/api/types";
import { formatCalendarDate, formatWeekdayDate, navigationFieldValue, navigationPayload, toHhmm } from "@/lib/format";
import {
  ALL_WEEKDAYS,
  REGULAR_VISIT_TYPE,
  SCHEDULE_TEXT,
  SERIES_MAX_RANGE_DAYS,
  SERIES_MAX_TIME_SLOTS,
  SERIES_MIN_TIME_SLOTS,
  WEEKDAY_SHORT,
  WORK_WEEKDAYS,
  compareYmd,
  dayOfMonth,
  defaultSeriesFromDate,
  isPastDate,
  isYmd,
  monthOf,
  normalizeSeriesDates,
  normalizeSlot,
  plannedVisitCount,
  sameWeekdays,
  scheduleToday,
  seriesDatesError,
  seriesHref,
  sortSlots,
  timeSlotsError,
} from "@/lib/schedule";
import { inclusiveDayCount } from "@/lib/visit-report";

interface DraftSlot extends TimeSlot {
  key: number;
}

interface Outcome {
  seriesId: string;
  caregiverId: string;
  startDate: string;
  createdCount: number;
  removedCount: number | null;
  skipped: BookingConflict[];
  warnings: BookingWarning[];
}

let slotKey = 0;
function nextSlotKey(): number {
  slotKey += 1;
  return slotKey;
}

function draftSlots(slots: TimeSlot[]): DraftSlot[] {
  return slots.map((slot) => ({ ...slot, key: nextSlotKey() }));
}

export function SeriesForm({
  mode,
  series,
  initialClientId = "",
  initialCaregiverId = "",
}: {
  mode: "create" | "edit";
  series?: VisitSeriesDetail;
  initialClientId?: string;
  initialCaregiverId?: string;
}) {
  const toast = useToast();
  const text = SCHEDULE_TEXT.series;
  const today = scheduleToday();
  const booking = useBookingFlow<Outcome>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverRecord[]>([]);
  const [services, setServices] = useState<NamedCatalogItem[]>([]);
  const [servicesError, setServicesError] = useState("");

  const [clientId, setClientId] = useState(series?.clientId ?? initialClientId);
  const [caregiverId, setCaregiverId] = useState(series?.caregiverId ?? initialCaregiverId);
  const [dateMode, setDateMode] = useState<"repeat" | "dates">("repeat");
  const [startDate, setStartDate] = useState(series?.startDate ?? "");
  const [endDate, setEndDate] = useState(series?.endDate ?? "");
  const [fromDate, setFromDate] = useState(series ? defaultSeriesFromDate(series.startDate, today) : "");
  const [weekdays, setWeekdays] = useState<number[]>(series?.weekdays.length ? series.weekdays : ALL_WEEKDAYS);
  const [pickedDates, setPickedDates] = useState<string[]>(series?.dates ?? []);
  const [slots, setSlots] = useState<DraftSlot[]>(
    draftSlots(series?.timeSlots.length ? series.timeSlots : [{ startTime: "09:00", endTime: "10:00" }]),
  );
  const [serviceIds, setServiceIds] = useState<string[]>(series?.serviceIds ?? []);
  const [description, setDescription] = useState(series?.description ?? "");
  const [instructions, setInstructions] = useState(series?.instructions ?? "");
  const [notes, setNotes] = useState(series?.notes ?? "");
  const [locationStreet, setLocationStreet] = useState(series?.locationStreet ?? "");
  const [locationCity, setLocationCity] = useState(series?.locationCity ?? "");
  const [locationState, setLocationState] = useState(series?.locationState ?? "");
  const [locationZipCode, setLocationZipCode] = useState(series?.locationZipCode ?? "");
  const [locationGateCode, setLocationGateCode] = useState(series?.locationGateCode ?? "");
  const [locationNavigation, setLocationNavigation] = useState(navigationFieldValue(series?.locationNavigation));
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [clientRows, caregiverRows, serviceResult] = await Promise.all([
          mode === "create" ? listAllClients() : Promise.resolve([]),
          listAllCaregivers(),
          listServices().then(
            (rows) => ({ rows, error: "" }),
            (caught: unknown) => ({ rows: [] as NamedCatalogItem[], error: errorMessage(caught) }),
          ),
        ]);
        if (cancelled) return;
        setClients(clientRows);
        setCaregivers(caregiverRows);
        setServices(serviceResult.rows);
        setServicesError(serviceResult.error);
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "create" || !clientId) return;
    let cancelled = false;
    getClient(clientId)
      .then((client) => {
        if (cancelled || !client?.address) return;
        setLocationStreet((value) => value || client.address?.street || "");
        setLocationCity((value) => value || client.address?.city || "");
        setLocationState((value) => value || client.address?.state || "");
        setLocationZipCode((value) => value || client.address?.zipCode || "");
        setLocationGateCode((value) => value || client.address?.gateAccessCode || "");
        setLocationNavigation((value) => value || navigationFieldValue(client.address?.navigationInstructions));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId, mode]);

  const clientChoices = useMemo(() => clientOptions(clients), [clients]);
  const caregiverChoices = useMemo(() => caregiverOptions(caregivers), [caregivers]);
  const usingDates = mode === "edit" ? series?.dates != null : dateMode === "dates";

  const lockedDates = useMemo(() => {
    if (mode !== "edit" || series?.dates == null || !isYmd(fromDate)) return [];
    return normalizeSeriesDates(series.dates).filter((date) => compareYmd(date, fromDate) < 0);
  }, [mode, series, fromDate]);

  const submittedDates = useMemo(() => {
    const normalized = normalizeSeriesDates(pickedDates);
    if (!usingDates) return [];
    if (mode === "create") return normalized;
    if (!isYmd(fromDate)) return [];
    return normalized.filter((date) => compareYmd(date, fromDate) >= 0);
  }, [pickedDates, usingDates, mode, fromDate]);

  const selectedDates = useMemo(
    () => normalizeSeriesDates([...lockedDates, ...submittedDates]),
    [lockedDates, submittedDates],
  );

  const normalizedSlots = useMemo(() => sortSlots(slots.map((slot) => normalizeSlot({ startTime: slot.startTime, endTime: slot.endTime }))), [slots]);
  const previewFrom = mode === "edit" ? fromDate : startDate;
  const previewCount = usingDates
    ? mode === "edit" && !isYmd(fromDate)
      ? null
      : submittedDates.length * normalizedSlots.length
    : isYmd(previewFrom) && isYmd(endDate) && compareYmd(endDate, previewFrom) >= 0
      ? plannedVisitCount(previewFrom, endDate, weekdays, normalizedSlots.length)
      : null;
  const liveDatesError = usingDates ? seriesDatesError(submittedDates, today) : "";
  const datesError = fields.dates || (liveDatesError && liveDatesError !== text.errors.dates ? liveDatesError : "");

  function toggleDate(date: string) {
    if (!isYmd(date) || lockedDates.includes(date)) return;
    const selected = pickedDates.includes(date);
    const beforeEditable = isPastDate(date, today) || (mode === "edit" && (!isYmd(fromDate) || compareYmd(date, fromDate) < 0));
    if (!selected && beforeEditable) return;
    if (!selected && submittedDates.length >= SERIES_MAX_RANGE_DAYS) {
      setFields((current) => ({ ...current, dates: text.errors.datesTooMany }));
      return;
    }
    setPickedDates((current) => (current.includes(date) ? current.filter((item) => item !== date) : [...current, date]));
    setFields((current) => {
      if (!current.dates) return current;
      const next = { ...current };
      delete next.dates;
      return next;
    });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (mode === "create" && !clientId) next.clientId = text.errors.client;
    if (!caregiverId) next.caregiverId = text.errors.caregiver;
    if (usingDates) {
      if (mode === "edit") {
        if (!isYmd(fromDate)) next.fromDate = text.errors.fromDate;
        else if (isPastDate(fromDate, today)) next.fromDate = text.errors.fromPast;
      }
      const problem = seriesDatesError(submittedDates, today);
      if (problem) next.dates = problem;
    } else {
      if (mode === "create") {
        if (!isYmd(startDate)) next.startDate = text.errors.startDate;
        else if (isPastDate(startDate, today)) next.startDate = text.errors.startPast;
      } else {
        if (!isYmd(fromDate)) next.fromDate = text.errors.fromDate;
        else if (isPastDate(fromDate, today)) next.fromDate = text.errors.fromPast;
      }
      if (!isYmd(endDate)) next.endDate = text.errors.endDate;
      const rangeStart = mode === "create" ? startDate : fromDate;
      if (isYmd(rangeStart) && isYmd(endDate)) {
        const days = inclusiveDayCount(rangeStart, endDate) ?? 0;
        if (days < 1) next.endDate = text.errors.endBeforeStart;
        else if (days > SERIES_MAX_RANGE_DAYS) next.endDate = text.errors.tooLong;
      }
      if (weekdays.length === 0) next.weekdays = text.errors.weekdays;
    }
    if (slots.length < SERIES_MIN_TIME_SLOTS || slots.length > SERIES_MAX_TIME_SLOTS) next.timeSlots = text.errors.slots;
    else {
      const slotProblem = timeSlotsError(normalizedSlots, {
        missing: text.errors.slotTimes,
        order: text.errors.slotOrder,
        overlap: text.errors.slotOverlap,
      });
      if (slotProblem) next.timeSlots = slotProblem;
    }
    return next;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validate();
    setFields(next);
    if (Object.keys(next).length > 0) return;
    setError("");

    const location = {
      locationStreet: locationStreet.trim(),
      locationCity: locationCity.trim(),
      locationState: locationState.trim(),
      locationZipCode: locationZipCode.trim(),
      locationGateCode: locationGateCode.trim(),
      locationNavigation: navigationPayload(locationNavigation),
    };
    const details = {
      caregiverId,
      timeSlots: normalizedSlots,
      appointmentType: REGULAR_VISIT_TYPE,
      description: description.trim(),
      instructions: instructions.trim(),
      notes: notes.trim() ? notes : "",
      serviceIds,
    };
    const repeatDays = {
      endDate,
      weekdays: [...weekdays].sort((left, right) => left - right),
    };

    await booking.start({
      submit: async (flags: BookingFlags) => {
        if (mode === "create") {
          const presentLocation = Object.fromEntries(Object.entries(location).filter(([, value]) => value));
          const result = usingDates
            ? await createVisitSeries({
                ...details,
                ...presentLocation,
                clientId,
                dates: submittedDates,
                skipConflicts: flags.skipConflicts,
                acknowledgeWarnings: flags.acknowledgeWarnings,
              })
            : await createVisitSeries({
                ...details,
                ...presentLocation,
                ...repeatDays,
                clientId,
                startDate,
                skipConflicts: flags.skipConflicts,
                acknowledgeWarnings: flags.acknowledgeWarnings,
              });
          return {
            seriesId: result.series?.id ?? "",
            caregiverId,
            startDate: result.series?.startDate || submittedDates[0] || startDate,
            createdCount: result.createdCount,
            removedCount: null,
            skipped: result.skipped,
            warnings: result.warnings,
          };
        }
        if (!series) throw new Error(text.notFound);
        const result = usingDates
          ? await updateVisitSeries(series.id, {
              ...details,
              ...location,
              fromDate,
              dates: submittedDates,
              skipConflicts: flags.skipConflicts,
              acknowledgeWarnings: flags.acknowledgeWarnings,
            })
          : await updateVisitSeries(series.id, {
              ...details,
              ...location,
              ...repeatDays,
              fromDate,
              skipConflicts: flags.skipConflicts,
              acknowledgeWarnings: flags.acknowledgeWarnings,
            });
        return {
          seriesId: result.series?.id ?? series.id,
          caregiverId,
          startDate: result.fromDate || fromDate,
          createdCount: result.createdCount,
          removedCount: result.removedCount,
          skipped: result.skipped,
          warnings: result.warnings,
        };
      },
      onSuccess: (result) => {
        toast.success(
          result.removedCount == null ? text.created(result.createdCount) : text.updated(result.createdCount, result.removedCount),
        );
        setOutcome(result);
      },
      onError: (caught) => {
        setError(errorMessage(caught));
        setFields(fieldErrors(caught));
      },
    });
  }

  if (loading) return <p className="text-sm text-muted">Loading the form…</p>;

  if (outcome) {
    const calendarHref = `/schedule?month=${monthOf(outcome.startDate)}&caregiverIds=${encodeURIComponent(outcome.caregiverId)}`;
    return (
      <Panel title={outcome.removedCount == null ? text.created(outcome.createdCount) : text.updated(outcome.createdCount, outcome.removedCount)}>
        <div className="space-y-4">
          <BookingOutcome skipped={outcome.skipped} warnings={outcome.warnings} />
          <div className="flex flex-wrap gap-2">
            {outcome.seriesId ? (
              <Link href={seriesHref(outcome.seriesId)}>
                <Button>{text.viewSeries}</Button>
              </Link>
            ) : null}
            <Link href={calendarHref}>
              <Button variant="secondary">{text.backToCalendar}</Button>
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  const busy = booking.pending;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "create" ? (
          <Picker label={text.client} options={clientChoices} value={clientId} onChange={setClientId} error={fields.clientId} />
        ) : (
          <Field label={text.client}>
            <TextInput value={series?.clientName ?? ""} readOnly disabled />
          </Field>
        )}
        <Picker label={text.caregiver} options={caregiverChoices} value={caregiverId} onChange={setCaregiverId} error={fields.caregiverId} />
        {mode === "create" ? (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-ink">{text.dateChoice}</p>
            <SegmentedControl<"repeat" | "dates">
              label={text.dateChoice}
              value={dateMode}
              options={[
                { id: "repeat", label: text.repeatChoice },
                { id: "dates", label: text.pickDates },
              ]}
              onChange={(next) => {
                setDateMode(next);
                setFields({});
              }}
            />
          </div>
        ) : null}
        {mode === "edit" ? (
          <div className="sm:col-span-2">
            <Field label={text.applyFrom} hint={text.applyFromHint} error={fields.fromDate}>
              <TextInput
                type="date"
                value={fromDate}
                min={today}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  if (series?.dates == null) return;
                  setFields((current) => {
                    if (!current.dates) return current;
                    const next = { ...current };
                    delete next.dates;
                    return next;
                  });
                }}
              />
            </Field>
          </div>
        ) : null}
        {usingDates ? (
          <div className="sm:col-span-2">
            <DateCalendar
              selected={selectedDates}
              locked={lockedDates}
              today={today}
              minDate={mode === "edit" ? fromDate : today}
              error={datesError}
              hint={mode === "edit" ? text.datesEditHint : text.datesHint}
              onToggle={toggleDate}
            />
          </div>
        ) : (
          <>
            <Field label={text.startDate} hint={mode === "create" ? text.rangeHint : undefined} error={fields.startDate}>
              <TextInput
                type="date"
                value={startDate}
                min={mode === "create" ? today : undefined}
                disabled={mode === "edit"}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field label={text.endDate} error={fields.endDate}>
              <TextInput type="date" value={endDate} min={startDate || today} onChange={(event) => setEndDate(event.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <WeekdayChips value={weekdays} onChange={setWeekdays} error={fields.weekdays} />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <TimeSlotsEditor slots={slots} onChange={setSlots} error={fields.timeSlots} />
        </div>
        <div className="sm:col-span-2">
          <ServicePicker options={services} value={serviceIds} onChange={setServiceIds} error={fields.serviceIds || servicesError} />
        </div>
      </div>

      <Alert tone={previewCount == null || previewCount === 0 ? "info" : "success"}>
        {previewCount == null
          ? mode === "edit"
            ? text.errors.fromDate
            : text.rangeHint
          : previewCount === 0
            ? usingDates
              ? text.previewDatesNone
              : text.previewNone
            : mode === "edit"
              ? text.previewEdit(previewCount)
              : text.preview(previewCount)}
      </Alert>

      <Field label="Description" error={fields.description}>
        <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <Field label="Instructions" error={fields.instructions}>
        <TextArea value={instructions} onChange={(event) => setInstructions(event.target.value)} />
      </Field>
      <Field label="Notes" error={fields.notes}>
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Location</p>
        <p className="mb-3 text-xs text-muted">{text.locationHint}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street" error={fields.locationStreet}>
            <TextInput value={locationStreet} onChange={(event) => setLocationStreet(event.target.value)} />
          </Field>
          <Field label="City" error={fields.locationCity}>
            <TextInput value={locationCity} onChange={(event) => setLocationCity(event.target.value)} />
          </Field>
          <Field label="State" error={fields.locationState}>
            <TextInput value={locationState} onChange={(event) => setLocationState(event.target.value)} />
          </Field>
          <Field label="Postal / zip" error={fields.locationZipCode}>
            <TextInput value={locationZipCode} onChange={(event) => setLocationZipCode(event.target.value)} />
          </Field>
          <Field label="Gate code" error={fields.locationGateCode}>
            <TextInput value={locationGateCode} onChange={(event) => setLocationGateCode(event.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Navigation" error={fields.locationNavigation}>
              <TextArea value={locationNavigation} onChange={(event) => setLocationNavigation(event.target.value)} />
            </Field>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? text.submitCreate : text.submitEdit}
        </Button>
        {mode === "edit" && series ? (
          <Link href={seriesHref(series.id)}>
            <Button variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </Link>
        ) : null}
      </div>
      <BookingIssueDialogs flow={booking} allowSkip />
    </form>
  );
}

function DateCalendar({
  selected,
  locked,
  today,
  minDate,
  error,
  hint,
  onToggle,
}: {
  selected: string[];
  locked: string[];
  today: string;
  minDate: string;
  error?: string;
  hint: string;
  onToggle: (date: string) => void;
}) {
  const text = SCHEDULE_TEXT.series;
  const anchor = selected.find((date) => compareYmd(date, today) >= 0) ?? today;
  const [month, setMonth] = useState(() => monthOf(anchor));
  const selectedSet = new Set(selected);
  const lockedSet = new Set(locked);

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink">{text.selectedDates}</p>
      <p className="mb-2 text-xs text-muted">{hint}</p>
      <div className="rounded-xl border border-line bg-card p-3">
        <CalendarPanel
          month={month}
          onMonthChange={setMonth}
          minDate={minDate}
          today={today}
          focusDate={anchor}
          gridLabel={text.pickDates}
          renderDay={(date) => {
            const isSelected = selectedSet.has(date);
            const isLocked = lockedSet.has(date);
            const past = isPastDate(date, today);
            const beforeMin = isYmd(minDate) && compareYmd(date, minDate) < 0;
            const disabled = isLocked || ((past || beforeMin) && !isSelected);
            const todayRing = date === today ? "ring-1 ring-inset ring-pine" : "";
            const tone = isSelected
              ? isLocked || past
                ? "bg-paper text-muted ring-1 ring-pine/40"
                : "bg-pine text-white"
              : past || beforeMin
                ? "cursor-not-allowed text-muted/40"
                : "text-ink hover:bg-moss";
            return (
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={isLocked ? `${formatWeekdayDate(date)}, kept` : formatWeekdayDate(date)}
                disabled={disabled}
                onClick={() => onToggle(date)}
                className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition ${tone} ${todayRing}`}
              >
                {dayOfMonth(date)}
              </button>
            );
          }}
        />
        <p className="mt-3 text-xs font-semibold text-muted">{text.pickedCount(selected.length)}</p>
        <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-auto">
          {selected.length === 0 ? <p className="text-xs text-muted">{text.datesPlaceholder}</p> : null}
          {selected.map((date) =>
            lockedSet.has(date) ? (
              <span key={date} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">
                {formatCalendarDate(date)}
              </span>
            ) : (
              <button
                key={date}
                type="button"
                className="rounded-full bg-moss px-2.5 py-1 text-xs font-semibold text-pine-dark"
                aria-label={`Remove ${formatCalendarDate(date)}`}
                onClick={() => onToggle(date)}
              >
                {formatCalendarDate(date)}
                <span className="ml-1" aria-hidden>
                  ×
                </span>
              </button>
            ),
          )}
        </div>
        {locked.length > 0 ? <p className="mt-2 text-xs text-muted">{text.datesLocked}</p> : null}
      </div>
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function WeekdayChips({ value, onChange, error }: { value: number[]; onChange: (days: number[]) => void; error?: string }) {
  const text = SCHEDULE_TEXT.series;
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((item) => item !== day) : [...value, day]);
  }
  const presetClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ring-1 ${active ? "bg-ink text-white ring-ink" : "bg-card text-pine ring-line hover:bg-moss"}`;
  return (
    <Field label={text.repeatOn} error={error}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={text.repeatOn}>
          {WEEKDAY_SHORT.map((label, day) => {
            const active = value.includes(day);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                className={`min-w-11 rounded-lg px-2.5 py-2 text-sm font-semibold ring-1 transition ${
                  active ? "bg-pine text-white ring-pine" : "bg-card text-muted ring-line hover:text-ink"
                }`}
                onClick={() => toggle(day)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <button type="button" className={presetClass(sameWeekdays(value, ALL_WEEKDAYS))} onClick={() => onChange(ALL_WEEKDAYS)}>
            {text.everyDay}
          </button>
          <button type="button" className={presetClass(sameWeekdays(value, WORK_WEEKDAYS))} onClick={() => onChange(WORK_WEEKDAYS)}>
            {text.weekdays}
          </button>
        </div>
      </div>
    </Field>
  );
}

function TimeSlotsEditor({
  slots,
  onChange,
  error,
}: {
  slots: DraftSlot[];
  onChange: (slots: DraftSlot[]) => void;
  error?: string;
}) {
  const text = SCHEDULE_TEXT.series;
  function update(key: number, patch: Partial<TimeSlot>) {
    onChange(slots.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)));
  }
  function add() {
    if (slots.length >= SERIES_MAX_TIME_SLOTS) return;
    const last = sortSlots(slots)[slots.length - 1];
    const start = last ? toHhmm(last.endTime) || "" : "09:00";
    onChange([...slots, { key: nextSlotKey(), startTime: start, endTime: start ? bump(start) : "" }]);
  }
  function remove(key: number) {
    if (slots.length <= SERIES_MIN_TIME_SLOTS) return;
    onChange(slots.filter((slot) => slot.key !== key));
  }
  return (
    <Field label={text.visitTimes} hint={text.timesHint} error={error}>
      <div className="space-y-2">
        {slots.map((slot, index) => (
          <div key={slot.key} className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-xs font-semibold text-muted">{index + 1}.</span>
            <TextInput type="time" aria-label={`Visit ${index + 1} start`} className="w-auto" value={slot.startTime} onChange={(event) => update(slot.key, { startTime: event.target.value })} />
            <span className="text-sm text-muted">to</span>
            <TextInput type="time" aria-label={`Visit ${index + 1} end`} className="w-auto" value={slot.endTime} onChange={(event) => update(slot.key, { endTime: event.target.value })} />
            <button
              type="button"
              className="text-sm font-semibold text-muted hover:text-danger disabled:opacity-40"
              onClick={() => remove(slot.key)}
              disabled={slots.length <= SERIES_MIN_TIME_SLOTS}
            >
              {text.removeTime}
            </button>
          </div>
        ))}
        <Button variant="ghost" onClick={add} disabled={slots.length >= SERIES_MAX_TIME_SLOTS}>
          {text.addTime}
        </Button>
      </div>
    </Field>
  );
}

function bump(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return "";
  const hour = Math.min(23, Number(match[1]) + 1);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
