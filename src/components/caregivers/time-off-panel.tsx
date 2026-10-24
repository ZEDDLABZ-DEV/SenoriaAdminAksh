"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, ConfirmDialog, Field, Modal, Panel, SegmentedControl, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { createCaregiverTimeOff, deleteCaregiverTimeOff, listCaregiverTimeOff } from "@/lib/api/resources";
import type { AffectedVisit, TimeOff } from "@/lib/api/types";
import { formatCalendarDate, formatWeekdayDate, minutesFromHhmm } from "@/lib/format";
import { SCHEDULE_TEXT, addDays, compareYmd, editVisitHref, formatRange, formatTimeRange, isYmd, scheduleToday } from "@/lib/schedule";

const LOOKBACK_DAYS = 30;

type Span = "full" | "part";

export function TimeOffPanel({ caregiverId }: { caregiverId: string }) {
  const toast = useToast();
  const text = SCHEDULE_TEXT.timeOff;
  const [rows, setRows] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [adding, setAdding] = useState(false);
  const [affected, setAffected] = useState<AffectedVisit[] | null>(null);
  const [removing, setRemoving] = useState<TimeOff | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const from = addDays(scheduleToday(), -LOOKBACK_DAYS);
      const list = await listCaregiverTimeOff(caregiverId, { from });
      setRows([...list].sort((left, right) => compareYmd(left.startDate, right.startDate)));
    } catch (caught) {
      setLoadError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [caregiverId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRemove() {
    if (!removing) return;
    setPending(true);
    setActionError("");
    try {
      await deleteCaregiverTimeOff(caregiverId, removing.id);
      setRows((current) => current.filter((row) => row.id !== removing.id));
      toast.success(text.removed);
      setRemoving(null);
    } catch (caught) {
      setActionError(errorMessage(caught));
      setRemoving(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel
      id="time-off"
      title={text.title}
      action={
        <Button onClick={() => setAdding(true)} disabled={loading}>
          {text.add}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted">{text.intro}</p>
      {actionError ? (
        <div className="mb-3">
          <Alert>{actionError}</Alert>
        </div>
      ) : null}
      {affected && affected.length > 0 ? (
        <div className="mb-4 rounded-xl border border-gold/30 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{text.affectedTitle}</p>
              <p className="mt-1 text-sm text-muted">{text.affectedBody}</p>
            </div>
            <button type="button" className="text-sm font-semibold text-muted hover:text-ink" onClick={() => setAffected(null)}>
              Dismiss
            </button>
          </div>
          <ul className="mt-3 divide-y divide-line/70 text-sm">
            {affected.map((visit) => (
              <li key={visit.appointmentId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{formatWeekdayDate(visit.scheduledDate)}</span>{" "}
                  <span className="text-muted">
                    · {formatTimeRange(visit.startTime, visit.endTime)} · {visit.clientName || "Client"}
                  </span>
                </span>
                <span className="flex gap-3">
                  <Link href={`/appointments/${visit.appointmentId}`} className="font-semibold text-pine hover:underline">
                    Open
                  </Link>
                  <Link href={editVisitHref(visit.appointmentId)} className="font-semibold text-pine hover:underline">
                    {text.affectedEdit}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {loading ? <p className="text-sm text-muted">Loading time off…</p> : null}
      {loadError ? (
        <Alert>
          {loadError}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !loadError && rows.length === 0 ? <p className="text-sm text-muted">{text.empty}</p> : null}
      {rows.length > 0 ? (
        <ul className="divide-y divide-line">
          {rows.map((row) => {
            const past = compareYmd(row.endDate, scheduleToday()) < 0;
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className={`text-sm font-semibold ${past ? "text-muted" : "text-ink"}`}>{formatRange(row.startDate, row.endDate)}</p>
                  <p className="text-sm text-muted">
                    {row.allDay ? text.allDay : formatTimeRange(row.startTime, row.endTime)}
                    {row.reason ? ` · ${row.reason}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {past ? <Badge>Past</Badge> : null}
                  <button
                    type="button"
                    className="text-sm font-semibold text-muted hover:text-danger"
                    onClick={() => setRemoving(row)}
                    disabled={pending}
                  >
                    {text.remove}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <TimeOffDialog
        open={adding}
        caregiverId={caregiverId}
        onClose={() => setAdding(false)}
        onSaved={(result) => {
          setRows((current) => [...current, result.timeOff].sort((left, right) => compareYmd(left.startDate, right.startDate)));
          setAffected(result.affectedVisits);
          toast.success(text.saved);
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title={text.removeTitle}
        body={text.removeBody}
        confirmLabel={text.removeConfirm}
        pending={pending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void onRemove()}
      />
    </Panel>
  );
}

function TimeOffDialog({
  open,
  caregiverId,
  onClose,
  onSaved,
}: {
  open: boolean;
  caregiverId: string;
  onClose: () => void;
  onSaved: (result: { timeOff: TimeOff; affectedVisits: AffectedVisit[] }) => void;
}) {
  const text = SCHEDULE_TEXT.timeOff;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [span, setSpan] = useState<Span>("full");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) return;
    setStartDate("");
    setEndDate("");
    setSpan("full");
    setStartTime("");
    setEndTime("");
    setReason("");
    setErrors({});
    setFormError("");
    setPending(false);
  }, [open]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!isYmd(startDate)) next.startDate = text.startRequired;
    if (endDate && isYmd(startDate) && compareYmd(endDate, startDate) < 0) next.endDate = text.endBeforeStart;
    if (span === "part") {
      const start = minutesFromHhmm(startTime);
      const end = minutesFromHhmm(endTime);
      if (start == null || end == null) next.startTime = text.timesBothOrNone;
      else if (end <= start) next.endTime = text.endTimeBeforeStart;
    }
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const result = await createCaregiverTimeOff(caregiverId, {
        startDate,
        endDate: endDate || undefined,
        startTime: span === "part" ? startTime : undefined,
        endTime: span === "part" ? endTime : undefined,
        reason: reason.trim() || undefined,
      });
      onSaved(result);
      onClose();
    } catch (caught) {
      setErrors(fieldErrors(caught));
      setFormError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title={text.add}
      description={text.intro}
      pending={pending}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError ? <Alert>{formError}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={text.startDate} error={errors.startDate}>
            <TextInput type="date" value={startDate} autoFocus disabled={pending} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label={text.endDate} hint={startDate ? `Defaults to ${formatCalendarDate(startDate)}.` : undefined} error={errors.endDate}>
            <TextInput type="date" value={endDate} min={startDate || undefined} disabled={pending} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </div>
        <SegmentedControl<Span>
          label="Span"
          value={span}
          onChange={setSpan}
          options={[
            { id: "full", label: text.fullDay },
            { id: "part", label: text.partDay },
          ]}
        />
        {span === "part" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={text.startTime} error={errors.startTime}>
              <TextInput type="time" value={startTime} disabled={pending} onChange={(event) => setStartTime(event.target.value)} />
            </Field>
            <Field label={text.endTime} error={errors.endTime}>
              <TextInput type="time" value={endTime} disabled={pending} onChange={(event) => setEndTime(event.target.value)} />
            </Field>
          </div>
        ) : null}
        <Field label={text.reason} error={errors.reason}>
          <TextInput value={reason} placeholder={text.reasonPlaceholder} disabled={pending} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : text.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
