"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DoctorAppointmentForm } from "@/components/doctor-appointments/doctor-appointment-form";
import { PageHeader, StateBlock } from "@/components/ui";

function NewDoctorAppointment() {
  const params = useSearchParams();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Doctor appointments"
        title="New doctor's appointment"
        description="Appointment types come from Settings. A new appointment is saved as scheduled."
      />
      <DoctorAppointmentForm mode="create" initialClientId={params.get("clientId") ?? ""} />
    </div>
  );
}

export default function NewDoctorAppointmentPage() {
  return (
    <Suspense fallback={<StateBlock title="Loading the form" />}>
      <NewDoctorAppointment />
    </Suspense>
  );
}
