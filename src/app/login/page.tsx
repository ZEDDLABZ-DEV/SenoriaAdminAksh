"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { login } from "@/lib/api/resources";
import { consumeFlash, hasSession, resetSessionEndGuard } from "@/lib/api/session";
import { EMAIL_PATTERN } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    resetSessionEndGuard();
    setFlash(consumeFlash());
    if (hasSession()) router.replace("/home");
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextFields: Record<string, string> = {};
    if (!EMAIL_PATTERN.test(email.trim())) nextFields.email = "Enter a valid email address.";
    if (!password) nextFields.password = "Password is required.";
    setFieldError(nextFields);
    if (Object.keys(nextFields).length > 0) return;

    setPending(true);
    setError("");
    const result = await login(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      setFieldError(result.fields);
      return;
    }
    refreshUser();
    router.replace("/home");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-ink px-12 py-14 text-paper lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-paper/60 uppercase">Senoria Seniors</p>
          <h1 className="font-display mt-6 max-w-md text-6xl leading-tight text-white">The office desk for client care.</h1>
        </div>
        <p className="max-w-sm text-sm text-paper/70">Clients, care plans, visits, and caregivers. One administrator account.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-md" noValidate>
          <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase">Admin portal</p>
          <h2 className="font-display mt-2 text-4xl">Sign in</h2>
          <p className="mt-2 text-sm text-muted">Use the administrator email and password.</p>
          <div className="mt-6 space-y-4">
            {flash ? <Alert tone="info">{flash}</Alert> : null}
            {error ? <Alert>{error}</Alert> : null}
            <Field label="Email" error={fieldError.email}>
              <TextInput
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Password" error={fieldError.password}>
              <div className="relative">
                <TextInput
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-16"
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-pine"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between">
              <Link href="/forgot-password" className="text-sm font-semibold text-pine hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
