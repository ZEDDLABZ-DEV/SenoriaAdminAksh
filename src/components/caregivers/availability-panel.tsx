"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { Alert, Button, Panel, TextInput, inputClass } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import { getCaregiverAvailability, saveCaregiverAvailability } from "@/lib/api/resources";
import type { AvailabilityWindow } from "@/lib/api/types";
import {
  SCHEDULE_TEXT,
  WEEKDAY_LONG,
  WORK_WEEKDAYS,
  availabilityErrors,
  normalizeSlot,
  sortSlots,
} from "@/lib/schedule";

interface DraftWindow extends AvailabilityWindow {
  key: number;
}

const DEFAULT_WINDOW = { startTime: "09:00", endTime: "17:00" };

let keyCounter = 0;
function nextKey(): number {
  keyCounter += 1;
  return keyCounter;
}

function toDraft(windows: AvailabilityWindow[]): DraftWindow[] {
  return windows.map((window) => ({ ...window, key: nextKey() }));
}

function toPayload(windows: DraftWindow[]): AvailabilityWindow[] {
  return sortSlots(
    windows.map((window) => normalizeSlot({ weekday: window.weekday, startTime: window.startTime, endTime: window.endTime })),
  ).sort((left, right) => left.weekday - right.weekday);
}

function sameWindows(left: AvailabilityWindow[], right: AvailabilityWindow[]): boolean {
  if (left.length !== right.length) return false;
  return left.every(
    (window, index) =>
      window.weekday === right[index].weekday &&
      window.startTime === right[index].startTime &&
      window.endTime === right[index].endTime,
  );
}

export function AvailabilityPanel({ caregiverId }: { caregiverId: string }) {
  const toast = useToast();
  const text = SCHEDULE_TEXT.availability;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState<AvailabilityWindow[]>([]);
  const [draft, setDraft] = useState<DraftWindow[]>([]);
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await getCaregiverAvailability(caregiverId);
      setSaved(result.windows);
      setDraft(toDraft(result.windows));
      setTouched(false);
    } catch (caught) {
      setLoadError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [caregiverId]);

  useEffect(() => {
    void load();
  }, [load]);

  const payload = useMemo(() => toPayload(draft), [draft]);
  const errors = useMemo(() => (touched ? availabilityErrors(payload) : {}), [payload, touched]);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = !sameWindows(payload, saved);

  function update(key: number, patch: Partial<AvailabilityWindow>) {
    setTouched(true);
    setDraft((current) => current.map((window) => (window.key === key ? { ...window, ...patch } : window)));
  }

  function add(weekday: number) {
    setTouched(true);
    setDraft((current) => {
      const existing = sortSlots(current.filter((window) => window.weekday === weekday));
      const last = existing[existing.length - 1];
      const start = last ? last.endTime : DEFAULT_WINDOW.startTime;
      const end = last ? bumpHour(last.endTime) : DEFAULT_WINDOW.endTime;
      return [...current, { key: nextKey(), weekday, startTime: start, endTime: end }];
    });
  }

  function remove(key: number) {
    setTouched(true);
    setDraft((current) => current.filter((window) => window.key !== key));
  }

  function copyMondayToWeekdays() {
    setTouched(true);
    setDraft((current) => {
      const monday = current.filter((window) => window.weekday === 1);
      const kept = current.filter((window) => !WORK_WEEKDAYS.includes(window.weekday) || window.weekday === 1);
      const copies = WORK_WEEKDAYS.filter((day) => day !== 1).flatMap((day) =>
        monday.map((window) => ({ ...window, weekday: day, key: nextKey() })),
      );
      return [...kept, ...copies];
    });
  }

  async function save() {
    setTouched(true);
    const problems = availabilityErrors(payload);
    if (Object.keys(problems).length > 0) return;
    setPending(true);
    setSaveError("");
    try {
      const result = await saveCaregiverAvailability(caregiverId, payload);
      setSaved(result.windows);
      setDraft(toDraft(result.windows));
      setTouched(false);
      toast.success(text.saved);
    } catch (caught) {
      const fields = fieldErrors(caught);
      const detail = Object.values(fields).filter(Boolean).join(" ");
      setSaveError(detail ? `${errorMessage(caught)} ${detail}` : errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const hasMonday = draft.some((window) => window.weekday === 1);

  return (
    <Panel
      id="availability"
      title={text.title}
      action={
        <Button variant="ghost" onClick={copyMondayToWeekdays} disabled={loading || pending || !hasMonday}>
          {text.copyMonday}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted">{text.intro}</p>
      {loading ? <p className="text-sm text-muted">Loading working hours…</p> : null}
      {loadError ? (
        <Alert>
          {loadError}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !loadError ? (
        <div className="space-y-4">
          {payload.length === 0 ? <Alert tone="info">{text.emptyHint}</Alert> : null}
          {saveError ? <Alert>{saveError}</Alert> : null}
          <ul className="divide-y divide-line rounded-xl border border-line">
            {WEEKDAY_LONG.map((label, weekday) => {
              const rows = sortSlots(draft.filter((window) => window.weekday === weekday));
              const dayError = errors[weekday];
              return (
                <li key={label} className="grid gap-3 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="pt-2 text-sm font-semibold text-ink">{label}</div>
                  <div className="space-y-2">
                    {rows.length === 0 ? <p className="pt-2 text-sm text-muted">{text.noHours}</p> : null}
                    {rows.map((window) => (
                      <div key={window.key} className="flex flex-wrap items-center gap-2">
                        <TextInput
                          type="time"
                          aria-label={`${label} start`}
                          className="w-auto"
                          value={window.startTime}
                          disabled={pending}
                          onChange={(event) => update(window.key, { startTime: event.target.value })}
                        />
                        <span className="text-sm text-muted">to</span>
                        <TextInput
                          type="time"
                          aria-label={`${label} end`}
                          className="w-auto"
                          value={window.endTime}
                          disabled={pending}
                          onChange={(event) => update(window.key, { endTime: event.target.value })}
                        />
                        <button
                          type="button"
                          className="text-sm font-semibold text-muted hover:text-danger disabled:opacity-50"
                          onClick={() => remove(window.key)}
                          disabled={pending}
                        >
                          {text.removeWindow}
                        </button>
                      </div>
                    ))}
                    {dayError ? <p className="text-sm text-danger">{dayError}</p> : null}
                    <button
                      type="button"
                      className={`${inputClass} w-auto border-dashed py-1.5 text-pine hover:bg-moss disabled:opacity-50`}
                      onClick={() => add(weekday)}
                      disabled={pending}
                    >
                      {text.addWindow}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void save()} disabled={pending || !dirty || hasErrors}>
              {pending ? "Saving…" : text.save}
            </Button>
            {dirty ? (
              <Button variant="secondary" onClick={() => void load()} disabled={pending}>
                Discard changes
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function bumpHour(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return DEFAULT_WINDOW.endTime;
  const hour = Math.min(23, Number(match[1]) + 1);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
