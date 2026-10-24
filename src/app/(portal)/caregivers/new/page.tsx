"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PasswordFields } from "@/components/password-fields";
import { Alert, Button, Field, PageHeader, Panel, SelectInput, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { createCaregiver, listCaregiverPositions } from "@/lib/api/resources";
import type { CaregiverPosition, CreateCaregiverInput } from "@/lib/api/types";
import { EMAIL_PATTERN, splitFullName } from "@/lib/format";
import { confirmPasswordError, strongPasswordError } from "@/lib/password";

export default function NewCaregiverPage() {
  const router = useRouter();
  const [fullNameValue, setFullNameValue] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [positions, setPositions] = useState<CaregiverPosition[]>([]);
  const [positionsError, setPositionsError] = useState("");
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function loadPositions() {
    setLoadingPositions(true);
    setPositionsError("");
    listCaregiverPositions()
      .then(setPositions)
      .catch((caught: unknown) => setPositionsError(errorMessage(caught)))
      .finally(() => setLoadingPositions(false));
  }

  useEffect(() => {
    loadPositions();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const name = splitFullName(fullNameValue);
    if (!name.firstName || !name.lastName) next.fullName = "Enter a last name and a first name.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email.";
    if (!phone.trim()) next.phone = "Phone is required.";
    if (!position) next.position = "Choose a position.";
    const passwordMessage = strongPasswordError(password);
    const confirmMessage = confirmPasswordError(password, confirm);
    if (passwordMessage) next.password = passwordMessage;
    if (confirmMessage) next.confirm = confirmMessage;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload: CreateCaregiverInput = {
      firstName: name.firstName,
      lastName: name.lastName,
      email: email.trim(),
      phone: phone.trim(),
      password,
      position,
    };

    setPending(true);
    setFormError("");
    try {
      const id = await createCaregiver(payload);
      router.replace(id ? `/caregivers/${id}` : "/caregivers");
    } catch (caught) {
      setFormError(errorMessage(caught));
      setErrors(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Caregivers"
        title="New caregiver"
        description="This creates a caregiver sign-in. The position is a caregiver type from Settings."
      />
      {formError ? <Alert>{formError}</Alert> : null}
      {positionsError ? (
        <Alert>
          {positionsError}{" "}
          <button type="button" className="font-semibold underline" onClick={loadPositions}>
            Try again
          </button>
        </Alert>
      ) : null}
      <Panel title="Account">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" hint="Last name, first name." error={errors.fullName || errors.firstName || errors.lastName}>
            <TextInput value={fullNameValue} onChange={(event) => setFullNameValue(event.target.value)} autoComplete="name" />
          </Field>
          <Field label="Email" error={errors.email}>
            <TextInput
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
          </Field>
          <Field label="Position" hint="Caregiver types are managed in Settings. The chosen name is saved as the position." error={errors.position}>
            <SelectInput
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              disabled={loadingPositions || positions.length === 0}
            >
              <option value="">{loadingPositions ? "Loading positions…" : "Choose a position"}</option>
              {positions.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
            {!loadingPositions && positions.length === 0 ? (
              <Link href="/settings" className="mt-2 inline-block text-sm font-semibold text-pine hover:underline">
                Add caregiver types
              </Link>
            ) : null}
          </Field>
          <PasswordFields
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            passwordError={errors.password}
            confirmError={errors.confirm}
            passwordLabel="Initial password"
          />
        </div>
      </Panel>
      <Button type="submit" disabled={pending || loadingPositions}>
        {pending ? "Saving…" : "Create caregiver"}
      </Button>
    </form>
  );
}
