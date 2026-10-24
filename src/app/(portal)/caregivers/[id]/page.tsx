"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AvailabilityPanel } from "@/components/caregivers/availability-panel";
import { ChangePasswordDialog } from "@/components/caregivers/change-password-dialog";
import { TimeOffPanel } from "@/components/caregivers/time-off-panel";
import { SeriesPanel } from "@/components/schedule/series-list";
import { Alert, Avatar, Badge, Button, ConfirmDialog, PageHeader, Panel, StateBlock } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { changeCaregiverPassword, deactivateCaregiver, listAllAppointments, listAllCaregivers, listAppointmentTypes } from "@/lib/api/resources";
import type { AppointmentListItem, AppointmentTypeOption, CaregiverRecord } from "@/lib/api/types";
import {
  collapseVisitStatus,
  formatClock,
  fullName,
  humanizeCode,
  initials,
  routeParam,
  utcAppointmentDay,
  visitStatusLabel,
  type VisitStatus,
} from "@/lib/format";
import { SCHEDULE_TEXT, dayDetailHref, newSeriesHref, scheduleToday } from "@/lib/schedule";

const tabs: Array<{ id: VisitStatus; label: string }> = [
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const anchors = [
  ["availability", SCHEDULE_TEXT.availability.title],
  ["time-off", SCHEDULE_TEXT.timeOff.title],
  ["recurring", SCHEDULE_TEXT.series.listTitle],
  ["visits", "Visits"],
];

function PasswordPanel({
  caregiver,
  onUpdated,
}: {
  caregiver: CaregiverRecord;
  onUpdated: (caregiver: CaregiverRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const name = fullName(caregiver.firstName, caregiver.lastName, caregiver.email || "this caregiver");

  return (
    <Panel title="Password">
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted">
          Set a new sign-in password. Their old password stops working, and their current sign-in ends.
        </p>
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        <Button onClick={() => setOpen(true)}>Change password</Button>
      </div>
      <ChangePasswordDialog
        open={open}
        caregiverName={name}
        onClose={() => setOpen(false)}
        onSave={async (password) => {
          const result = await changeCaregiverPassword(caregiver.id, password);
          if (result.caregiver?.id === caregiver.id) onUpdated(result.caregiver);
          setNotice(result.message);
        }}
      />
    </Panel>
  );
}

function assignedTo(caregiver: CaregiverRecord, row: AppointmentListItem): boolean {
  if (row.caregiverId) return row.caregiverId === caregiver.id;
  const expected = fullName(caregiver.firstName, caregiver.lastName).toLowerCase();
  return expected.length > 0 && row.caregiverName.trim().toLowerCase() === expected;
}

export default function CaregiverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = routeParam(params.id);
  const [caregiver, setCaregiver] = useState<CaregiverRecord | null>(null);
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [types, setTypes] = useState<AppointmentTypeOption[]>([]);
  const [tab, setTab] = useState<VisitStatus>("scheduled");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    setScheduleError("");
    try {
      const caregivers = await listAllCaregivers();
      const found = caregivers.find((item) => item.id === id) ?? null;
      setCaregiver(found);
      if (!found) {
        setError("Caregiver not found");
        setAppointments([]);
        return;
      }
      try {
        const [rows, typeRows] = await Promise.all([
          listAllAppointments(),
          listAppointmentTypes().catch(() => [] as AppointmentTypeOption[]),
        ]);
        setTypes(typeRows);
        setAppointments(rows.filter((row) => assignedTo(found, row)));
      } catch (caught) {
        setAppointments([]);
        setScheduleError(errorMessage(caught));
      }
    } catch (caught) {
      setCaregiver(null);
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDeactivate() {
    if (!id) return;
    setPending(true);
    setActionError("");
    try {
      await deactivateCaregiver(id);
      router.replace("/caregivers?notice=off");
    } catch (caught) {
      setActionError(errorMessage(caught));
      setConfirmOff(false);
    } finally {
      setPending(false);
    }
  }

  function typeLabel(value: string): string {
    return types.find((type) => type.value === value)?.label || humanizeCode(value);
  }

  if (loading && !caregiver) return <StateBlock title="Loading caregiver" />;
  if (error && !caregiver) {
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
  if (!caregiver) return <StateBlock title="Caregiver not found" />;

  const name = fullName(caregiver.firstName, caregiver.lastName, caregiver.email || "Unnamed caregiver");
  const visible = appointments.filter((row) => collapseVisitStatus(row.status) === tab);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Caregiver"
        title={name}
        description={caregiver.role || "No position"}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setConfirmOff(true)} disabled={pending}>
              Turn off
            </Button>
            <Link href={dayDetailHref(caregiver.id, scheduleToday())}>
              <Button variant="secondary">{SCHEDULE_TEXT.nav}</Button>
            </Link>
            <Link href={newSeriesHref({ caregiverId: caregiver.id })}>
              <Button variant="secondary">{SCHEDULE_TEXT.scheduleVisits}</Button>
            </Link>
            <Link href={`/appointments/new?caregiverId=${encodeURIComponent(caregiver.id)}`}>
              <Button>Schedule appointment</Button>
            </Link>
          </div>
        }
      />
      {actionError ? <Alert>{actionError}</Alert> : null}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card p-5">
        <Avatar name={initials(caregiver.firstName, caregiver.lastName)} className="h-16 w-16 text-xl" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{caregiver.role || "No position"}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            {caregiver.phone || "No phone"} · {caregiver.email || "No email"}
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
      <PasswordPanel caregiver={caregiver} onUpdated={setCaregiver} />
      <AvailabilityPanel caregiverId={caregiver.id} />
      <TimeOffPanel caregiverId={caregiver.id} />
      <SeriesPanel caregiverId={caregiver.id} />
      <Panel id="visits" title="Visits">
        <div className="mb-4 flex rounded-lg bg-paper p-1 ring-1 ring-line w-fit">
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
        {scheduleError ? (
          <Alert>
            {scheduleError}{" "}
            <button type="button" className="font-semibold underline" onClick={() => void load()}>
              Try again
            </button>
          </Alert>
        ) : null}
        {!scheduleError && visible.length === 0 ? (
          <p className="text-sm text-muted">No {tab} appointments.</p>
        ) : null}
        {visible.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Time</th>
                  <th className="py-2 pr-3 font-semibold">Client</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const status = collapseVisitStatus(row.status);
                  return (
                    <tr key={row.id} className="border-t border-line">
                      <td className="py-3 pr-3">
                        <Link href={`/appointments/${row.id}`} className="font-semibold text-pine hover:underline">
                          {utcAppointmentDay(row.scheduledDate).label}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        {formatClock(row.startTime)} – {formatClock(row.endTime)}
                      </td>
                      <td className="py-3 pr-3">{row.clientName || "—"}</td>
                      <td className="py-3 pr-3" title={row.type}>
                        {typeLabel(row.type)}
                      </td>
                      <td className="py-3" title={row.status}>
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
      </Panel>
      <ConfirmDialog
        open={confirmOff}
        title="Turn off this caregiver?"
        body="They cannot sign in, and they leave the assign list. Visits already saved stay attached to them."
        confirmLabel="Turn off"
        pending={pending}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => void onDeactivate()}
      />
    </div>
  );
}
