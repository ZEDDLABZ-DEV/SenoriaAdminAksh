"use client";

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { DatePicker } from "@/components/date-calendar";
import { toHhmm } from "@/lib/format";

const FieldIdContext = createContext<string | undefined>(undefined);

export const inputClass =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper";

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-pine text-white hover:bg-pine-dark disabled:bg-pine/50",
    secondary: "border border-line bg-card text-ink hover:bg-paper disabled:opacity-50",
    danger: "bg-danger text-white hover:bg-danger/90 disabled:opacity-50",
    ghost: "text-pine hover:bg-moss disabled:opacity-50",
  }[variant];
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold transition ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <FieldIdContext.Provider value={id}>
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
        {children}
        {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
        {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
      </div>
    </FieldIdContext.Provider>
  );
}

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

function TimeInput({
  id,
  className = "",
  value,
  disabled,
  onChange,
  "aria-label": ariaLabel,
  autoFocus,
}: Pick<React.ComponentProps<"input">, "id" | "className" | "value" | "disabled" | "onChange" | "aria-label" | "autoFocus">) {
  const current = toHhmm(typeof value === "string" ? value : "");
  const [hour, minute] = current ? current.split(":") : ["", ""];
  const narrow = className.includes("w-auto");
  const label = ariaLabel?.trim() || "Time";

  function emit(next: string) {
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as React.ChangeEvent<HTMLInputElement>);
  }

  function update(part: "hour" | "minute", selected: string) {
    const nextHour = part === "hour" ? selected : hour;
    const nextMinute = part === "minute" ? selected : minute;
    if (!selected || (!nextHour && !nextMinute)) {
      emit("");
      return;
    }
    emit(`${(nextHour || "00").padStart(2, "0")}:${(nextMinute || "00").padStart(2, "0")}`);
  }

  const selectClass = "bg-transparent px-2 py-2 text-sm text-ink outline-none disabled:text-muted";

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-line bg-card focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/20 ${narrow ? "w-auto" : "w-full"} ${disabled ? "bg-paper" : ""}`}
    >
      <select
        id={id}
        aria-label={`${label}, hour`}
        className={selectClass}
        value={hour}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => update("hour", event.target.value)}
      >
        <option value="">HH</option>
        {HOURS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted" aria-hidden>
        :
      </span>
      <select
        aria-label={`${label}, minute`}
        className={selectClass}
        value={minute}
        disabled={disabled}
        onChange={(event) => update("minute", event.target.value)}
      >
        <option value="">MM</option>
        {MINUTES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextInput({ className = "", id, ref, type, lang, ...props }: React.ComponentProps<"input">) {
  const fieldId = useContext(FieldIdContext);
  if (type === "time") {
    return <TimeInput id={id ?? fieldId} className={className} {...props} />;
  }
  if (type === "date") {
    const value = typeof props.value === "string" ? props.value : "";
    return (
      <DatePicker
        id={id ?? fieldId}
        className={className}
        value={value}
        min={props.min == null ? undefined : String(props.min)}
        max={props.max == null ? undefined : String(props.max)}
        disabled={Boolean(props.disabled || props.readOnly)}
        required={props.required}
        autoFocus={props.autoFocus}
        name={typeof props.name === "string" ? props.name : undefined}
        placeholder={props.placeholder}
        aria-label={props["aria-label"]}
        onValueChange={(next) => {
          props.onChange?.({
            target: { value: next },
            currentTarget: { value: next },
          } as React.ChangeEvent<HTMLInputElement>);
        }}
      />
    );
  }
  return <input ref={ref} id={id ?? fieldId} type={type} lang={lang} className={`${inputClass} ${className}`} {...props} />;
}

export function TextArea({ className = "", id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fieldId = useContext(FieldIdContext);
  return <textarea id={id ?? fieldId} className={`${inputClass} min-h-24 resize-y ${className}`} {...props} />;
}

export function SelectInput({ className = "", id, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = useContext(FieldIdContext);
  return <select id={id ?? fieldId} className={`${inputClass} ${className}`} {...props} />;
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-danger/20 bg-red-50 text-danger",
    success: "border-pine/20 bg-moss text-pine-dark",
    info: "border-line bg-card text-ink",
  }[tone];
  return (
    <div role="alert" className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Panel({
  id,
  title,
  action,
  children,
}: {
  id?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase">{eyebrow}</p> : null}
        <h1 className="font-display text-4xl text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-moss font-semibold text-pine-dark ${className}`}
      aria-hidden
    >
      {name}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const styles = {
    neutral: "bg-paper text-ink",
    good: "bg-moss text-pine-dark",
    warn: "bg-amber-100 text-gold",
    bad: "bg-red-50 text-danger",
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{children}</span>;
}

export function StateBlock({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const fieldId = useId();

  function add() {
    const next = draft.trim();
    if (!next) return;
    onChange([...values, next]);
    setDraft("");
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink" id={fieldId}>
        {label}
      </span>
      <div className="flex gap-2">
        <input
          className={inputClass}
          aria-labelledby={fieldId}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      {values.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1 text-sm">
              {value}
              <button
                type="button"
                className="text-muted hover:text-danger"
                onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`Remove ${value}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">None added.</p>
      )}
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
    </div>
  );
}

/** Centered modal shell. Closes on Escape unless `pending`. */
export function Modal({
  open,
  title,
  description,
  size = "md",
  pending,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  size?: "md" | "lg";
  pending?: boolean;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  if (!open) return null;
  const width = size === "lg" ? "max-w-2xl" : "max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-2xl bg-card p-5 shadow-xl`}
      >
        <h2 id={titleId} className="font-display text-2xl">
          {title}
        </h2>
        {description ? <div className="mt-2 text-sm text-muted">{description}</div> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmVariant = "danger",
  cancelLabel = "Cancel",
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  confirmVariant?: "danger" | "primary";
  cancelLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={body}
      pending={pending}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    />
  );
}

/** Segmented control used for status tabs and view switches. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="flex w-fit rounded-lg bg-card p-1 ring-1 ring-line" role="group" aria-label={label}>
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${value === item.id ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function DefinitionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{item.label}</dt>
          <dd className="mt-1 text-sm text-ink">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
