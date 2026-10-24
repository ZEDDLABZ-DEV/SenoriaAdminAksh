"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, PageHeader, StateBlock, TextInput } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { DOCTOR_APPOINTMENT_PAGE_SIZE, listDoctorAppointments } from "@/lib/api/resources";
import type { DoctorAppointment, PageMeta } from "@/lib/api/types";
import { collapseVisitStatus, formatClock, formatWeekdayDate, visitStatusLabel, type VisitStatus } from "@/lib/format";

const tabs: Array<{ id: VisitStatus; label: string }> = [
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const emptyMeta: PageMeta = {
  page: 1,
  pageSize: DOCTOR_APPOINTMENT_PAGE_SIZE,
  total: null,
  totalPages: null,
  hasNextPage: null,
  hasPreviousPage: null,
};

function statusTone(status: VisitStatus): "good" | "bad" | "neutral" {
  if (status === "completed") return "good";
  if (status === "cancelled") return "bad";
  return "neutral";
}

export default function DoctorAppointmentsPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<VisitStatus>("scheduled");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DoctorAppointment[]>([]);
  const [meta, setMeta] = useState<PageMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const queryRef = useRef(query);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      if (queryRef.current === next) return;
      queryRef.current = next;
      setQuery(next);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listDoctorAppointments({
      page,
      pageSize: DOCTOR_APPOINTMENT_PAGE_SIZE,
      search: query,
      status: tab,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.items);
        setMeta(result.meta);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setRows([]);
        setMeta(emptyMeta);
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query, reloadKey, tab]);

  const hasPrevious = page > 1 && meta.hasPreviousPage !== false;
  const hasNext =
    meta.hasNextPage === true || (meta.hasNextPage == null && meta.totalPages != null && page < meta.totalPages);
  const showPager = hasPrevious || hasNext;

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Doctor appointments"
        description="Search matches the doctor, specialty, clinic, or client name."
        action={
          <Link href="/doctor-appointments/new">
            <Button>New doctor appointment</Button>
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TextInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by doctor, specialty, clinic, or client"
          aria-label="Search doctor appointments"
          className="max-w-sm"
        />
        <div className="flex rounded-lg bg-card p-1 ring-1 ring-line">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === item.id ? "bg-ink text-white" : "text-muted"}`}
              onClick={() => {
                setTab(item.id);
                setPage(1);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? <StateBlock title="Loading doctor appointments" /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <StateBlock
          title={query ? "No matching doctor appointments" : `No ${tab} doctor appointments`}
          body={
            query
              ? "Try another doctor, clinic, or client."
              : tab === "scheduled"
                ? "Create one to schedule a clinic visit."
                : undefined
          }
          action={
            query || tab !== "scheduled" ? null : (
              <Link href="/doctor-appointments/new">
                <Button>New doctor appointment</Button>
              </Link>
            )
          }
        />
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Doctor</th>
                <th className="px-4 py-3 font-semibold">Clinic</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = collapseVisitStatus(row.status);
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/doctor-appointments/${row.id}`} className="font-semibold text-pine hover:underline">
                        {formatWeekdayDate(row.scheduledDate)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatClock(row.startTime)} – {formatClock(row.endTime)}
                    </td>
                    <td className="px-4 py-3">{row.clientName || "—"}</td>
                    <td className="px-4 py-3">{row.doctorName || "—"}</td>
                    <td className="px-4 py-3">{row.clinicName || "—"}</td>
                    <td className="px-4 py-3">{row.typeName || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(status)}>{visitStatusLabel(status)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading && showPager ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Page {meta.page || page}
            {meta.totalPages != null ? ` of ${meta.totalPages}` : ""}
            {meta.total != null ? ` · ${meta.total} total` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!hasPrevious || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Previous
            </Button>
            <Button variant="secondary" disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
