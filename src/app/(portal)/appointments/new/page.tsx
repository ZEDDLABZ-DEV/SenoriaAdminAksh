"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { Button, PageHeader, StateBlock } from "@/components/ui";
import { SCHEDULE_TEXT, newSeriesHref } from "@/lib/schedule";

function NewAppointment() {
  const params = useSearchParams();
  const clientId = params.get("clientId") ?? "";
  const caregiverId = params.get("caregiverId") ?? "";
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Schedule"
        title="New appointment"
        description="One date and time. The same caregiver may have another visit that starts when this one ends."
        action={
          <Link href={newSeriesHref({ clientId, caregiverId })}>
            <Button variant="secondary">{SCHEDULE_TEXT.scheduleVisits}</Button>
          </Link>
        }
      />
      <AppointmentForm
        mode="create"
        initialClientId={clientId}
        initialCaregiverId={caregiverId}
        initialDate={params.get("date") ?? ""}
        initialStartTime={params.get("startTime") ?? ""}
        initialEndTime={params.get("endTime") ?? ""}
      />
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<StateBlock title="Loading the form" />}>
      <NewAppointment />
    </Suspense>
  );
}
