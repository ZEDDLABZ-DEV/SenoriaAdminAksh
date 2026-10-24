"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { ApiError, errorMessage, fieldErrors } from "@/lib/api/errors";
import {
  createDoctorAppointment,
  getDoctorAppointment,
  listAllClients,
  listDoctorAppointmentTypes,
  updateDoctorAppointment,
} from "@/lib/api/resources";
import type { DoctorAppointment, DoctorAppointmentStatus, NamedCatalogItem, UpdateDoctorAppointmentInput } from "@/lib/api/types";
import type { ClientRecord } from "@/lib/api/types";
import { collapseVisitStatus, dateInputValue, fullName, minutesFromHhmm, toHhmm } from "@/lib/format";

interface Draft {
  clientId: string;
  typeId: string;
  doctorName: string;
  specialty: string;
  phone: string;
  clinicName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  description: string;
  status: DoctorAppointmentStatus;
}

function draftFrom(appointment: DoctorAppointment): Draft {
  return {
    clientId: appointment.clientId,
    typeId: appointment.typeId,
    doctorName: appointment.doctorName,
    specialty: appointment.specialty,
    phone: appointment.phone,
    clinicName: appointment.clinicName,
    scheduledDate: dateInputValue(appointment.scheduledDate),
    startTime: toHhmm(appointment.startTime),
    endTime: toHhmm(appointment.endTime),
    description: appointment.description.trim(),
    status: collapseVisitStatus(appointment.status),
  };
}

function changedPatch(current: Draft, original: Draft): UpdateDoctorAppointmentInput {
  const patch: UpdateDoctorAppointmentInput = {};
  if (current.clientId !== original.clientId) patch.clientId = current.clientId;
  if (current.typeId !== original.typeId) patch.typeId = current.typeId;
  if (current.doctorName !== original.doctorName) patch.doctorName = current.doctorName;
  if (current.specialty !== original.specialty) patch.specialty = current.specialty;
  if (current.phone !== original.phone) patch.phone = current.phone;
  if (current.clinicName !== original.clinicName) patch.clinicName = current.clinicName;
  if (current.scheduledDate !== original.scheduledDate) patch.scheduledDate = current.scheduledDate;
  if (current.startTime !== original.startTime) patch.startTime = current.startTime;
  if (current.endTime !== original.endTime) patch.endTime = current.endTime;
  if (current.description !== original.description) patch.description = current.description;
  if (current.status !== original.status) patch.status = current.status;
  return patch;
}

