"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CarePlanPanel } from "@/components/clients/care-plan-panel";
import { ClientDoctorAppointments } from "@/components/doctor-appointments/client-doctor-appointments";
import { HazardsPanel } from "@/components/clients/hazards-panel";
import { AddressEditor, DiagnosisEditor, EmergencyEditor, LanguageEditor, ProfileEditor } from "@/components/clients/record-editors";
import { SeriesPanel } from "@/components/schedule/series-list";
import { Alert, Avatar, Badge, Button, PageHeader, Panel, StateBlock } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { getClient } from "@/lib/api/resources";
import type { ClientRecord } from "@/lib/api/types";
import {
  ageFromDateOfBirth,
  careTypeLabel,
  clientStatusLabel,
  collapseVisitStatus,
  formatCalendarDate,
  formatClock,
  fullName,
  humanizeCode,
  initials,
  routeParam,
  serviceCategoryLabel,
  utcAppointmentDay,
  visitStatusLabel,
} from "@/lib/format";
import { SCHEDULE_TEXT, newSeriesHref } from "@/lib/schedule";

const anchors = [
  ["profile", "Profile"],
  ["emergency", "Emergency"],
  ["address", "Address"],
  ["diagnoses", "Diagnoses"],
  ["language", "Language"],
  ["hazards", "Hazards"],
  ["services", "Services"],
  ["care-plan", "Care plan"],
  ["appointments", "Appointments"],
  ["recurring", "Recurring"],
  ["doctor-appointments", "Doctors"],
];

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = routeParam(params.id);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const next = await getClient(id);
      if (!next) {
        setClient(null);
        setError("Client not found");
        return;
      }
      setClient(next);
      setRevision((value) => value + 1);
    } catch (caught) {
      setClient(null);
      setError(caught instanceof ApiError && caught.status === 404 ? "Client not found" : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !client) return <StateBlock title="Loading client" />;
  if (error && !client) {
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
  if (!client) return <StateBlock title="Client not found" />;

  const name = fullName(client.firstName, client.lastName, "Unnamed client");
  const age = ageFromDateOfBirth(client.dateOfBirth);
  const careType = careTypeLabel(client.serviceRequirements[0]?.category);
  const plan = client.carePlans[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Client"
        title={name}
        description={client.id}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/doctor-appointments/new?clientId=${encodeURIComponent(client.id)}`}>
              <Button variant="secondary">Doctor appointment</Button>
            </Link>
            <Link href={newSeriesHref({ clientId: client.id })}>
              <Button variant="secondary">{SCHEDULE_TEXT.scheduleVisits}</Button>
            </Link>
            <Link href={`/appointments/new?clientId=${encodeURIComponent(client.id)}`}>
              <Button>Schedule appointment</Button>
            </Link>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card p-5">
        <Avatar name={initials(client.firstName, client.lastName)} className="h-16 w-16 text-xl" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={client.status === "inactive" ? "warn" : "good"}>{clientStatusLabel(client.status)}</Badge>
            <Badge>{careType}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            {age == null ? "Age unknown" : `${age} years`}
            {client.dateOfBirth ? ` · ${formatCalendarDate(client.dateOfBirth)}` : ""} · {client.phone || "No phone"} ·{" "}
            {client.email || "No email"}
          </p>
        </div>
      </div>
      <nav className="sticky top-16 z-10 -mx-2 flex gap-2 overflow-x-auto bg-paper/95 px-2 py-2 backdrop-blur">
        {anchors.map(([anchor, label]) => (
          <a key={anchor} href={`#${anchor}`} className="rounded-full bg-card px-3 py-1 text-sm font-medium text-pine ring-1 ring-line">
            {label}
          </a>
        ))}
      </nav>
      <ProfileEditor key={`profile-${revision}`} client={client} onSaved={load} />
      <EmergencyEditor key={`emergency-${revision}`} client={client} onSaved={load} />
      <AddressEditor key={`address-${revision}`} client={client} onSaved={load} />
      <DiagnosisEditor key={`diagnosis-${revision}`} client={client} onSaved={load} />
      <LanguageEditor key={`language-${revision}`} client={client} onSaved={load} />
      <HazardsPanel clientId={client.id} />
      <Panel id="services" title="Service requirements">
        {client.serviceRequirements.length === 0 ? <p className="text-sm text-muted">No service requirements on this client.</p> : null}
        {client.serviceRequirements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Category</th>
                  <th className="py-2 pr-3 font-semibold">Frequency</th>
                  <th className="py-2 pr-3 font-semibold">Instructions</th>
                  <th className="py-2 font-semibold">Active</th>
                </tr>
              </thead>
              <tbody>
                {client.serviceRequirements.map((item) => (
                  <tr key={item.id || item.name} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{item.name || "—"}</span>
                      {item.description ? <span className="mt-1 block text-muted">{item.description}</span> : null}
                    </td>
                    <td className="py-2 pr-3">
                      {serviceCategoryLabel(item.category)}
                      {item.category ? <span className="mt-1 block text-xs text-muted">{item.category}</span> : null}
                    </td>
                    <td className="py-2 pr-3">{item.frequency || "—"}</td>
                    <td className="py-2 pr-3">{item.specialInstructions || "—"}</td>
                    <td className="py-2">{item.isActive ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
      <CarePlanPanel key={`plan-${revision}`} clientId={client.id} plan={plan} onChanged={load} />
      <Panel id="appointments" title="Appointments">
        {client.appointments.length === 0 ? <p className="text-sm text-muted">No appointments on this client.</p> : null}
        {client.appointments.length > 0 ? (
          <ul className="divide-y divide-line">
            {client.appointments.map((appointment) => {
              const day = utcAppointmentDay(appointment.scheduledDate);
              const status = collapseVisitStatus(appointment.appointmentStatus);
              return (
                <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/appointments/${appointment.id}`} className="font-semibold text-pine hover:underline">
                      {appointment.title || "Appointment"}
                    </Link>
                    <p className="text-sm text-muted">
                      {day.label} · {formatClock(appointment.startTime)}
                      {appointment.endTime ? ` – ${formatClock(appointment.endTime)}` : ""} ·{" "}
                      {humanizeCode(appointment.appointmentType)} · {appointment.caregiverName || "Unassigned"}
                    </p>
                  </div>
                  <Badge tone={status === "completed" ? "good" : status === "cancelled" ? "bad" : "neutral"}>
                    {visitStatusLabel(status)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Panel>
      <SeriesPanel clientId={client.id} />
      <ClientDoctorAppointments clientId={client.id} embedded={client.doctorAppointments} />
    </div>
  );
}
