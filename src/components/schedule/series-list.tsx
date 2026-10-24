"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Panel, SegmentedControl } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { listVisitSeries } from "@/lib/api/resources";
import type { VisitSeries, VisitSeriesQuery, VisitSeriesStatus } from "@/lib/api/types";
import { formatCalendarDate } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  compareYmd,
  formatRange,
  newSeriesHref,
  seriesDaysLabel,
  seriesHref,
  seriesStatusLabel,
  seriesStatusTone,
  timeSlotsLabel,
} from "@/lib/schedule";

export type SeriesStatusFilter = VisitSeriesStatus | "all";

export const SERIES_STATUS_OPTIONS: Array<{ id: SeriesStatusFilter; label: string }> = [
  { id: "active", label: SCHEDULE_TEXT.series.statusActive },
  { id: "ended", label: SCHEDULE_TEXT.series.statusEnded },
  { id: "all", label: SCHEDULE_TEXT.series.statusAll },
];

export function useVisitSeriesList(query: VisitSeriesQuery, reloadKey = 0) {
  const [rows, setRows] = useState<VisitSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { caregiverId, clientId, status } = query;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listVisitSeries({ caregiverId, clientId, status });
      setRows([...list].sort((left, right) => compareYmd(right.startDate, left.startDate)));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [caregiverId, clientId, status]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  return { rows, loading, error, reload: load };
}

export function SeriesTable({
  rows,
  hideClient = false,
  hideCaregiver = false,
  compact = false,
}: {
  rows: VisitSeries[];
  hideClient?: boolean;
  hideCaregiver?: boolean;
  compact?: boolean;
}) {
  const columns = SCHEDULE_TEXT.series.columns;
  const cell = compact ? "py-2 pr-3" : "px-4 py-3";
  const head = compact ? "text-xs tracking-wide text-muted uppercase" : "bg-paper text-xs tracking-wide text-muted uppercase";
  return (
    <div className={compact ? "overflow-x-auto" : "overflow-x-auto rounded-2xl border border-line bg-card"}>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className={head}>
          <tr>
            {!hideClient ? <th className={`${cell} font-semibold`}>{columns.client}</th> : null}
            {!hideCaregiver ? <th className={`${cell} font-semibold`}>{columns.caregiver}</th> : null}
            <th className={`${cell} font-semibold`}>{columns.range}</th>
            <th className={`${cell} font-semibold`}>{columns.days}</th>
            <th className={`${cell} font-semibold`}>{columns.times}</th>
            <th className={`${cell} font-semibold`}>{columns.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line">
              {!hideClient ? (
                <td className={cell}>
                  <Link href={seriesHref(row.id)} className="font-semibold text-pine hover:underline">
                    {row.clientName || "Client"}
                  </Link>
                </td>
              ) : null}
              {!hideCaregiver ? (
                <td className={cell}>
                  {hideClient ? (
                    <Link href={seriesHref(row.id)} className="font-semibold text-pine hover:underline">
                      {row.caregiverName || "Caregiver"}
                    </Link>
                  ) : (
                    row.caregiverName || "—"
                  )}
                </td>
              ) : null}
              <td className={cell}>
                {hideClient && hideCaregiver ? (
                  <Link href={seriesHref(row.id)} className="font-semibold text-pine hover:underline">
                    {formatRange(row.startDate, row.endDate)}
                  </Link>
                ) : (
                  formatRange(row.startDate, row.endDate)
                )}
              </td>
              <td className={cell} title={row.dates?.map((date) => formatCalendarDate(date)).join(", ") || undefined}>
                {seriesDaysLabel(row)}
              </td>
              <td className={cell}>{timeSlotsLabel(row.timeSlots)}</td>
              <td className={cell}>
                <Badge tone={seriesStatusTone(row.status)}>{seriesStatusLabel(row.status)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Panel for a client or caregiver detail page. */
export function SeriesPanel({
  caregiverId,
  clientId,
}: {
  caregiverId?: string;
  clientId?: string;
}) {
  const [status, setStatus] = useState<SeriesStatusFilter>("active");
  const { rows, loading, error, reload } = useVisitSeriesList({
    caregiverId,
    clientId,
    status: status === "all" ? undefined : status,
  });

  return (
    <Panel
      id="recurring"
      title={SCHEDULE_TEXT.series.listTitle}
      action={
        <Link href={newSeriesHref({ caregiverId, clientId })}>
          <Button variant="secondary">{SCHEDULE_TEXT.scheduleVisits}</Button>
        </Link>
      }
    >
      <div className="mb-4">
        <SegmentedControl<SeriesStatusFilter> label="Status" value={status} options={SERIES_STATUS_OPTIONS} onChange={setStatus} />
      </div>
      {loading ? <p className="text-sm text-muted">{SCHEDULE_TEXT.series.listLoading}…</p> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void reload()}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && rows.length === 0 ? <p className="text-sm text-muted">{SCHEDULE_TEXT.series.empty}.</p> : null}
      {rows.length > 0 ? <SeriesTable rows={rows} hideClient={Boolean(clientId)} hideCaregiver={Boolean(caregiverId)} compact /> : null}
    </Panel>
  );
}
