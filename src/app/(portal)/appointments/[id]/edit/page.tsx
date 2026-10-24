"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { PageHeader, StateBlock } from "@/components/ui";
import { routeParam } from "@/lib/format";

function EditAppointment() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = routeParam(params.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Schedule" title="Edit appointment" description="The client stays on the visit. Notes left blank are cleared." />
      <AppointmentForm mode="edit" appointmentId={id} seriesId={search.get("seriesId") ?? ""} />
    </div>
  );
}

export default function EditAppointmentPage() {
  return (
    <Suspense fallback={<StateBlock title="Loading the form" />}>
      <EditAppointment />
    </Suspense>
  );
}
