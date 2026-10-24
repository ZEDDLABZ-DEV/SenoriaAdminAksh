"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, DefinitionList, Field, Modal, PageHeader, Panel, StateBlock, TextInput } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { endVisitSeries, getVisitSeries, listServices } from "@/lib/api/resources";
import type { NamedCatalogItem, VisitSeriesDetail, VisitSeriesOccurrence } from "@/lib/api/types";
import { collapseVisitStatus, formatCalendarDate, formatWeekdayDate, humanizeCode, routeParam, visitStatusLabel } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  compareYmd,
  defaultSeriesFromDate,
  editVisitHref,
  formatRange,
  formatTimeRange,
  isPastDate,
  isYmd,
  monthOf,
  scheduleToday,
  seriesDaysLabel,
  seriesStatusLabel,
  seriesStatusTone,
  timeSlotsLabel,
  weekdaysLabel,
} from "@/lib/schedule";

export default function SeriesDetailPage() {
  const params = useParams<{ id: string }>();
  const id = routeParam(params.id);
  const toast = useToast();
  const text = SCHEDULE_TEXT.series;
  const today = scheduleToday();

  const [series, setSeries] = useState<VisitSeriesDetail | null>(null);
  const [services, setServices] = useState<NamedCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);
  const [endFrom, setEndFrom] = useState("");
  const [endError, setEndError] = useState("");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [detail, serviceRows] = await Promise.all([getVisitSeries(id), listServices().catch(() => [] as NamedCatalogItem[])]);
      setServices(serviceRows);
      if (!detail) {
        setSeries(null);
        setError(text.notFound);
        return;
      }
      setSeries(detail);
    } catch (caught) {
      setSeries(null);
      setError(caught instanceof ApiError && caught.status === 404 ? text.notFound : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id, text.notFound]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => groupByDate(series?.occurrences ?? []), [series]);

  function openEnd() {
    if (!series) return;
    setEndFrom(defaultSeriesFromDate(series.startDate, today));
    setEndError("");
    setEnding(true);
  }

  async function onEnd() {
    if (!series) return;
    if (!isYmd(endFrom)) {
      setEndError(text.errors.fromDate);
      return;
    }
    if (isPastDate(endFrom, today)) {
      setEndError(text.errors.fromPast);
      return;
    }
    setPending(true);
    setActionError("");
    try {
      const result = await endVisitSeries(series.id, endFrom);
      toast.success(text.ended(result.removedCount));
      setEnding(false);
      await load();
    } catch (caught) {
      setActionError(errorMessage(caught));
      setEnding(false);
    } finally {
      setPending(false);
    }
  }

  if (loading) return <StateBlock title={text.detailLoading} />;
  if (error && !series) {
    return (
      <StateBlock
        title={error}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!series) return <StateBlock title={text.notFound} />;

  const serviceNames = series.serviceIds.map((serviceId) => services.find((item) => item.id === serviceId)?.name ?? serviceId);
  const active = series.status === "active";
  const calendarHref = `/schedule?month=${monthOf(compareYmd(series.startDate, today) > 0 ? series.startDate : today)}&caregiverIds=${encodeURIComponent(series.caregiverId)}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={text.eyebrow}
        title={series.clientName || "Client"}
        description={`${series.caregiverName || "Caregiver"} · ${formatRange(series.startDate, series.endDate)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={calendarHref}>
              <Button variant="secondary">{text.backToCalendar}</Button>
            </Link>
            {active ? (
              <>
                <Link href={`/schedule/series/${encodeURIComponent(series.id)}/edit`}>
                  <Button>{text.edit}</Button>
                </Link>
                <Button variant="danger" onClick={openEnd} disabled={pending}>
                  {text.end}
                </Button>
              </>
            ) : null}
          </div>
        }
      />
      {actionError ? <Alert>{actionError}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Badge tone={seriesStatusTone(series.status)}>{seriesStatusLabel(series.status)}</Badge>
        <Badge>{seriesDaysLabel(series)}</Badge>
        <Badge>{timeSlotsLabel(series.timeSlots)}</Badge>
      </div>
      <Panel title="Schedule">
        <DefinitionList
          items={[
            {
              label: text.client,
              value: series.clientId ? (
                <Link href={`/clients/${series.clientId}`} className="font-semibold text-pine hover:underline">
                  {series.clientName || "Client"}
                </Link>
              ) : (
                series.clientName
              ),
            },
            {
              label: text.caregiver,
              value: series.caregiverId ? (
                <Link href={`/caregivers/${series.caregiverId}`} className="font-semibold text-pine hover:underline">
                  {series.caregiverName || "Caregiver"}
                </Link>
              ) : (
                series.caregiverName
              ),
            },
            { label: text.startDate, value: formatCalendarDate(series.startDate) },
            { label: text.endDate, value: formatCalendarDate(series.endDate) },
            series.dates
              ? { label: text.selectedDates, value: <SelectedDates dates={series.dates} /> }
              : { label: text.repeatOn, value: weekdaysLabel(series.weekdays) },
            { label: text.visitTimes, value: timeSlotsLabel(series.timeSlots) },
            { label: text.appointmentType, value: humanizeCode(series.appointmentType) },
            { label: "Services", value: serviceNames.join(", ") || "—" },
            { label: "Description", value: series.description || "—" },
            { label: "Instructions", value: series.instructions || "—" },
            { label: "Notes", value: series.notes || "—" },
          ]}
        />
      </Panel>
      <Panel title="Location">
        <DefinitionList
          items={[
            { label: "Street", value: series.locationStreet || "—" },
            { label: "City", value: series.locationCity || "—" },
            { label: "State", value: series.locationState || "—" },
            { label: "Postal / zip", value: series.locationZipCode || "—" },
            { label: "Gate code", value: series.locationGateCode || "—" },
            { label: "Navigation", value: series.locationNavigation || "—" },
          ]}
        />
      </Panel>
      <Panel title={`${text.occurrences} (${series.occurrences.length})`}>
        {grouped.length === 0 ? <p className="text-sm text-muted">{text.occurrencesEmpty}</p> : null}
        <ul className="divide-y divide-line">
          {grouped.map(([date, items]) => {
            const past = compareYmd(date, today) < 0;
            return (
              <li key={date} className="grid gap-2 py-3 sm:grid-cols-[200px_minmax(0,1fr)]">
                <p className={`text-sm font-semibold ${past ? "text-muted" : "text-ink"}`}>
                  {formatWeekdayDate(date)}
                  {date === today ? <Badge tone="good">{SCHEDULE_TEXT.today}</Badge> : null}
                </p>
                <ul className="space-y-1.5">
                  {items.map((item) => {
                    const status = collapseVisitStatus(item.appointmentStatus);
                    return (
                      <li key={item.appointmentId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="flex flex-wrap items-center gap-2">
                          <Link href={`/appointments/${item.appointmentId}`} className="font-medium text-pine hover:underline">
                            {formatTimeRange(item.startTime, item.endTime)}
                          </Link>
                          <Badge tone={status === "completed" ? "good" : status === "cancelled" ? "bad" : "neutral"}>
                            {item.appointmentStatus ? humanizeCode(item.appointmentStatus) : visitStatusLabel(status)}
                          </Badge>
                          {item.isException ? <Badge tone="warn">{SCHEDULE_TEXT.day.edited}</Badge> : null}
                          {item.caregiverId && item.caregiverId !== series.caregiverId ? <Badge tone="warn">Other caregiver</Badge> : null}
                        </span>
                        <Link href={editVisitHref(item.appointmentId, series.id)} className="text-xs font-semibold text-pine hover:underline">
                          {SCHEDULE_TEXT.day.edit}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Modal
        open={ending}
        title={text.endTitle}
        description={text.endBody(isYmd(endFrom) ? formatCalendarDate(endFrom) : "the chosen date")}
        pending={pending}
        onClose={() => setEnding(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEnding(false)} disabled={pending}>
              Keep schedule
            </Button>
            <Button variant="danger" onClick={() => void onEnd()} disabled={pending}>
              {pending ? "Working…" : text.endConfirm}
            </Button>
          </>
        }
      >
        <Field label={text.endFrom} error={endError}>
          <TextInput type="date" value={endFrom} min={today} disabled={pending} onChange={(event) => setEndFrom(event.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

function SelectedDates({ dates }: { dates: string[] }) {
  if (dates.length === 0) return "—";
  return (
    <span className="flex flex-wrap gap-1.5">
      {dates.map((date) => (
        <Badge key={date}>{formatCalendarDate(date)}</Badge>
      ))}
    </span>
  );
}

function groupByDate(items: VisitSeriesOccurrence[]): Array<[string, VisitSeriesOccurrence[]]> {
  const map = new Map<string, VisitSeriesOccurrence[]>();
  for (const item of items) {
    const list = map.get(item.date) ?? [];
    list.push(item);
    map.set(item.date, list);
  }
  return [...map.entries()]
    .sort(([left], [right]) => compareYmd(left, right))
    .map(([date, list]) => [date, [...list].sort((a, b) => a.startTime.localeCompare(b.startTime))]);
}
