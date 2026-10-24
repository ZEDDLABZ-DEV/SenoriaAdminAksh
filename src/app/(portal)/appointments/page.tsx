"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, PageHeader, StateBlock, TextInput } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { listAllAppointments } from "@/lib/api/resources";
import type { AppointmentListItem } from "@/lib/api/types";
import { collapseVisitStatus, formatClock, utcAppointmentDay, visitStatusLabel, type VisitStatus } from "@/lib/format";
import { SCHEDULE_TEXT, newSeriesHref } from "@/lib/schedule";

const tabs: Array<{ id: VisitStatus; label: string }> = [
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<VisitStatus>("scheduled");
  const [rows, setRows] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listAllAppointments(query)
      .then((appointments) => {
        if (cancelled) return;
        setRows(appointments);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  const visible = rows.filter((row) => collapseVisitStatus(row.status) === tab);

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Appointments"
        description="Search matches the client's last or first name. Status is filtered on this page."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={newSeriesHref()}>
              <Button variant="secondary">{SCHEDULE_TEXT.scheduleVisits}</Button>
            </Link>
            <Link href="/appointments/new">
              <Button>{SCHEDULE_TEXT.newAppointment}</Button>
            </Link>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TextInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by client name"
          aria-label="Search appointments"
          className="max-w-sm"
        />
        <div className="flex rounded-lg bg-card p-1 ring-1 ring-line">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === item.id ? "bg-ink text-white" : "text-muted"}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? <StateBlock title="Loading appointments" /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && visible.length === 0 ? <StateBlock title={`No ${tab} appointments`} /> : null}
      {visible.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Caregiver</th>
                <th className="px-4 py-3 font-semibold">Services</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const status = collapseVisitStatus(row.status);
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/appointments/${row.id}`} className="font-semibold text-pine hover:underline">
                        {utcAppointmentDay(row.scheduledDate).label}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatClock(row.startTime)} – {formatClock(row.endTime)}
                    </td>
                    <td className="px-4 py-3">{row.clientName || "—"}</td>
                    <td className="px-4 py-3">{row.caregiverName || "—"}</td>
                    <td className="px-4 py-3">{row.services.map((service) => service.name).join(", ") || "—"}</td>
                    <td className="px-4 py-3" title={row.status}>
                      <Badge tone={status === "completed" ? "good" : status === "cancelled" ? "bad" : "neutral"}>
                        {visitStatusLabel(status)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
