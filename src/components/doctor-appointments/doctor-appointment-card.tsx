import type { ReactNode } from "react";
import { Badge, Panel } from "@/components/ui";
import type { DoctorAppointment } from "@/lib/api/types";
import { collapseVisitStatus, formatClock, formatWeekdayDate, visitStatusLabel, type VisitStatus } from "@/lib/format";

function statusTone(status: VisitStatus): "good" | "bad" | "neutral" {
  if (status === "completed") return "good";
  if (status === "cancelled") return "bad";
  return "neutral";
}

export function DoctorAppointmentCard({
  appointment,
  action,
}: {
  appointment: DoctorAppointment;
  action?: ReactNode;
}) {
  const status = collapseVisitStatus(appointment.status);
  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: "Status", value: visitStatusLabel(status) },
    { label: "Doctor", value: appointment.doctorName },
    { label: "Specialty", value: appointment.specialty },
    { label: "Phone", value: appointment.phone, href: appointment.phone ? `tel:${appointment.phone}` : undefined },
    { label: "Clinic", value: appointment.clinicName },
    { label: "Scheduled Date", value: formatWeekdayDate(appointment.scheduledDate) },
    { label: "Start Time", value: formatClock(appointment.startTime) },
    { label: "End Time", value: formatClock(appointment.endTime) },
    { label: "Description", value: appointment.description },
  ];

  return (
    <Panel title={appointment.typeName || "Doctor's appointment"} action={action}>
      <div className="mb-2">
        <Badge tone={statusTone(status)}>{visitStatusLabel(status)}</Badge>
      </div>
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm text-muted">{row.label}</dt>
            <dd className="text-sm font-medium whitespace-pre-wrap text-ink">
              {row.href && row.value ? (
                <a href={row.href} className="text-pine hover:underline">
                  {row.value}
                </a>
              ) : (
                row.value || "—"
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
