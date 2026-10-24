"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/ui";
import { passwordRules } from "@/lib/password";

export function PasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  passwordError,
  confirmError,
  passwordLabel = "Password",
  confirmLabel = "Confirm password",
}: {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  passwordError?: string;
  confirmError?: string;
  passwordLabel?: string;
  confirmLabel?: string;
}) {
  const [visible, setVisible] = useState(false);
  const rules = passwordRules(password);

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <Field label={passwordLabel} error={passwordError}>
        <div className="relative">
          <TextInput
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="pr-16"
          />
          <button
            type="button"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-pine"
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
      </Field>
      <Field label={confirmLabel} error={confirmError}>
        <TextInput
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => onConfirmChange(event.target.value)}
        />
      </Field>
      <ul className="grid gap-1 sm:col-span-2 sm:grid-cols-2" aria-label="Password requirements">
        {rules.map((rule) => (
          <li key={rule.id} className={`flex items-center gap-2 text-xs ${rule.met ? "text-pine" : "text-muted"}`}>
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${rule.met ? "bg-pine" : "bg-line"}`}
              aria-hidden
            />
            <span className="sr-only">{rule.met ? "Met: " : "Needed: "}</span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
