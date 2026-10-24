"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DoctorAppointmentCard } from "@/components/doctor-appointments/doctor-appointment-card";
import { Alert, Button, Panel } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { listClientDoctorAppointments } from "@/lib/api/resources";
import type { DoctorAppointment } from "@/lib/api/types";

function bySchedule(left: DoctorAppointment, right: DoctorAppointment): number {
  return left.scheduledDate.localeCompare(right.scheduledDate) || left.startTime.localeCompare(right.startTime);
}

export function ClientDoctorAppointments({
  clientId,
  embedded,
}: {
  clientId: string;
  embedded: DoctorAppointment[];
}) {
  const [rows, setRows] = useState<DoctorAppointment[]>(embedded);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listClientDoctorAppointments(clientId)
      .then((items) => {
        if (!cancelled) setRows(items.filter((item) => item.clientId === clientId));
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(errorMessage(caught));
        setRows(embedded);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, embedded, reloadKey]);

  const visible = [...rows].sort(bySchedule);

  return (
    <Panel
      id="doctor-appointments"
      title="Doctor appointments"
      action={
        <Link href={`/doctor-appointments/new?clientId=${encodeURIComponent(clientId)}`}>
          <Button variant="secondary">New doctor appointment</Button>
        </Link>
      }
    >
      {loading && visible.length === 0 ? <p className="text-sm text-muted">Loading doctor appointments…</p> : null}
      {error ? (
        <div className="mb-3">
          <Alert>
            {error}{" "}
            <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          </Alert>
        </div>
      ) : null}
      {!loading && visible.length === 0 ? <p className="text-sm text-muted">No doctor appointments for this client.</p> : null}
      {visible.length > 0 ? (
        <div className="space-y-4">
          {visible.map((appointment) => (
            <DoctorAppointmentCard
              key={appointment.id}
              appointment={appointment}
              action={
                <Link href={`/doctor-appointments/${appointment.id}`} className="text-sm font-semibold text-pine hover:underline">
                  Open
                </Link>
              }
            />
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