export function DoctorAppointmentForm({
  mode,
  appointmentId,
  initialClientId = "",
}: {
  mode: "create" | "edit";
  appointmentId?: string;
  initialClientId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [clientsError, setClientsError] = useState("");
  const [types, setTypes] = useState<NamedCatalogItem[]>([]);
  const [typesError, setTypesError] = useState("");
  const [original, setOriginal] = useState<Draft | null>(null);
  const [storedClientName, setStoredClientName] = useState("");
  const [storedTypeName, setStoredTypeName] = useState("");
  const [clientId, setClientId] = useState(initialClientId);
  const [typeId, setTypeId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<DoctorAppointmentStatus>("scheduled");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMissing(false);
      setLoadError("");
      setClientsError("");
      setTypesError("");
      try {
        const [clientResult, typeResult, appointmentResult] = await Promise.allSettled([
          listAllClients(),
          listDoctorAppointmentTypes(),
          mode === "edit" && appointmentId ? getDoctorAppointment(appointmentId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (clientResult.status === "fulfilled") setClients(clientResult.value);
        else setClientsError(errorMessage(clientResult.reason));
        if (typeResult.status === "fulfilled") setTypes(typeResult.value);
        else setTypesError(errorMessage(typeResult.reason));
        if (mode !== "edit") return;

        if (appointmentResult.status === "rejected") {
          const caught = appointmentResult.reason;
          if (caught instanceof ApiError && caught.status === 404) setMissing(true);
          else setLoadError(errorMessage(caught));
          return;
        }
        const existing = appointmentResult.value;
        if (!existing) {
          setMissing(true);
          return;
        }
        const draft = draftFrom(existing);
        setOriginal(draft);
        setStoredClientName(existing.clientName);
        setStoredTypeName(existing.typeName);
        setClientId(draft.clientId);
        setTypeId(draft.typeId);
        setDoctorName(draft.doctorName);
        setSpecialty(draft.specialty);
        setPhone(draft.phone);
        setClinicName(draft.clinicName);
        setScheduledDate(draft.scheduledDate);
        setStartTime(draft.startTime);
        setEndTime(draft.endTime);
        setDescription(draft.description);
        setStatus(draft.status);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, mode, reloadKey]);

  function currentDraft(): Draft {
    return {
      clientId,
      typeId,
      doctorName: doctorName.trim(),
      specialty: specialty.trim(),
      phone: phone.trim(),
      clinicName: clinicName.trim(),
      scheduledDate,
      startTime: toHhmm(startTime),
      endTime: toHhmm(endTime),
      description: description.trim(),
      status,
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!clientId) next.clientId = "Choose a client.";
    if (!typeId) next.typeId = types.length === 0 ? "Add a doctor appointment type in Settings." : "Choose a type.";
    if (!doctorName.trim()) next.doctorName = "Doctor is required.";
    if (!specialty.trim()) next.specialty = "Specialty is required.";
    if (!phone.trim()) next.phone = "Phone is required.";
    if (!clinicName.trim()) next.clinicName = "Clinic is required.";
    if (!scheduledDate) next.scheduledDate = "Scheduled date is required.";
    const start = minutesFromHhmm(startTime);
    const end = minutesFromHhmm(endTime);
    if (start == null) next.startTime = "Start time is required.";
    if (end == null) next.endTime = "End time is required.";
    if (start != null && end != null && end <= start) next.endTime = "End time must be after the start time.";
    setFields(next);
    if (Object.keys(next).length > 0) return;

    const draft = currentDraft();
    setPending(true);
    setFormError("");
    try {
      if (mode === "create") {
        const id = await createDoctorAppointment({
          clientId: draft.clientId,
          typeId: draft.typeId,
          doctorName: draft.doctorName,
          specialty: draft.specialty,
          phone: draft.phone,
          clinicName: draft.clinicName,
          scheduledDate: draft.scheduledDate,
          startTime: draft.startTime,
          endTime: draft.endTime,
          ...(draft.description ? { description: draft.description } : {}),
        });
        router.replace(id ? `/doctor-appointments/${id}` : "/doctor-appointments");
        return;
      }
      if (!appointmentId || !original) return;
      await updateDoctorAppointment(appointmentId, changedPatch(draft, original));
      router.replace(`/doctor-appointments/${appointmentId}`);
    } catch (caught) {
      setFormError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading the appointment form…</p>;
  if (missing) return <Alert>Appointment not found.</Alert>;
  if (loadError) {
    return (
      <Alert>
        {loadError}{" "}
        <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
          Try again
        </button>
      </Alert>
    );
  }

  const knownClient = clients.some((client) => client.id === clientId);
  const knownType = types.some((type) => type.id === typeId);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {formError ? <Alert>{formError}</Alert> : null}
      {clientsError ? (
        <Alert>
          {clientsError}{" "}
          <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </Alert>
      ) : null}
      {typesError ? (
        <Alert>
          {typesError}{" "}
          <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </Alert>
      ) : null}
      <Panel title="Appointment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" error={fields.clientId}>
            <SelectInput value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Choose a client</option>
              {clientId && !knownClient ? <option value={clientId}>{storedClientName || "Selected client"}</option> : null}
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {fullName(client.firstName, client.lastName, client.email || "Unnamed client")}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            label="Appointment type"
            hint={types.length === 0 ? "Add types in Settings to fill this dropdown." : "Managed in Settings."}
            error={fields.typeId}
          >
            <SelectInput value={typeId} onChange={(event) => setTypeId(event.target.value)} disabled={types.length === 0 && !typeId}>
              <option value="">{types.length === 0 ? "No types yet" : "Choose a type"}</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
              {typeId && !knownType ? <option value={typeId}>{storedTypeName || "Selected type"}</option> : null}
            </SelectInput>
          </Field>
          <Field label="Doctor" error={fields.doctorName}>
            <TextInput value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="Dr. Priya Shah" />
          </Field>
          <Field label="Specialty" error={fields.specialty}>
            <TextInput value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Family medicine" />
          </Field>
          <Field label="Phone" error={fields.phone}>
            <TextInput type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(604) 555-2210" autoComplete="tel" />
          </Field>
          <Field label="Clinic" error={fields.clinicName}>
            <TextInput value={clinicName} onChange={(event) => setClinicName(event.target.value)} placeholder="Senoria Family Clinic" />
          </Field>
          <Field label="Scheduled date" error={fields.scheduledDate}>
            <TextInput type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} />
          </Field>
          <Field label="Start time" error={fields.startTime}>
            <TextInput type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </Field>
          <Field label="End time" error={fields.endTime}>
            <TextInput type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </Field>
          {mode === "edit" ? (
            <Field label="Status" error={fields.status}>
              <SelectInput value={status} onChange={(event) => setStatus(event.target.value as DoctorAppointmentStatus)}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </SelectInput>
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <Field label="Description" error={fields.description}>
              <TextArea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Follow-up with the family physician"
              />
            </Field>
          </div>
        </div>
      </Panel>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create appointment" : "Save appointment"}
        </Button>
        {types.length === 0 ? (
          <Link href="/settings" className="text-sm font-semibold text-pine hover:underline">
            Add appointment types
          </Link>
        ) : null}
      </div>
    </form>
  );
}
