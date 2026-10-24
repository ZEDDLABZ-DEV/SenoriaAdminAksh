"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { DayTimeline, VisitCard } from "@/components/schedule/day-timeline";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, ConfirmDialog, PageHeader, StateBlock } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { cancelAppointment, deleteAppointment, getSchedule } from "@/lib/api/resources";
import type { ScheduleCaregiver, ScheduleDay, ScheduleVisit } from "@/lib/api/types";
import { formatWeekdayDate, fullName } from "@/lib/format";
import {
  SCHEDULE_TEXT,
  addDays,
  caregiverIdsParam,
  formatMinutes,
  isYmd,
  monthOf,
  newVisitHref,
  scheduleToday,
  sortSlots,
} from "@/lib/schedule";

function DayDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const caregiverId = params.get("caregiverId") ?? "";
  const dateParam = params.get("date");
  const date = isYmd(dateParam) ? dateParam : scheduleToday();

  const [caregiver, setCaregiver] = useState<ScheduleCaregiver | null>(null);
  const [day, setDay] = useState<ScheduleDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [cancelling, setCancelling] = useState<ScheduleVisit | null>(null);
  const [deleting, setDeleting] = useState<ScheduleVisit | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!caregiverId) {
      setError(SCHEDULE_TEXT.day.notFound);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const range = await getSchedule(date, date, [caregiverId]);
      const found = range.caregivers.find((item) => item.id === caregiverId) ?? range.caregivers[0] ?? null;
      setCaregiver(found);
      setDay(found?.days.find((item) => item.date === date) ?? found?.days[0] ?? null);
      if (!found) setError(SCHEDULE_TEXT.day.notFound);
    } catch (caught) {
      setCaregiver(null);
      setDay(null);
      setError(caught instanceof ApiError && caught.status === 404 ? SCHEDULE_TEXT.day.notFound : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [caregiverId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  function goTo(nextDate: string) {
    const next = new URLSearchParams(params.toString());
    next.set("date", nextDate);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  async function onCancelVisit() {
    if (!cancelling) return;
    setPending(true);
    setActionError("");
    try {
      await cancelAppointment(cancelling.appointmentId);
      toast.success(SCHEDULE_TEXT.day.cancelled);
      setCancelling(null);
      await load();
    } catch (caught) {
      setActionError(errorMessage(caught));
      setCancelling(null);
    } finally {
      setPending(false);
    }
  }

  async function onDeleteVisit() {
    if (!deleting) return;
    setPending(true);
    setActionError("");
    try {
      await deleteAppointment(deleting.appointmentId);
      toast.success(SCHEDULE_TEXT.day.deleted);
      setDeleting(null);
      await load();
    } catch (caught) {
      setActionError(errorMessage(caught));
      setDeleting(null);
    } finally {
      setPending(false);
    }
  }

  const name = caregiver ? fullName(caregiver.firstName, caregiver.lastName, "Caregiver") : "Caregiver";
  const calendarHref = `/schedule?month=${monthOf(date)}${caregiverId ? `&caregiverIds=${caregiverIdsParam([caregiverId])}` : ""}`;
  const visits = day ? sortSlots(day.visits) : [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={SCHEDULE_TEXT.day.eyebrow}
        title={name}
        description={formatWeekdayDate(date)}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={calendarHref}>
              <Button variant="secondary">{SCHEDULE_TEXT.day.back}</Button>
            </Link>
            {caregiverId ? (
              <Link href={`/caregivers/${caregiverId}`}>
                <Button variant="secondary">{SCHEDULE_TEXT.day.openCaregiver}</Button>
              </Link>
            ) : null}
            <Link href={newVisitHref({ caregiverId, date })}>
              <Button>{SCHEDULE_TEXT.day.addVisit}</Button>
            </Link>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-card p-1 ring-1 ring-line">
          <button type="button" className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-paper hover:text-ink" onClick={() => goTo(addDays(date, -1))} aria-label={SCHEDULE_TEXT.previous}>
            ‹
          </button>
          <button type="button" className="rounded-md px-3 py-1.5 text-sm font-semibold text-pine hover:bg-moss" onClick={() => goTo(scheduleToday())}>
            {SCHEDULE_TEXT.today}
          </button>
          <button type="button" className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-paper hover:text-ink" onClick={() => goTo(addDays(date, 1))} aria-label={SCHEDULE_TEXT.next}>
            ›
          </button>
        </div>
        {day ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>
              {SCHEDULE_TEXT.day.booked} {formatMinutes(day.bookedMinutes)}
            </Badge>
            {day.availableMinutes != null ? (
              <Badge tone="good">
                {SCHEDULE_TEXT.day.available} {formatMinutes(day.availableMinutes)}
              </Badge>
            ) : null}
            {day.freeMinutes != null ? (
              <Badge tone="neutral">
                {SCHEDULE_TEXT.day.free} {formatMinutes(day.freeMinutes)}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
      {actionError ? <Alert>{actionError}</Alert> : null}
      {loading ? <StateBlock title={SCHEDULE_TEXT.day.loading} /> : null}
      {!loading && error ? (
        <StateBlock
          title={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : null}
      {!loading && !error && day ? (
        <>
          {!caregiver?.hasAvailability ? <Alert tone="info">{SCHEDULE_TEXT.day.noAvailability}</Alert> : null}
          <DayTimeline
            day={day}
            onPickSlot={(slot) => router.push(newVisitHref({ caregiverId, date, startTime: slot.startTime, endTime: slot.endTime }))}
          />
          <section>
            <h2 className="mb-3 font-display text-2xl text-ink">
              {SCHEDULE_TEXT.day.visits} <span className="text-base text-muted">({visits.length})</span>
            </h2>
            {visits.length === 0 ? <p className="text-sm text-muted">{SCHEDULE_TEXT.day.noVisits}</p> : null}
            <ul className="space-y-3">
              {visits.map((visit) => (
                <VisitCard key={visit.appointmentId} visit={visit} busy={pending} onCancel={setCancelling} onDelete={setDeleting} />
              ))}
            </ul>
          </section>
        </>
      ) : null}
      <ConfirmDialog
        open={cancelling !== null}
        title={SCHEDULE_TEXT.day.cancelTitle}
        body={SCHEDULE_TEXT.day.cancelBody}
        confirmLabel={SCHEDULE_TEXT.day.cancelConfirm}
        cancelLabel="Keep visit"
        pending={pending}
        onCancel={() => setCancelling(null)}
        onConfirm={() => void onCancelVisit()}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={SCHEDULE_TEXT.day.deleteTitle}
        body={SCHEDULE_TEXT.day.deleteBody}
        confirmLabel={SCHEDULE_TEXT.day.deleteConfirm}
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void onDeleteVisit()}
      />
    </div>
  );
}

export default function DayDetailRoute() {
  return (
    <Suspense fallback={<StateBlock title={SCHEDULE_TEXT.day.loading} />}>
      <DayDetailPage />
    </Suspense>
  );
}
