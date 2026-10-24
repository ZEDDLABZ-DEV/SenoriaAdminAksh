"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, ConfirmDialog, DefinitionList, PageHeader, Panel, StateBlock } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { deleteAppointment, getAppointment } from "@/lib/api/resources";
import type { AppointmentDetail } from "@/lib/api/types";
import {
  collapseVisitStatus,
  formatClock,
  formatLocalDateTime,
  fullName,
  routeParam,
  utcAppointmentDay,
  visitStatusLabel,
} from "@/lib/format";

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = routeParam(params.id);
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const detail = await getAppointment(id);
      if (!detail) {
        setAppointment(null);
        setError("Appointment not found");
        return;
      }
      setAppointment(detail);
    } catch (caught) {
      setAppointment(null);
      setError(caught instanceof ApiError && caught.status === 404 ? "Appointment not found" : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete() {
    setPending(true);
    try {
      await deleteAppointment(id);
      router.replace("/appointments");
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? "Appointment not found" : errorMessage(caught));
      setConfirmDelete(false);
    } finally {
      setPending(false);
    }
  }

  if (loading) return <StateBlock title="Loading appointment" />;
  if (error && !appointment) {
    return (
      <StateBlock
        title={error}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!appointment) return <StateBlock title="Appointment not found" />;

  const status = collapseVisitStatus(appointment.appointmentStatus);
  const day = utcAppointmentDay(appointment.scheduledDate);
  const clientName = fullName(appointment.client?.firstName, appointment.client?.lastName, "Client");
  const caregiverName = fullName(appointment.caregiver?.firstName, appointment.caregiver?.lastName, "Caregiver");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Appointment"
        title={day.label}
        description={`${formatClock(appointment.startTime)} – ${formatClock(appointment.endTime)}`}
        action={
          <div className="flex gap-2">
            <Link href={`/appointments/${appointment.id}/edit`}>
              <Button>Edit</Button>
            </Link>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        }
      />
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Badge tone={status === "completed" ? "good" : status === "cancelled" ? "bad" : "neutral"}>{visitStatusLabel(status)}</Badge>
      </div>
      <Panel title="Visit">
        <DefinitionList
          items={[
            { label: "Services", value: appointment.services.map((service) => service.name).join(", ") || "—" },
            { label: "Description", value: appointment.description || "—" },
            { label: "Instructions", value: appointment.instructions || "—" },
            { label: "Notes", value: appointment.notes || "—" },
            { label: "Check-in", value: appointment.checkInTime ? formatLocalDateTime(appointment.checkInTime) : "—" },
            { label: "Check-out", value: appointment.checkOutTime ? formatLocalDateTime(appointment.checkOutTime) : "—" },
          ]}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Client">
          <Party
            name={clientName}
            phone={appointment.client?.phone}
            email={appointment.client?.email}
            href={appointment.clientId ? `/clients/${appointment.clientId}` : undefined}
          />
        </Panel>
        <Panel title="Caregiver">
          <Party name={caregiverName} phone={appointment.caregiver?.phone} email={appointment.caregiver?.email} />
        </Panel>
      </div>
      <Panel title="Location">
        <DefinitionList
          items={[
            { label: "Street", value: appointment.locationStreet || "—" },
            { label: "City", value: appointment.locationCity || "—" },
            { label: "State", value: appointment.locationState || "—" },
            { label: "Postal / zip", value: appointment.locationZipCode || "—" },
            { label: "Gate code", value: appointment.locationGateCode || "—" },
            { label: "Navigation", value: appointment.locationNavigation || "—" },
          ]}
        />
      </Panel>
      <Panel title="Tasks">
        {appointment.tasks.length === 0 ? <p className="text-sm text-muted">No care-plan tasks on this visit.</p> : null}
        <ul className="space-y-2">
          {appointment.tasks.map((task) => (
            <li key={task.id || task.title} className="rounded-lg bg-paper px-3 py-2 text-sm">
              <span className="font-medium">{task.title || "Task"}</span>
              <span className="ml-2 text-muted">{task.isCompleted ? "Completed" : "Open"}</span>
              {task.description ? <span className="mt-1 block text-muted">{task.description}</span> : null}
            </li>
          ))}
        </ul>
      </Panel>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this appointment?"
        body="The visit is removed. This cannot be undone."
        confirmLabel="Delete appointment"
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}

function Party({ name, phone, email, href }: { name: string; phone?: string; email?: string; href?: string }) {
  return (
    <div className="text-sm">
      {href ? (
        <Link href={href} className="font-semibold text-pine hover:underline">
          {name}
        </Link>
      ) : (
        <p className="font-semibold">{name}</p>
      )}
      <p className="mt-2 text-muted">{phone || "No phone"}</p>
      <p className="text-muted">{email || "No email"}</p>
    </div>
  );
}
