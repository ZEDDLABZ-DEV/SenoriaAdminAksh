"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { caregiverOptions, clientOptions, Picker } from "@/components/pickers";
import { SERIES_STATUS_OPTIONS, SeriesTable, useVisitSeriesList, type SeriesStatusFilter } from "@/components/schedule/series-list";
import { Alert, Button, PageHeader, SegmentedControl, StateBlock } from "@/components/ui";
import { listAllCaregivers, listAllClients } from "@/lib/api/resources";
import type { CaregiverRecord, ClientRecord } from "@/lib/api/types";
import { SCHEDULE_TEXT, newSeriesHref } from "@/lib/schedule";

function SeriesListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const statusParam = params.get("status");
  const status: SeriesStatusFilter = statusParam === "ended" || statusParam === "all" ? statusParam : "active";
  const caregiverId = params.get("caregiverId") ?? "";
  const clientId = params.get("clientId") ?? "";

  const [caregivers, setCaregivers] = useState<CaregiverRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    listAllCaregivers()
      .then((rows) => {
        if (!cancelled) setCaregivers(rows);
      })
      .catch(() => undefined);
    listAllClients()
      .then((rows) => {
        if (!cancelled) setClients(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const setQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const { rows, loading, error, reload } = useVisitSeriesList({
    caregiverId: caregiverId || undefined,
    clientId: clientId || undefined,
    status: status === "all" ? undefined : status,
  });

  const caregiverChoices = useMemo(() => caregiverOptions(caregivers), [caregivers]);
  const clientChoices = useMemo(() => clientOptions(clients), [clients]);

  return (
    <div>
      <PageHeader
        eyebrow={SCHEDULE_TEXT.nav}
        title={SCHEDULE_TEXT.series.listTitle}
        description={SCHEDULE_TEXT.series.listDescription}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/schedule">
              <Button variant="secondary">{SCHEDULE_TEXT.series.backToCalendar}</Button>
            </Link>
            <Link href={newSeriesHref({ caregiverId, clientId })}>
              <Button>{SCHEDULE_TEXT.scheduleVisits}</Button>
            </Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <SegmentedControl<SeriesStatusFilter>
          label="Status"
          value={status}
          options={SERIES_STATUS_OPTIONS}
          onChange={(next) => setQuery({ status: next === "active" ? undefined : next })}
        />
        <Picker label={SCHEDULE_TEXT.series.client} options={clientChoices} value={clientId} onChange={(value) => setQuery({ clientId: value })} />
        <Picker label={SCHEDULE_TEXT.series.caregiver} options={caregiverChoices} value={caregiverId} onChange={(value) => setQuery({ caregiverId: value })} />
      </div>
      {loading ? <StateBlock title={SCHEDULE_TEXT.series.listLoading} /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void reload()}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && rows.length === 0 ? <StateBlock title={SCHEDULE_TEXT.series.empty} body={SCHEDULE_TEXT.series.emptyBody} /> : null}
      {rows.length > 0 ? <SeriesTable rows={rows} /> : null}
    </div>
  );
}

export default function SeriesListRoute() {
  return (
    <Suspense fallback={<StateBlock title={SCHEDULE_TEXT.series.listLoading} />}>
      <SeriesListPage />
    </Suspense>
  );
}
