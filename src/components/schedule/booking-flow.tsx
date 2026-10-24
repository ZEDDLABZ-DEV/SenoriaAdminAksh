"use client";

import { useCallback, useRef, useState } from "react";
import { Alert, Button, Modal } from "@/components/ui";
import { isBookingConflictError, isScheduleWarningError } from "@/lib/api/errors";
import type { BookingConflict, BookingFlags, BookingWarning } from "@/lib/api/types";
import { formatClock, formatWeekdayDate } from "@/lib/format";
import { SCHEDULE_TEXT, formatTimeRange, warningLabel } from "@/lib/schedule";

const NO_FLAGS: BookingFlags = { skipConflicts: false, acknowledgeWarnings: false };

export type BookingIssue =
  | { kind: "conflict"; conflicts: BookingConflict[]; message: string }
  | { kind: "warning"; warnings: BookingWarning[] };

interface BookingTask<T> {
  submit: (flags: BookingFlags) => Promise<T>;
  onSuccess: (result: T, flags: BookingFlags) => void | Promise<void>;
  onError: (error: unknown) => void;
}

export interface BookingFlow<T> {
  issue: BookingIssue | null;
  pending: boolean;
  /** Start a fresh attempt. Flags are reset so edited form data is re-checked. */
  start: (task: BookingTask<T>) => Promise<void>;
  /** Resend with `skipConflicts: true`, keeping any acknowledged warnings. */
  skipConflicts: () => Promise<void>;
  /** Resend with `acknowledgeWarnings: true`, keeping any conflict skip. */
  acknowledgeWarnings: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Drives the create/edit visit flows through the two booking issues the API can return:
 * a 422 with `conflicts` and a 409 SCHEDULE_WARNING with `warnings`. Both can happen in
 * sequence, so the flags accumulate across retries of the same body.
 */
export function useBookingFlow<T>(): BookingFlow<T> {
  const [issue, setIssue] = useState<BookingIssue | null>(null);
  const [pending, setPending] = useState(false);
  const flagsRef = useRef<BookingFlags>(NO_FLAGS);
  const taskRef = useRef<BookingTask<T> | null>(null);

  const attempt = useCallback(async () => {
    const task = taskRef.current;
    if (!task) return;
    setPending(true);
    try {
      const flags = flagsRef.current;
      const result = await task.submit(flags);
      setIssue(null);
      taskRef.current = null;
      flagsRef.current = NO_FLAGS;
      await task.onSuccess(result, flags);
    } catch (error) {
      if (isBookingConflictError(error)) {
        setIssue({ kind: "conflict", conflicts: error.conflicts, message: error.message });
        return;
      }
      if (isScheduleWarningError(error)) {
        setIssue({ kind: "warning", warnings: error.warnings });
        return;
      }
      setIssue(null);
      taskRef.current = null;
      flagsRef.current = NO_FLAGS;
      task.onError(error);
    } finally {
      setPending(false);
    }
  }, []);

  const start = useCallback(
    (task: BookingTask<T>) => {
      taskRef.current = task;
      flagsRef.current = NO_FLAGS;
      return attempt();
    },
    [attempt],
  );

  const skipConflicts = useCallback(() => {
    flagsRef.current = { ...flagsRef.current, skipConflicts: true };
    return attempt();
  }, [attempt]);

  const acknowledgeWarnings = useCallback(() => {
    flagsRef.current = { ...flagsRef.current, acknowledgeWarnings: true };
    return attempt();
  }, [attempt]);

  const dismiss = useCallback(() => {
    setIssue(null);
    taskRef.current = null;
    flagsRef.current = NO_FLAGS;
  }, []);

  return { issue, pending, start, skipConflicts, acknowledgeWarnings, dismiss };
}

export function ConflictList({ conflicts }: { conflicts: BookingConflict[] }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line text-sm">
      {conflicts.map((conflict, index) => (
        <li key={`${conflict.date}-${conflict.startTime}-${conflict.appointmentId}-${index}`} className="px-3 py-2">
          <p className="font-medium text-ink">
            {formatWeekdayDate(conflict.date)} · {formatTimeRange(conflict.startTime, conflict.endTime)}
          </p>
          <p className="text-muted">
            {SCHEDULE_TEXT.booking.conflictWith(
              conflict.clientName,
              formatClock(conflict.existingStartTime),
              formatClock(conflict.existingEndTime),
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function WarningList({ warnings }: { warnings: BookingWarning[] }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line text-sm">
      {warnings.map((warning, index) => (
        <li key={`${warning.date}-${warning.startTime}-${warning.type}-${index}`} className="px-3 py-2">
          <p className="font-medium text-ink">
            {formatWeekdayDate(warning.date)} · {formatTimeRange(warning.startTime, warning.endTime)}
          </p>
          <p className="text-muted">{warningLabel(warning)}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the dialog for whatever issue the flow is holding.
 * `allowSkip` offers "Skip clashing visits and book the rest" (recurring schedules only).
 */
export function BookingIssueDialogs<T>({ flow, allowSkip = false }: { flow: BookingFlow<T>; allowSkip?: boolean }) {
  const { issue, pending } = flow;
  if (!issue) return null;

  if (issue.kind === "conflict") {
    return (
      <Modal
        open
        title={SCHEDULE_TEXT.booking.conflictTitle}
        description={allowSkip ? SCHEDULE_TEXT.booking.conflictBody : SCHEDULE_TEXT.booking.conflictSingleBody}
        size="lg"
        pending={pending}
        onClose={flow.dismiss}
        footer={
          <>
            <Button variant="secondary" onClick={flow.dismiss} disabled={pending}>
              {SCHEDULE_TEXT.booking.conflictClose}
            </Button>
            {allowSkip ? (
              <Button onClick={() => void flow.skipConflicts()} disabled={pending}>
                {pending ? "Working…" : SCHEDULE_TEXT.booking.conflictSkip}
              </Button>
            ) : null}
          </>
        }
      >
        <ConflictList conflicts={issue.conflicts} />
      </Modal>
    );
  }

  return (
    <Modal
      open
      title={SCHEDULE_TEXT.booking.warningTitle}
      description={SCHEDULE_TEXT.booking.warningBody}
      size="lg"
      pending={pending}
      onClose={flow.dismiss}
      footer={
        <>
          <Button variant="secondary" onClick={flow.dismiss} disabled={pending}>
            {SCHEDULE_TEXT.booking.warningCancel}
          </Button>
          <Button onClick={() => void flow.acknowledgeWarnings()} disabled={pending}>
            {pending ? "Working…" : SCHEDULE_TEXT.booking.warningConfirm}
          </Button>
        </>
      }
    >
      <WarningList warnings={issue.warnings} />
    </Modal>
  );
}

/** Inline summary used after a successful save to show what was skipped or acknowledged. */
export function BookingOutcome({ skipped, warnings }: { skipped: BookingConflict[]; warnings: BookingWarning[] }) {
  if (skipped.length === 0 && warnings.length === 0) return null;
  return (
    <div className="space-y-3">
      {skipped.length > 0 ? (
        <div className="space-y-2">
          <Alert tone="info">{SCHEDULE_TEXT.series.skippedTitle}</Alert>
          <ConflictList conflicts={skipped} />
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div className="space-y-2">
          <Alert tone="info">{SCHEDULE_TEXT.series.acknowledgedTitle}</Alert>
          <WarningList warnings={warnings} />
        </div>
      ) : null}
    </div>
  );
}
