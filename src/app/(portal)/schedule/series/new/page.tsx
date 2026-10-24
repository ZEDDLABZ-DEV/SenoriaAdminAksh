"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SeriesForm } from "@/components/schedule/series-form";
import { PageHeader, StateBlock } from "@/components/ui";
import { SCHEDULE_TEXT } from "@/lib/schedule";

function NewSeries() {
  const params = useSearchParams();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={SCHEDULE_TEXT.nav} title={SCHEDULE_TEXT.series.newTitle} description={SCHEDULE_TEXT.series.newDescription} />
      <SeriesForm mode="create" initialClientId={params.get("clientId") ?? ""} initialCaregiverId={params.get("caregiverId") ?? ""} />
    </div>
  );
}

export default function NewSeriesPage() {
  return (
    <Suspense fallback={<StateBlock title="Loading the form" />}>
      <NewSeries />
    </Suspense>
  );
}
