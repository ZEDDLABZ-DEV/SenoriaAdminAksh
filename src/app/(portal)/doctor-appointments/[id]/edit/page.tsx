"use client";

import { useParams } from "next/navigation";
import { DoctorAppointmentForm } from "@/components/doctor-appointments/doctor-appointment-form";
import { PageHeader } from "@/components/ui";
import { routeParam } from "@/lib/format";

export default function EditDoctorAppointmentPage() {
  const params = useParams<{ id: string }>();
  const id = routeParam(params.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Doctor appointments"
        title="Edit doctor's appointment"
        description="Only the fields you change are saved. The type list comes from Settings."
      />
      <DoctorAppointmentForm mode="edit" appointmentId={id} />
    </div>
  );
}
