"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PasswordFields } from "@/components/password-fields";
import { Alert, Button, Field, PageHeader, Panel, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { createSales } from "@/lib/api/resources";
import type { CreateSalesInput } from "@/lib/api/types";
import { EMAIL_PATTERN, isDobInRange, splitFullName, todayInputValue } from "@/lib/format";
import { confirmPasswordError, strongPasswordError } from "@/lib/password";

export default function NewSalesPersonPage() {
  const router = useRouter();
  const [fullNameValue, setFullNameValue] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [today, setToday] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setToday(todayInputValue());
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const name = splitFullName(fullNameValue);
    if (!name.firstName || !name.lastName) next.fullName = "Enter a last name and a first name.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email.";
    if (!phone.trim()) next.phone = "Phone is required.";
    if (!dateOfBirth) next.dateOfBirth = "Date of birth is required.";
    else if (!isDobInRange(dateOfBirth)) next.dateOfBirth = "Use a date from 1900 through today.";
    const passwordMessage = strongPasswordError(password);
    const confirmMessage = confirmPasswordError(password, confirm);
    if (passwordMessage) next.password = passwordMessage;
    if (confirmMessage) next.confirm = confirmMessage;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload: CreateSalesInput = {
      firstName: name.firstName,
      lastName: name.lastName,
      email: email.trim(),
      phone: phone.trim(),
      dateOfBirth,
      password,
    };

    setPending(true);
    setFormError("");
    try {
      const id = await createSales(payload);
      router.replace(id ? `/sales/${id}` : "/sales");
    } catch (caught) {
      setFormError(errorMessage(caught));
      setErrors(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5" noValidate>
      <PageHeader
        eyebrow="Sales"
        title="New sales person"
        description="This creates a sales sign-in. The account starts active."
      />
      {formError ? <Alert>{formError}</Alert> : null}
      <Panel title="Account">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" hint="Last name, first name." error={errors.fullName || errors.firstName || errors.lastName}>
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
          <Field label="Date of birth" hint="Year 1900 through today." error={errors.dateOfBirth}>
            <TextInput
              type="date"
              min="1900-01-01"
              max={today || undefined}
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
            />
          </Field>
          <PasswordFields
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            passwordError={errors.password}
            confirmError={errors.confirm}
          />
        </div>
      </Panel>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create sales person"}
      </Button>
    </form>
  );
}
