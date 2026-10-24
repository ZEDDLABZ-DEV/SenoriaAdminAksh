"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DoctorAppointmentCard } from "@/components/doctor-appointments/doctor-appointment-card";
import { Alert, Button, ConfirmDialog, PageHeader, StateBlock } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { deleteDoctorAppointment, getDoctorAppointment, updateDoctorAppointment } from "@/lib/api/resources";
import type { DoctorAppointment, DoctorAppointmentStatus } from "@/lib/api/types";
import { collapseVisitStatus, routeParam } from "@/lib/format";

export default function DoctorAppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = routeParam(params.id);
  const router = useRouter();
  const [appointment, setAppointment] = useState<DoctorAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const next = await getDoctorAppointment(id);
      if (!next) {
        setAppointment(null);
        setError("Appointment not found");
        return;
      }
      setAppointment(next);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? "Appointment not found" : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setAppointment(null);
    void load();
  }, [load]);

  async function onStatus(status: DoctorAppointmentStatus) {
    if (!id) return;
    setPending(true);
    setActionError("");
    try {
      await updateDoctorAppointment(id, { status });
      await load();
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    setPending(true);
    setActionError("");
    try {
      await deleteDoctorAppointment(id);
      router.replace("/doctor-appointments");
    } catch (caught) {
      setActionError(caught instanceof ApiError && caught.status === 404 ? "Appointment not found" : errorMessage(caught));
      setConfirmDelete(false);
    } finally {
      setPending(false);
    }
  }

  if (loading && !appointment) return <StateBlock title="Loading doctor's appointment" />;
  if (error && !appointment) {
    return (
      <StateBlock
        title={error}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
            <Link href="/doctor-appointments">
              <Button variant="secondary">Back to doctor appointments</Button>
            </Link>
          </div>
        }
      />
    );
  }
  if (!appointment) return <StateBlock title="Appointment not found" />;

  const status = collapseVisitStatus(appointment.status);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Doctor appointments"
        title={appointment.clientName || "Doctor's appointment"}
        description={appointment.clientId ? undefined : "No client is attached to this appointment."}
        action={
          <div className="flex flex-wrap gap-2">
            {appointment.clientId ? (
              <Link href={`/clients/${appointment.clientId}`}>
                <Button variant="secondary">View client</Button>
              </Link>
            ) : null}
            <Link href={`/doctor-appointments/${appointment.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            {status !== "completed" ? (
              <Button onClick={() => void onStatus("completed")} disabled={pending}>
                Mark completed
              </Button>
            ) : null}
            {status !== "cancelled" ? (
              <Button variant="secondary" onClick={() => void onStatus("cancelled")} disabled={pending}>
                Mark cancelled
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={pending}>
              Delete
            </Button>
          </div>
        }
      />
      {actionError || error ? <Alert>{actionError || error}</Alert> : null}
      <DoctorAppointmentCard appointment={appointment} />
      <Link href="/doctor-appointments" className="block">
        <Button variant="secondary" className="w-full">
          Back to doctor appointments
        </Button>
      </Link>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this doctor's appointment?"
        body="The appointment is removed. This cannot be undone."
        confirmLabel="Delete appointment"
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
