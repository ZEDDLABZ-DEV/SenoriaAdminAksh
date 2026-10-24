"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SeriesForm } from "@/components/schedule/series-form";
import { Alert, Button, PageHeader, StateBlock } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { getVisitSeries } from "@/lib/api/resources";
import type { VisitSeriesDetail } from "@/lib/api/types";
import { routeParam } from "@/lib/format";
import { SCHEDULE_TEXT } from "@/lib/schedule";

export default function EditSeriesPage() {
  const params = useParams<{ id: string }>();
  const id = routeParam(params.id);
  const text = SCHEDULE_TEXT.series;
  const [series, setSeries] = useState<VisitSeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const detail = await getVisitSeries(id);
      if (!detail) {
        setError(text.notFound);
        return;
      }
      setSeries(detail);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? text.notFound : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id, text.notFound]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={text.eyebrow} title={text.editTitle} description={text.editDescription} />
      {loading ? <StateBlock title={text.detailLoading} /> : null}
      {!loading && error ? (
        <StateBlock
          title={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : null}
      {!loading && !error && series && series.status !== "active" ? <Alert tone="info">This schedule has ended and can no longer be edited.</Alert> : null}
      {!loading && !error && series && series.status === "active" ? <SeriesForm mode="edit" series={series} /> : null}
    </div>
  );
}
