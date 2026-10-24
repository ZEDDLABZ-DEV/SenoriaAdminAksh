"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { forgotPassword } from "@/lib/api/resources";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { EMAIL_PATTERN } from "@/lib/format";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFields({ email: "Enter a valid email address." });
      return;
    }
    setPending(true);
    setError("");
    setFields({});
    try {
      setMessage(await forgotPassword(email));
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <form onSubmit={onSubmit} className="w-full" noValidate>
        <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase">Password reset</p>
        <h1 className="font-display mt-2 text-4xl">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">Enter the administrator email. A new password must be at least 6 characters.</p>
        <div className="mt-6 space-y-4">
          {message ? <Alert tone="success">{message}</Alert> : null}
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Email" error={fields.email}>
            <TextInput type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-sm">
            <Link href="/reset-password" className="font-semibold text-pine hover:underline">
              I have a reset code
            </Link>
            <span className="mx-2 text-muted">·</span>
            <Link href="/login" className="font-semibold text-pine hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
