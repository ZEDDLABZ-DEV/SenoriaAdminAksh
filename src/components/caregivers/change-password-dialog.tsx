"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Field, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { caregiverPasswordError, confirmPasswordError } from "@/lib/password";

export function ChangePasswordDialog({
  open,
  caregiverName,
  onClose,
  onSave,
}: {
  open: boolean;
  caregiverName: string;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) return;
    setPassword("");
    setConfirm("");
    setVisible(false);
    setErrors({});
    setFormError("");
    setPending(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const passwordMessage = caregiverPasswordError(password);
    const confirmMessage = confirmPasswordError(password, confirm);
    if (passwordMessage) next.password = passwordMessage;
    if (confirmMessage) next.confirm = confirmMessage;
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await onSave(password);
      onClose();
    } catch (caught) {
      const fields = fieldErrors(caught);
      const message = errorMessage(caught);
      const fieldShown = Boolean(fields.password || fields.confirm || fields.confirmPassword);
      setErrors(fields);
      setFormError(fieldShown && message === "Validation failed" ? "" : message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="presentation">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl"
        onSubmit={onSubmit}
        noValidate
      >
        <h2 id="change-password-title" className="font-display text-2xl">
          Change password
        </h2>
        <p className="mt-2 text-sm text-muted">
          Set a new sign-in password for {caregiverName}. Their old password stops working, and their current sign-in
          ends.
        </p>
        {formError ? (
          <div className="mt-4">
            <Alert>{formError}</Alert>
          </div>
        ) : null}
        <div className="mt-4 grid gap-4">
          <Field label="New password" hint="At least 6 characters." error={errors.password}>
            <div className="relative">
              <TextInput
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                value={password}
                disabled={pending}
                className="pr-16"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((current) => ({ ...current, password: "" }));
                }}
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
          <Field label="Confirm password" error={errors.confirm || errors.confirmPassword}>
            <TextInput
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              disabled={pending}
              onChange={(event) => {
                setConfirm(event.target.value);
                if (errors.confirm || errors.confirmPassword) {
                  setErrors((current) => ({ ...current, confirm: "", confirmPassword: "" }));
                }
              }}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Update password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
