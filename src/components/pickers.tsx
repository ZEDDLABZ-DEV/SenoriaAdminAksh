"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Field, TextInput } from "@/components/ui";
import type { CaregiverRecord, ClientRecord, NamedCatalogItem } from "@/lib/api/types";
import { fullName } from "@/lib/format";

export interface PickerOption {
  id: string;
  label: string;
  detail: string;
}

export function clientOptions(clients: ClientRecord[]): PickerOption[] {
  return clients.map((client) => ({
    id: client.id,
    label: fullName(client.firstName, client.lastName, client.email || "Unnamed client"),
    detail: client.phone,
  }));
}

export function caregiverOptions(caregivers: CaregiverRecord[]): PickerOption[] {
  return caregivers.map((caregiver) => ({
    id: caregiver.id,
    label: fullName(caregiver.firstName, caregiver.lastName, caregiver.email || "Unnamed caregiver"),
    detail: caregiver.role,
  }));
}

function optionText(option: PickerOption) {
  return option.detail ? `${option.label} — ${option.detail}` : option.label;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden>
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden>
      <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Searchable single-select combobox. */
export function Picker({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  disabled,
}: {
  label: string;
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const noun = label.toLowerCase();
  const selected = options.find((option) => option.id === value);
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      needle
        ? options.filter((option) => `${option.label} ${option.detail}`.toLowerCase().includes(needle))
        : options,
    [needle, options],
  );

  useEffect(() => {
    if (!open) return;
    const selectedIndex = visible.findIndex((option) => option.id === value);
    setHighlight(needle ? 0 : selectedIndex >= 0 ? selectedIndex : 0);
  }, [needle, open, value, visible]);

  useEffect(() => {
    if (!open) return;
    const node = rootRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function closeMenu() {
    setOpen(false);
    setQuery("");
    setEditing(false);
  }

  function choose(id: string) {
    onChange(id);
    closeMenu();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((index) => Math.min(index + 1, Math.max(visible.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = visible[highlight];
      if (option) choose(option.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }

  return (
    <Field label={label} error={error} hint={hint}>
      <div
        ref={rootRef}
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu();
        }}
      >
        <TextInput
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && visible[highlight] ? `${listId}-${visible[highlight].id}` : undefined}
          autoComplete="off"
          disabled={disabled}
          value={editing ? query : selected ? optionText(selected) : ""}
          placeholder={open ? `Search ${noun}s` : `Choose a ${noun}`}
          className={value ? "pr-16" : "pr-9"}
          onMouseDown={() => !disabled && setOpen(true)}
          onFocus={(event) => {
            if (disabled) return;
            setOpen(true);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setEditing(true);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {!disabled ? (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {value ? (
              <button
                type="button"
                className="rounded p-1 text-muted hover:text-ink"
                aria-label={`Clear ${noun}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange("");
                  setQuery("");
                  setEditing(true);
                  setOpen(true);
                  inputRef.current?.focus();
                }}
              >
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className="rounded p-1 text-muted hover:text-ink"
              aria-label={open ? `Close ${noun} list` : `Open ${noun} list`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (open) closeMenu();
                else {
                  setOpen(true);
                  inputRef.current?.focus();
                }
              }}
            >
              <Chevron open={open} />
            </button>
          </div>
        ) : null}
        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute top-full z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-card py-1 shadow-lg shadow-ink/10"
          >
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">{options.length === 0 ? `No ${noun}s available` : "No matches"}</li>
            ) : (
              visible.map((option, index) => {
                const isSelected = option.id === value;
                const isActive = index === highlight;
                return (
                  <li key={option.id} role="presentation">
                    <button
                      type="button"
                      id={`${listId}-${option.id}`}
                      role="option"
                      aria-selected={isSelected}
                      data-index={index}
                      className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left ${
                        isSelected ? "bg-moss" : isActive ? "bg-paper" : "hover:bg-paper"
                      }`}
                      onMouseEnter={() => setHighlight(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(option.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{option.label}</span>
                        {option.detail ? <span className="block truncate text-xs text-muted">{option.detail}</span> : null}
                      </span>
                      {isSelected ? <Check /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}

/** Searchable multi-select with removable chips. */
export function MultiPicker({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  placeholder,
  searchPlaceholder,
  emptyContent,
  missingLabel = "Saved item",
  max,
}: {
  label: string;
  options: NamedCatalogItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  hint?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyContent?: ReactNode;
  /** Chip text for an id that is selected but no longer in `options`. */
  missingLabel?: string;
  max?: number;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => (needle ? options.filter((option) => option.name.toLowerCase().includes(needle)) : options),
    [needle, options],
  );
  const selected = options.filter((option) => value.includes(option.id));
  const missing = value.filter((id) => !options.some((option) => option.id === id));
  const atMax = max != null && value.length >= max;

  function closeMenu() {
    setOpen(false);
    setQuery("");
  }

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else if (!atMax) onChange([...value, id]);
  }

  return (
    <Field label={label} error={error} hint={hint}>
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenu();
        }}
      >
        {selected.length > 0 || missing.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selected.map((option) => (
              <button
                key={option.id}
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-moss px-2.5 py-1 text-xs font-medium text-ink"
                aria-label={`Remove ${option.name}`}
                onClick={() => toggle(option.id)}
              >
                {option.name}
                <span aria-hidden>×</span>
              </button>
            ))}
            {missing.map((id) => (
              <button
                key={id}
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink"
                aria-label={`Remove ${missingLabel}`}
                onClick={() => toggle(id)}
              >
                {missingLabel}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className={`${open ? "border-pine ring-2 ring-pine/20" : ""} flex w-full items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-left text-sm`}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={value.length === 0 ? "text-muted" : "text-ink"}>
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <span className="text-muted">
            <Chevron open={open} />
          </span>
        </button>
        {open ? (
          <div className="absolute top-full z-30 mt-1 w-full rounded-lg border border-line bg-card py-2 shadow-lg shadow-ink/10">
            <div className="px-2 pb-2">
              <TextInput
                id={`${listId}-search`}
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <ul id={listId} role="listbox" aria-label={label} aria-multiselectable="true" className="max-h-60 overflow-auto">
              {visible.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted">{options.length === 0 ? emptyContent ?? "Nothing to choose" : "No matches"}</li>
              ) : (
                visible.map((option) => {
                  const isSelected = value.includes(option.id);
                  const blocked = !isSelected && atMax;
                  return (
                    <li key={option.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={blocked || undefined}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                          isSelected ? "bg-moss" : blocked ? "cursor-not-allowed text-muted" : "hover:bg-paper"
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => toggle(option.id)}
                      >
                        <span className="font-medium">{option.name}</span>
                        {isSelected ? <Check /> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </Field>
  );
}

export function ServicePicker({
  options,
  value,
  onChange,
  error,
}: {
  options: NamedCatalogItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  return (
    <MultiPicker
      label="Services"
      options={options}
      value={value}
      onChange={onChange}
      error={error}
      hint="Choose one or more. Add or rename services in Settings."
      placeholder="Choose services"
      searchPlaceholder="Search services"
      missingLabel="Saved service"
      emptyContent={
        <>
          No services yet.{" "}
          <Link href="/settings" className="font-semibold text-pine hover:underline">
            Add them in Settings
          </Link>
          .
        </>
      }
    />
  );
}
