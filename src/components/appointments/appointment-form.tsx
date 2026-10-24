"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { caregiverOptions, clientOptions, Picker, ServicePicker } from "@/components/pickers";
import { BookingIssueDialogs, useBookingFlow } from "@/components/schedule/booking-flow";
import { useToast } from "@/components/toast";
import { Alert, Button, ConfirmDialog, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { ApiError, errorMessage, fieldErrors } from "@/lib/api/errors";
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  getClient,
  listAllCaregivers,
  listAllClients,
  listServices,
  updateAppointment,
} from "@/lib/api/resources";
import type { BookingFlags, CaregiverRecord, ClientRecord, NamedCatalogItem } from "@/lib/api/types";
import {
  collapseVisitStatus,
  minutesFromHhmm,
  navigationFieldValue,
  navigationPayload,
  toHhmm,
  utcAppointmentDay,
} from "@/lib/format";
import { REGULAR_VISIT_TYPE, SCHEDULE_TEXT, isYmd, seriesHref } from "@/lib/schedule";

export function AppointmentForm({
  mode,
  appointmentId,
  initialClientId = "",
  initialCaregiverId = "",
  initialDate = "",
  initialStartTime = "",
  initialEndTime = "",
  seriesId = "",
}: {
  mode: "create" | "edit";
  appointmentId?: string;
  initialClientId?: string;
  initialCaregiverId?: string;
  /** Prefill from the calendar: YYYY-MM-DD and HH:mm. */
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  /** Recurring schedule this visit belongs to, when opened from the calendar. */
  seriesId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const booking = useBookingFlow<{ id: string | null; warningCount: number }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [caregivers, setCaregivers] = useState<CaregiverRecord[]>([]);
  const [services, setServices] = useState<NamedCatalogItem[]>([]);
  const [servicesError, setServicesError] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [clientId, setClientId] = useState(initialClientId);
  const [caregiverId, setCaregiverId] = useState(initialCaregiverId);
  const [scheduledDate, setScheduledDate] = useState(isYmd(initialDate) ? initialDate : "");
  const [startTime, setStartTime] = useState(toHhmm(initialStartTime));
  const [endTime, setEndTime] = useState(toHhmm(initialEndTime));
  const [appointmentStatus, setAppointmentStatus] = useState<"scheduled" | "completed" | "cancelled">("scheduled");
  const [rawStatus, setRawStatus] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [locationStreet, setLocationStreet] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationZipCode, setLocationZipCode] = useState("");
  const [locationGateCode, setLocationGateCode] = useState("");
  const [locationNavigation, setLocationNavigation] = useState("");
  const [detailSeriesId, setDetailSeriesId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const linkedSeriesId = seriesId || detailSeriesId;
  const busy = pending || booking.pending;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [clientRows, caregiverRows, serviceResult] = await Promise.all([
          mode === "create" ? listAllClients() : Promise.resolve([]),
          listAllCaregivers(),
          listServices().then(
            (rows) => ({ rows, error: "" }),
            (caught: unknown) => ({ rows: [] as NamedCatalogItem[], error: errorMessage(caught) }),
          ),
        ]);
        if (cancelled) return;
        setClients(clientRows);
        setCaregivers(caregiverRows);
        setServices(serviceResult.rows);
        setServicesError(serviceResult.error);
        if (mode === "edit" && appointmentId) {
          const detail = await getAppointment(appointmentId);
          if (cancelled) return;
          if (!detail) {
            setError("Appointment not found");
            return;
          }
          const collapsed = collapseVisitStatus(detail.appointmentStatus);
          setCaregiverId(detail.caregiverId);
          setScheduledDate(utcAppointmentDay(detail.scheduledDate).ymd);
          setStartTime(toHhmm(detail.startTime));
          setEndTime(toHhmm(detail.endTime));
          setAppointmentStatus(collapsed);
          setRawStatus(detail.appointmentStatus);
          setDescription(detail.description);
          setInstructions(detail.instructions);
          setNotes(detail.notes);
          setLocationStreet(detail.locationStreet);
          setLocationCity(detail.locationCity);
          setLocationState(detail.locationState);
          setLocationZipCode(detail.locationZipCode);
          setLocationGateCode(detail.locationGateCode);
          setLocationNavigation(navigationFieldValue(detail.locationNavigation));
          setServiceIds(detail.services.map((service) => service.id));
          setDetailSeriesId(detail.seriesId ?? "");
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError && caught.status === 404 ? "Appointment not found" : errorMessage(caught));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, mode]);

  useEffect(() => {
    if (mode !== "create" || !clientId) return;
    let cancelled = false;
    getClient(clientId)
      .then((client) => {
        if (cancelled || !client?.address) return;
        setLocationStreet((value) => value || client.address?.street || "");
        setLocationCity((value) => value || client.address?.city || "");
        setLocationState((value) => value || client.address?.state || "");
        setLocationZipCode((value) => value || client.address?.zipCode || "");
        setLocationGateCode((value) => value || client.address?.gateAccessCode || "");
        setLocationNavigation((value) => value || navigationFieldValue(client.address?.navigationInstructions));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId, mode]);

  const clientChoices = useMemo(() => clientOptions(clients), [clients]);
  const caregiverChoices = useMemo(() => caregiverOptions(caregivers), [caregivers]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (mode === "create" && !clientId) next.clientId = "Choose a client.";
    if (!caregiverId) next.caregiverId = "Choose a caregiver.";
    if (serviceIds.length === 0) next.serviceIds = "Choose at least one service.";
    if (!scheduledDate) next.scheduledDate = "Date is required.";
    const start = minutesFromHhmm(startTime);
    const end = minutesFromHhmm(endTime);
    if (start == null) next.startTime = "Start time is required.";
    if (end == null) next.endTime = "End time is required.";
    if (start != null && end != null && end <= start) next.endTime = "End time must be after the start time.";
    setFields(next);
    if (Object.keys(next).length > 0) return;

    const location = {
      locationStreet: locationStreet.trim(),
      locationCity: locationCity.trim(),
      locationState: locationState.trim(),
      locationZipCode: locationZipCode.trim(),
      locationGateCode: locationGateCode.trim(),
      locationNavigation: navigationPayload(locationNavigation),
    };
    const shared = {
      description: description.trim(),
      caregiverId,
      scheduledDate,
      startTime,
      endTime,
      appointmentType: REGULAR_VISIT_TYPE,
      instructions: instructions.trim(),
      notes: notes.trim() ? notes : "",
      serviceIds,
      ...location,
    };

    setError("");
    await booking.start({
      submit: async (flags: BookingFlags) => {
        if (mode === "create") {
          const result = await createAppointment({
            ...shared,
            clientId,
            acknowledgeWarnings: flags.acknowledgeWarnings,
          });
          return { id: result.id, warningCount: result.warnings.length };
        }
        if (!appointmentId) throw new Error("Appointment not found");
        await updateAppointment(appointmentId, {
          ...shared,
          appointmentStatus,
          acknowledgeWarnings: flags.acknowledgeWarnings,
        });
        return { id: appointmentId, warningCount: 0 };
      },
      onSuccess: (result, flags) => {
        if (mode === "create") {
          const acknowledged = flags.acknowledgeWarnings ? result.warningCount : 0;
          toast.success(
            acknowledged > 0
              ? SCHEDULE_TEXT.booking.appointmentCreatedWithWarnings(acknowledged)
              : SCHEDULE_TEXT.booking.appointmentCreated,
          );
          router.replace(result.id ? `/appointments/${result.id}` : "/appointments");
          return;
        }
        toast.success(SCHEDULE_TEXT.booking.appointmentSaved);
        router.replace(`/appointments/${appointmentId}`);
      },
      onError: (caught) => {
        setError(errorMessage(caught));
        setFields(fieldErrors(caught));
      },
    });
  }

  async function onDelete() {
    if (!appointmentId) return;
    setPending(true);
    try {
      await deleteAppointment(appointmentId);
      toast.success(SCHEDULE_TEXT.day.deleted);
      router.replace("/appointments");
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? "Appointment not found" : errorMessage(caught));
      setConfirmDelete(false);
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading the appointment form…</p>;
  if (error && mode === "edit" && !caregiverId && !scheduledDate) return <Alert>{error}</Alert>;

  const collapsedRaw = rawStatus ? collapseVisitStatus(rawStatus) : null;
  const showStatusNote = rawStatus && collapsedRaw && rawStatus.toLowerCase() !== collapsedRaw;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      {mode === "edit" && linkedSeriesId ? (
        <Alert tone="info">
          {SCHEDULE_TEXT.series.partOfSeries}{" "}
          <Link href={seriesHref(linkedSeriesId)} className="font-semibold text-pine hover:underline">
            {SCHEDULE_TEXT.series.openSeries}
          </Link>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "create" ? (
          <Picker label="Client" options={clientChoices} value={clientId} onChange={setClientId} error={fields.clientId} />
        ) : null}
        <Picker
          label="Caregiver"
          options={caregiverChoices}
          value={caregiverId}
          onChange={setCaregiverId}
          error={fields.caregiverId}
        />
        <div className="sm:col-span-2">
          <ServicePicker
            options={services}
            value={serviceIds}
            onChange={setServiceIds}
            error={fields.serviceIds || servicesError}
          />
        </div>
        <Field label="Date" error={fields.scheduledDate}>
          <TextInput type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} />
        </Field>
        <Field label="Start" error={fields.startTime}>
          <TextInput type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </Field>
        <Field label="End" error={fields.endTime}>
          <TextInput type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </Field>
        {mode === "edit" ? (
          <Field label="Status" hint={showStatusNote ? `Stored value ${rawStatus} is saved as ${collapsedRaw} unless you choose another status.` : undefined} error={fields.appointmentStatus}>
            <SelectInput
              value={appointmentStatus}
              onChange={(event) => setAppointmentStatus(event.target.value as typeof appointmentStatus)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </SelectInput>
          </Field>
        ) : null}
      </div>
      <Field label="Description" error={fields.description}>
        <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <Field label="Instructions" error={fields.instructions}>
        <TextArea value={instructions} onChange={(event) => setInstructions(event.target.value)} />
      </Field>
      <Field label="Notes" hint="Leave this blank to clear stored notes." error={fields.notes}>
        <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Street" error={fields.locationStreet}>
          <TextInput value={locationStreet} onChange={(event) => setLocationStreet(event.target.value)} />
        </Field>
        <Field label="City" error={fields.locationCity}>
          <TextInput value={locationCity} onChange={(event) => setLocationCity(event.target.value)} />
        </Field>
        <Field label="State" error={fields.locationState}>
          <TextInput value={locationState} onChange={(event) => setLocationState(event.target.value)} />
        </Field>
        <Field label="Postal / zip" error={fields.locationZipCode}>
          <TextInput value={locationZipCode} onChange={(event) => setLocationZipCode(event.target.value)} />
        </Field>
        <Field label="Gate code" error={fields.locationGateCode}>
          <TextInput value={locationGateCode} onChange={(event) => setLocationGateCode(event.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Navigation" error={fields.locationNavigation}>
            <TextArea value={locationNavigation} onChange={(event) => setLocationNavigation(event.target.value)} />
          </Field>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Create appointment" : "Save appointment"}
        </Button>
        {mode === "edit" ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
            Delete appointment
          </Button>
        ) : null}
      </div>
      <BookingIssueDialogs flow={booking} />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this appointment?"
        body={
          linkedSeriesId
            ? SCHEDULE_TEXT.day.deleteBody
            : "The visit is removed. This cannot be undone."
        }
        confirmLabel="Delete appointment"
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </form>
  );
}
