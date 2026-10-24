"use client";

import { FormEvent, useMemo, useState } from "react";
import { Alert, Button, Field, Panel, SelectInput, StringListEditor, TextArea, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { updateClient } from "@/lib/api/resources";
import type { ClientRecord, ClientUpdate } from "@/lib/api/types";
import {
  dateInputValue,
  isDobInRange,
  sameList,
  stripAllergyPrefix,
  todayInputValue,
} from "@/lib/format";

function primaryName(client: ClientRecord): string {
  const tagged = client.diagnoses.find((item) => item.notes === "Primary condition");
  if (tagged) return tagged.name;
  return client.diagnoses[0]?.name ?? "";
}

function namesFor(client: ClientRecord, notes: string): string[] {
  return client.diagnoses
    .filter((item) => item.notes === notes)
    .map((item) => (notes === "Allergy" ? stripAllergyPrefix(item.name) : item.name));
}

function preferredLanguage(client: ClientRecord): string {
  return (client.languages.find((item) => item.isPrimary) ?? client.languages[0])?.name ?? "";
}

function primaryContact(client: ClientRecord) {
  return client.emergencyContacts.find((item) => item.isPrimary) ?? client.emergencyContacts[0] ?? null;
}

export function ProfileEditor({ client, onSaved }: { client: ClientRecord; onSaved: () => Promise<void> }) {
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(dateInputValue(client.dateOfBirth));
  const [gender, setGender] = useState(client.gender);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email);
  const baselineStatus = client.status === "inactive" ? "inactive" : client.status === "active" ? "active" : client.status;
  const [status, setStatus] = useState(baselineStatus || "active");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const payload = useMemo<ClientUpdate>(() => {
    const next: ClientUpdate = {};
    if (firstName !== client.firstName) next.firstName = firstName;
    if (lastName !== client.lastName) next.lastName = lastName;
    if (dateOfBirth !== dateInputValue(client.dateOfBirth)) next.dateOfBirth = dateOfBirth;
    if (gender !== client.gender) next.gender = gender;
    if (phone !== client.phone) next.phone = phone;
    if (email !== client.email) next.email = email;
    if (status === "active" || status === "inactive") {
      if (status !== (client.status || "active") && status !== client.status) next.status = status;
    }
    return next;
  }, [client, dateOfBirth, email, firstName, gender, lastName, phone, status]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (dateOfBirth && !isDobInRange(dateOfBirth)) {
      setFields({ dateOfBirth: "Use a date from 1900 through today." });
      return;
    }
    if (!Object.keys(payload).length) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await updateClient(client.id, payload);
      await onSaved();
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Panel
        id="profile"
        title="Profile"
        action={
          <Button type="submit" disabled={pending || Object.keys(payload).length === 0}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        }
      >
        <div className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          {saved ? <Alert tone="success">Profile saved.</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Last name" error={fields.lastName}>
              <TextInput value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </Field>
            <Field label="First name" error={fields.firstName}>
              <TextInput value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </Field>
            <Field label="Date of birth" error={fields.dateOfBirth}>
              <TextInput
                type="date"
                min="1900-01-01"
                max={todayInputValue()}
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
              />
            </Field>
            <Field label="Gender" error={fields.gender}>
              <SelectInput value={gender} onChange={(event) => setGender(event.target.value as typeof gender)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
            <Field label="Phone" error={fields.phone}>
              <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            <Field label="Email" error={fields.email}>
              <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="Status" hint="Active or inactive." error={fields.status}>
              <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
                {status !== "active" && status !== "inactive" ? <option value={status}>{status}</option> : null}
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </Field>
          </div>
        </div>
      </Panel>
    </form>
  );
}

export function EmergencyEditor({ client, onSaved }: { client: ClientRecord; onSaved: () => Promise<void> }) {
  const contact = primaryContact(client);
  const [name, setName] = useState(contact?.name ?? "");
  const [relationship, setRelationship] = useState(contact?.relationship ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const payload = useMemo<ClientUpdate>(() => {
    const next: ClientUpdate = {};
    if (name !== (contact?.name ?? "")) next.emergencyContactName = name;
    if (relationship !== (contact?.relationship ?? "")) next.emergencyContactRelation = relationship;
    if (phone !== (contact?.phone ?? "")) next.emergencyContactPhone = phone;
    return next;
  }, [contact, name, phone, relationship]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!Object.keys(payload).length) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await updateClient(client.id, payload);
      await onSaved();
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Panel
        id="emergency"
        title="Emergency contact"
        action={
          <Button type="submit" disabled={pending || Object.keys(payload).length === 0}>
            {pending ? "Saving…" : "Save contact"}
          </Button>
        }
      >
        <div className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          {saved ? <Alert tone="success">Emergency contact saved.</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" error={fields.emergencyContactName}>
              <TextInput value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Relationship" error={fields.emergencyContactRelation}>
              <TextInput value={relationship} onChange={(event) => setRelationship(event.target.value)} />
            </Field>
            <Field label="Phone" error={fields.emergencyContactPhone}>
              <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
          </div>
        </div>
      </Panel>
    </form>
  );
}

export function AddressEditor({ client, onSaved }: { client: ClientRecord; onSaved: () => Promise<void> }) {
  const address = client.address;
  const [street, setStreet] = useState(address?.street ?? "");
  const [apartment, setApartment] = useState(address?.apartment ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [state, setState] = useState(address?.state ?? "");
  const [zipCode, setZipCode] = useState(address?.zipCode ?? "");
  const [country, setCountry] = useState(address?.country ?? "");
  const [gateAccessCode, setGateAccessCode] = useState(address?.gateAccessCode ?? "");
  const [navigationInstructions, setNavigationInstructions] = useState(address?.navigationInstructions ?? "");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const changed = [
    street !== (address?.street ?? ""),
    apartment !== (address?.apartment ?? ""),
    city !== (address?.city ?? ""),
    state !== (address?.state ?? ""),
    zipCode !== (address?.zipCode ?? ""),
    country !== (address?.country ?? ""),
    gateAccessCode !== (address?.gateAccessCode ?? ""),
    navigationInstructions !== (address?.navigationInstructions ?? ""),
  ].some(Boolean);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await updateClient(client.id, {
        address: {
          street,
          apartment,
          city,
          state,
          zipCode,
          country,
          gateAccessCode,
          navigationInstructions,
        },
      });
      await onSaved();
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Panel
        id="address"
        title="Address and directions"
        action={
          <Button type="submit" disabled={pending || !changed}>
            {pending ? "Saving…" : "Save address"}
          </Button>
        }
      >
        <div className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          {saved ? <Alert tone="success">Address saved.</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street" error={fields.street}>
              <TextInput value={street} onChange={(event) => setStreet(event.target.value)} />
            </Field>
            <Field label="Apartment" error={fields.apartment}>
              <TextInput value={apartment} onChange={(event) => setApartment(event.target.value)} />
            </Field>
            <Field label="City" error={fields.city}>
              <TextInput value={city} onChange={(event) => setCity(event.target.value)} />
            </Field>
            <Field label="State" error={fields.state}>
              <TextInput value={state} onChange={(event) => setState(event.target.value)} />
            </Field>
            <Field label="Postal / zip" error={fields.zipCode}>
              <TextInput value={zipCode} onChange={(event) => setZipCode(event.target.value)} />
            </Field>
            <Field label="Country" error={fields.country}>
              <TextInput value={country} onChange={(event) => setCountry(event.target.value)} />
            </Field>
            <Field label="Gate code" error={fields.gateAccessCode}>
              <TextInput value={gateAccessCode} onChange={(event) => setGateAccessCode(event.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Navigation instructions" error={fields.navigationInstructions}>
                <TextArea value={navigationInstructions} onChange={(event) => setNavigationInstructions(event.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      </Panel>
    </form>
  );
}

export function DiagnosisEditor({ client, onSaved }: { client: ClientRecord; onSaved: () => Promise<void> }) {
  const originalPrimary = primaryName(client);
  const originalMedical = namesFor(client, "Medical condition");
  const originalAllergies = namesFor(client, "Allergy");
  const [primaryCondition, setPrimaryCondition] = useState(originalPrimary);
  const [medicalConditions, setMedicalConditions] = useState(originalMedical);
  const [allergies, setAllergies] = useState(originalAllergies);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const payload = useMemo<ClientUpdate>(() => {
    const next: ClientUpdate = {};
    if (primaryCondition !== originalPrimary) next.primaryCondition = primaryCondition;
    if (!sameList(medicalConditions, originalMedical)) next.medicalConditions = medicalConditions;
    if (!sameList(allergies, originalAllergies)) next.allergies = allergies;
    return next;
  }, [allergies, medicalConditions, originalAllergies, originalMedical, originalPrimary, primaryCondition]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!Object.keys(payload).length) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await updateClient(client.id, payload);
      await onSaved();
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Panel
        id="diagnoses"
        title="Diagnoses"
        action={
          <Button type="submit" disabled={pending || Object.keys(payload).length === 0}>
            {pending ? "Saving…" : "Save diagnoses"}
          </Button>
        }
      >
        <div className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          {saved ? <Alert tone="success">Diagnoses saved.</Alert> : null}
          <p className="text-sm text-muted">
            Tags stay Primary condition, Medical condition, or Allergy. ICD codes are shown from the record.
          </p>
          <Field label="Primary condition" error={fields.primaryCondition}>
            <TextInput value={primaryCondition} onChange={(event) => setPrimaryCondition(event.target.value)} />
          </Field>
          <StringListEditor
            label="Medical conditions"
            values={medicalConditions}
            onChange={setMedicalConditions}
            placeholder="Add a condition"
            error={fields.medicalConditions}
          />
          <StringListEditor
            label="Allergies"
            values={allergies}
            onChange={setAllergies}
            placeholder="Add an allergy"
            error={fields.allergies}
          />
          {client.diagnoses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Name</th>
                    <th className="py-2 pr-3 font-semibold">Notes</th>
                    <th className="py-2 pr-3 font-semibold">ICD code</th>
                    <th className="py-2 font-semibold">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {client.diagnoses.map((item) => (
                    <tr key={item.id || item.name} className="border-t border-line">
                      <td className="py-2 pr-3">{item.name || "—"}</td>
                      <td className="py-2 pr-3">{item.notes || "—"}</td>
                      <td className="py-2 pr-3">{item.icdCode || "—"}</td>
                      <td className="py-2">{item.notes ? "—" : item.severity || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">No diagnosis rows yet.</p>
          )}
        </div>
      </Panel>
    </form>
  );
}

export function LanguageEditor({ client, onSaved }: { client: ClientRecord; onSaved: () => Promise<void> }) {
  const originalLanguage = preferredLanguage(client);
  const [language, setLanguage] = useState(originalLanguage);
  const [communicationNote, setCommunicationNote] = useState(client.notes);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const payload = useMemo<ClientUpdate>(() => {
    const next: ClientUpdate = {};
    if (language !== originalLanguage) next.language = language;
    if (communicationNote !== client.notes) next.communicationNote = communicationNote;
    return next;
  }, [client.notes, communicationNote, language, originalLanguage]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!Object.keys(payload).length) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await updateClient(client.id, payload);
      await onSaved();
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Panel
        id="language"
        title="Language"
        action={
          <Button type="submit" disabled={pending || Object.keys(payload).length === 0}>
            {pending ? "Saving…" : "Save language"}
          </Button>
        }
      >
        <div className="space-y-4">
          {error ? <Alert>{error}</Alert> : null}
          {saved ? <Alert tone="success">Language saved.</Alert> : null}
          {client.languages.length > 1 ? (
            <p className="text-sm text-muted">
              Languages on file: {client.languages.map((item) => item.name).filter(Boolean).join(", ")}. This save updates the preferred language.
            </p>
          ) : null}
          <Field label="Preferred language" error={fields.language}>
            <TextInput value={language} onChange={(event) => setLanguage(event.target.value)} />
          </Field>
          <Field label="Communication note" error={fields.communicationNote}>
            <TextArea value={communicationNote} onChange={(event) => setCommunicationNote(event.target.value)} />
          </Field>
        </div>
      </Panel>
    </form>
  );
}
