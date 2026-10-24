"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { resetPassword } from "@/lib/api/resources";

function ResetForm() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!token.trim()) next.token = "Enter the reset code.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    if (password !== confirm) next.confirm = "Passwords do not match.";
    setFields(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    setError("");
    try {
      setMessage(await resetPassword(token, password));
      setPassword("");
      setConfirm("");
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full" noValidate>
      <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase">Password reset</p>
      <h1 className="font-display mt-2 text-4xl">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted">At least 6 characters. No symbol or number is required.</p>
      <div className="mt-6 space-y-4">
        {message ? <Alert tone="success">{message}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Reset code" error={fields.token}>
          <TextInput value={token} onChange={(event) => setToken(event.target.value)} autoComplete="one-time-code" />
        </Field>
        <Field label="New password" error={fields.password}>
          <TextInput
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm password" error={fields.confirm}>
          <TextInput
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
        <Link href="/login" className="block text-sm font-semibold text-pine hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
