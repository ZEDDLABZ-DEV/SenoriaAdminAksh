"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Field, PageHeader, Panel, SelectInput, StringListEditor, TextArea, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { createClient } from "@/lib/api/resources";
import type { CreateClientInput } from "@/lib/api/types";
import { isDobInRange, splitFullName, todayInputValue } from "@/lib/format";

const empty = {
  fullName: "",
  dateOfBirth: "",
  gender: "female" as const,
  phone: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  primaryCondition: "",
  medicalConditions: [] as string[],
  allergies: [] as string[],
  language: "",
  communicationNote: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  gateAccessCode: "",
  navigationInstructions: "",
};

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(todayInputValue());
  }, []);

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required.";
    if (!form.dateOfBirth) next.dateOfBirth = "Date of birth is required.";
    else if (!isDobInRange(form.dateOfBirth)) next.dateOfBirth = "Use a date from 1900 through today.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const name = splitFullName(form.fullName);
    const payload: CreateClientInput = {
      firstName: name.firstName,
      lastName: name.lastName,
      dateOfBirth: form.dateOfBirth,
      phone: form.phone.trim(),
      gender: form.gender,
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactRelation: form.emergencyContactRelation.trim(),
      emergencyContactPhone: form.emergencyContactPhone.trim(),
      primaryCondition: form.primaryCondition.trim(),
      medicalConditions: form.medicalConditions.map((item) => item.trim()).filter(Boolean),
      allergies: form.allergies.map((item) => item.trim()).filter(Boolean),
      language: form.language.trim(),
      communicationNote: form.communicationNote.trim(),
      address: {
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim(),
        country: form.country.trim(),
        apartment: "",
        gateAccessCode: form.gateAccessCode.trim(),
        navigationInstructions: form.navigationInstructions.trim(),
      },
    };

    setPending(true);
    setFormError("");
    try {
      const id = await createClient(payload);
      router.replace(id ? `/clients/${id}` : "/clients");
    } catch (caught) {
      setFormError(errorMessage(caught));
      setErrors(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Clients" title="New client" description="A new client is stored as active. Email, hazards, and the care plan are added on the record." />
      {formError ? <Alert>{formError}</Alert> : null}
      <Panel title="Person">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" hint="Last name, first name." error={errors.fullName || errors.firstName || errors.lastName}>
            <TextInput value={form.fullName} onChange={(event) => set("fullName", event.target.value)} />
          </Field>
          <Field label="Date of birth" hint="Year 1900 through today." error={errors.dateOfBirth}>
            <TextInput
              type="date"
              min="1900-01-01"
              max={today || undefined}
              value={form.dateOfBirth}
              onChange={(event) => set("dateOfBirth", event.target.value)}
            />
          </Field>
          <Field label="Gender" error={errors.gender}>
            <SelectInput value={form.gender} onChange={(event) => set("gender", event.target.value as typeof form.gender)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </SelectInput>
          </Field>
          <Field label="Phone" error={errors.phone}>
            <TextInput value={form.phone} onChange={(event) => set("phone", event.target.value)} />
          </Field>
        </div>
      </Panel>
      <Panel title="Emergency contact">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" error={errors.emergencyContactName}>
            <TextInput value={form.emergencyContactName} onChange={(event) => set("emergencyContactName", event.target.value)} />
          </Field>
          <Field label="Relationship" error={errors.emergencyContactRelation}>
            <TextInput value={form.emergencyContactRelation} onChange={(event) => set("emergencyContactRelation", event.target.value)} />
          </Field>
          <Field label="Phone" error={errors.emergencyContactPhone}>
            <TextInput value={form.emergencyContactPhone} onChange={(event) => set("emergencyContactPhone", event.target.value)} />
          </Field>
        </div>
      </Panel>
      <Panel title="Health and language">
        <div className="space-y-4">
          <Field label="Primary condition" error={errors.primaryCondition}>
            <TextInput value={form.primaryCondition} onChange={(event) => set("primaryCondition", event.target.value)} />
          </Field>
          <StringListEditor
            label="Medical conditions"
            values={form.medicalConditions}
            onChange={(values) => set("medicalConditions", values)}
            placeholder="Add a condition"
            error={errors.medicalConditions}
          />
          <StringListEditor
            label="Allergies"
            values={form.allergies}
            onChange={(values) => set("allergies", values)}
            placeholder="Add an allergy"
            error={errors.allergies}
          />
          <Field label="Preferred language" error={errors.language}>
            <TextInput value={form.language} onChange={(event) => set("language", event.target.value)} />
          </Field>
          <Field label="Communication note" error={errors.communicationNote}>
            <TextArea value={form.communicationNote} onChange={(event) => set("communicationNote", event.target.value)} />
          </Field>
        </div>
      </Panel>
      <Panel title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Street" error={errors.street}>
            <TextInput value={form.street} onChange={(event) => set("street", event.target.value)} />
          </Field>
          <Field label="City" error={errors.city}>
            <TextInput value={form.city} onChange={(event) => set("city", event.target.value)} />
          </Field>
          <Field label="State" error={errors.state}>
            <TextInput value={form.state} onChange={(event) => set("state", event.target.value)} />
          </Field>
          <Field label="Postal / zip" error={errors.zipCode}>
            <TextInput value={form.zipCode} onChange={(event) => set("zipCode", event.target.value)} />
          </Field>
          <Field label="Country" error={errors.country}>
            <TextInput value={form.country} onChange={(event) => set("country", event.target.value)} />
          </Field>
          <Field label="Gate code" error={errors.gateAccessCode}>
            <TextInput value={form.gateAccessCode} onChange={(event) => set("gateAccessCode", event.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Navigation instructions" error={errors.navigationInstructions}>
              <TextArea value={form.navigationInstructions} onChange={(event) => set("navigationInstructions", event.target.value)} />
            </Field>
          </div>
        </div>
      </Panel>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create client"}
      </Button>
    </form>
  );
}
