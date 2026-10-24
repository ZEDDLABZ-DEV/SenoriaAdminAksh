"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Field,
  PageHeader,
  SelectInput,
  StateBlock,
  TextArea,
  TextInput,
} from "@/components/ui";
import type { DownloadedFile } from "@/lib/api/client";
import { fieldErrors } from "@/lib/api/errors";
import { correctVisitHours, listAllCaregivers, listAllClients, listVisitReport, listVisitReportDocument } from "@/lib/api/resources";
import type {
  CaregiverRecord,
  ClientRecord,
  VisitReport,
  VisitReportCount,
  VisitReportPeriod,
  VisitReportRow,
  VisitReportStatusFilter,
} from "@/lib/api/types";
import { formatClock, fullName, humanizeCode } from "@/lib/format";
import {
  PERIOD_OPTIONS,
  STATUS_OPTIONS,
  VISIT_REPORT_TIME_ZONE,
  arrivalLabel,
  formatCompletionRate,
  formatHours,
  formatReportTimestamp,
  formatReportWindow,
  formatVisitLocation,
  itemTypeLabel,
  periodDateHint,
  personLabel,
  reportFilterMessage,
  reportRequestError,
  reportToday,
  sameVisitRow,
  validateAdjustedHours,
  validateCorrectionReason,
  visitDayStatusLabel,
  visitDayStatusTone,
  visitRowKey,
  type VisitReportRequest,
} from "@/lib/visit-report";

function saveDownloadedFile(file: DownloadedFile) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function byPerson(left: { firstName: string; lastName: string }, right: { firstName: string; lastName: string }): number {
  return fullName(left.firstName, left.lastName).localeCompare(fullName(right.firstName, right.lastName));
}

function filterPersonName(
  id: string,
  people: Array<{ id: string; firstName: string; lastName: string }>,
  fallback: string | null,
): string {
  if (!id) return "All";
  const person = people.find((item) => item.id === id);
  if (person) return fullName(person.firstName, person.lastName, fallback || "All");
  return fallback || "All";
}

function CountLines({ counts }: { counts: VisitReportRow["counts"] }) {
  const lines: Array<{ label: string; count: VisitReportCount }> = [
    { label: "Tasks", count: counts.tasks },
    { label: "Medications", count: counts.medications },
    { label: "Diet", count: counts.diet },
    { label: "Hygiene", count: counts.hygiene },
  ];
  return (
    <div>
      {lines.map((line) => (
        <span key={line.label} className="block text-sm">
          {line.label} {line.count.completed}/{line.count.total}
        </span>
      ))}
    </div>
  );
}

function PersonName({
  person,
  href,
}: {
  person: VisitReportRow["caregiver"];
  href: string;
}) {
  const label = personLabel(person, "Unknown");
  if (!person.id) return <span className="font-medium">{label}</span>;
  return (
    <Link href={href} className="font-medium text-pine hover:underline">
      {label}
    </Link>
  );
}

function scheduledWindow(row: VisitReportRow): string {
  if (!row.scheduledStartTime && !row.scheduledEndTime) return "—";
  return `${formatClock(row.scheduledStartTime)} – ${formatClock(row.scheduledEndTime)}`;
}

function hoursFieldValue(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(2);
}

function HourCorrectionForm({
  dailyVisitId,
  initialHours,
  locked,
  onCorrected,
  onCancel,
}: {
  dailyVisitId: string;
  initialHours: number | null;
  locked: boolean;
  onCorrected: (row: VisitReportRow, message: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [hours, setHours] = useState(() => hoursFieldValue(initialHours));
  const [reason, setReason] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const hoursResult = validateAdjustedHours(hours);
    const reasonResult = validateCorrectionReason(reason);
    const nextFields: Record<string, string> = {};
    if ("error" in hoursResult) nextFields.adjustedHours = hoursResult.error;
    if ("error" in reasonResult) nextFields.reason = reasonResult.error;
    setFields(nextFields);
    setError("");
    if (Object.keys(nextFields).length > 0) return;

    if (!("hours" in hoursResult) || !("reason" in reasonResult)) return;
    setPending(true);
    try {
      const result = await correctVisitHours(dailyVisitId, hoursResult.hours, reasonResult.reason);
      await onCorrected({ ...result.row, hoursUsed: hoursResult.hours }, result.message);
    } catch (caught: unknown) {
      const apiFields = fieldErrors(caught);
      const message = reportRequestError(caught);
      const fieldText = Object.values(apiFields).join(" ");
      setFields(apiFields);
      setError(fieldText && message === fieldText ? "" : message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 rounded-xl border border-line bg-card p-4">
      <div>
        <h4 className="font-medium">Update hours used</h4>
        <p className="mt-1 text-sm text-muted">Check-in and completion time stay as the caregiver recorded them.</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Field label="Hours used" error={fields.adjustedHours} hint="0 to 24, up to 2 decimal places">
          <TextInput
            inputMode="decimal"
            value={hours}
            placeholder="6.50"
            onChange={(event) => setHours(event.target.value)}
            disabled={pending || locked}
          />
        </Field>
        <Field label="Reason" error={fields.reason} hint={`${reason.trim().length}/500`}>
          <TextArea
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            disabled={pending || locked}
            className="min-h-20"
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || locked}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function VisitDayCard({
  row,
  timeZone,
  locked,
  onCorrected,
}: {
  row: VisitReportRow;
  timeZone: string;
  locked: boolean;
  onCorrected: (row: VisitReportRow, message: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const location = formatVisitLocation(row);
  const canCorrect = row.canAdjustHours && Boolean(row.dailyVisitId);

  function openCorrection() {
    if (!canCorrect || locked) return;
    if (correcting) {
      formRef.current?.querySelector("input")?.focus();
      return;
    }
    setCorrecting(true);
  }

  useEffect(() => {
    if (!correcting) return;
    formRef.current?.querySelector("input")?.focus();
  }, [correcting]);

  async function handleRowCorrected(updated: VisitReportRow, message: string) {
    setCorrecting(false);
    await onCorrected(updated, message);
  }

  return (
    <article className="rounded-2xl border border-line bg-card shadow-sm shadow-ink/5">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-base">
            <PersonName person={row.caregiver} href={`/caregivers/${row.caregiver.id}`} />
            <span className="text-muted"> · </span>
            <PersonName person={row.client} href={`/clients/${row.client.id}`} />
          </p>
          <p className="mt-1 text-sm text-muted">{formatReportWindow(row.serviceDate, row.serviceDate)}</p>
        </div>
        <Badge tone={visitDayStatusTone(row.status)}>{visitDayStatusLabel(row.status)}</Badge>
      </div>
      <dl className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Scheduled</dt>
          <dd className="mt-1 text-sm">
            {scheduledWindow(row)}
            {row.scheduledHours != null ? (
              <span className="block text-xs text-muted">{formatHours(row.scheduledHours)} scheduled hours</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Check-in</dt>
          <dd className="mt-1 text-sm">{formatReportTimestamp(row.checkInAt, timeZone)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Completed</dt>
          <dd className="mt-1 text-sm">{formatReportTimestamp(row.completedAt, timeZone)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Arrival</dt>
          <dd className="mt-1 text-sm">{arrivalLabel(row.arrival)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Hours used</dt>
          <dd className="mt-1 text-sm">
            {canCorrect ? (
              <button
                type="button"
                className="font-semibold text-pine underline decoration-pine/40 underline-offset-2 hover:decoration-pine disabled:opacity-50"
                aria-label={`Correct hours used, currently ${formatHours(row.hoursUsed)}`}
                disabled={locked}
                onClick={openCorrection}
              >
                {formatHours(row.hoursUsed)}
              </button>
            ) : (
              formatHours(row.hoursUsed)
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Checklist</dt>
          <dd className="mt-1">
            <CountLines counts={row.counts} />
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        <Button variant="secondary" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {open ? "Hide details" : "Show details"}
        </Button>
      </div>
      {correcting && row.dailyVisitId ? (
        <div ref={formRef} className="border-t border-line bg-paper px-4 py-4">
          <HourCorrectionForm
            key={`${row.dailyVisitId}-${row.hoursUsed ?? "none"}`}
            dailyVisitId={row.dailyVisitId}
            initialHours={row.hoursUsed}
            locked={locked}
            onCorrected={handleRowCorrected}
            onCancel={() => setCorrecting(false)}
          />
        </div>
      ) : null}
      {open ? (
        <div className="space-y-4 border-t border-line bg-paper px-4 py-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Appointment type</dt>
              <dd className="mt-1 text-sm">{humanizeCode(row.appointmentType)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Care plan</dt>
              <dd className="mt-1 text-sm">{row.carePlan?.name || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Description</dt>
              <dd className="mt-1 text-sm whitespace-pre-wrap">{row.description || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">Location</dt>
              <dd className="mt-1 text-sm">{location || "—"}</dd>
            </div>
          </dl>

          <div>
            <h3 className="font-medium">Checklist</h3>
            {row.items.length === 0 ? <p className="mt-2 text-sm text-muted">No checklist items.</p> : null}
            {row.items.length > 0 ? (
              <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-card">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Item</th>
                      <th className="px-3 py-2 font-semibold">Detail</th>
                      <th className="px-3 py-2 font-semibold">Care plan</th>
                      <th className="px-3 py-2 font-semibold">Checked</th>
                      <th className="px-3 py-2 font-semibold">Completed at</th>
                      <th className="px-3 py-2 font-semibold">Caregiver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.items.map((item, itemIndex) => (
                      <tr key={`${item.itemType}-${item.itemId}-${itemIndex}`} className="border-t border-line">
                        <td className="px-3 py-2">{itemTypeLabel(item.itemType)}</td>
                        <td className="px-3 py-2">{item.name || "—"}</td>
                        <td className="px-3 py-2">{item.detail || "—"}</td>
                        <td className="px-3 py-2">{item.carePlanName || "—"}</td>
                        <td className="px-3 py-2">{item.completed ? "Yes" : "No"}</td>
                        <td className="px-3 py-2">{formatReportTimestamp(item.completedAt, timeZone)}</td>
                        <td className="px-3 py-2">{personLabel(item.caregiver)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="font-medium">Hour corrections</h3>
            <p className="mt-1 text-sm text-muted">Newest first. Older corrections stay in this list.</p>
            {row.adjustments.length === 0 ? <p className="mt-2 text-sm text-muted">No hour corrections yet.</p> : null}
            {row.adjustments.length > 0 ? (
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                {row.adjustments.map((adjustment) => (
                  <li key={adjustment.id || `${adjustment.createdAt}-${adjustment.adjustedHours}`} className="px-3 py-3 text-sm">
                    <p className="font-medium">{formatHours(adjustment.adjustedHours)} hours</p>
                    <p className="mt-1 whitespace-pre-wrap">{adjustment.reason || "—"}</p>
                    <p className="mt-1 text-muted">
                      {formatReportTimestamp(adjustment.createdAt, timeZone)} · {personLabel(adjustment.admin, "Admin")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function VisitReportScreen() {
  const today = useRef(reportToday()).current;
  const generation = useRef(0);
  const [period, setPeriod] = useState<VisitReportPeriod>("daily");
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [caregiverId, setCaregiverId] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<VisitReportStatusFilter>("completed");
  const [page, setPage] = useState(1);
  const [caregivers, setCaregivers] = useState<CaregiverRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [directoryError, setDirectoryError] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [report, setReport] = useState<VisitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [notice, setNotice] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const filterMessage = reportFilterMessage({ period, date, from, to });

  useEffect(() => {
    let cancelled = false;
    setDirectoryLoading(true);
    Promise.all([listAllCaregivers(), listAllClients()])
      .then(([caregiverRows, clientRows]) => {
        if (cancelled) return;
        setCaregivers(caregiverRows.filter((row) => row.id).sort(byPerson));
        setClients(clientRows.filter((row) => row.id).sort(byPerson));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setDirectoryError(reportRequestError(caught));
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const current = ++generation.current;
    if (filterMessage) {
      setLoading(false);
      setReport(null);
      setError("");
      return;
    }
    const request: VisitReportRequest = {
      period,
      date,
      from,
      to,
      caregiverId,
      clientId,
      status,
      page,
    };
    let cancelled = false;
    setLoading(true);
    setError("");
    setSummaryError("");
    setNotice("");
    listVisitReport(request)
      .then((result) => {
        if (cancelled || generation.current !== current) return;
        setReport(result);
      })
      .catch((caught: unknown) => {
        if (cancelled || generation.current !== current) return;
        setReport(null);
        setError(reportRequestError(caught));
      })
      .finally(() => {
        if (!cancelled && generation.current === current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, date, from, to, caregiverId, clientId, status, page, filterMessage, reloadKey]);

  async function handleCorrected(row: VisitReportRow, message: string) {
    const generationAtCall = generation.current;
    const request: VisitReportRequest = {
      period,
      date,
      from,
      to,
      caregiverId,
      clientId,
      status,
      page,
    };
    setNotice(message);
    setSummaryError("");
    setRefreshingSummary(true);
    setReport((current) => {
      if (!current) return current;
      return {
        ...current,
        rows: current.rows.map((item) => (sameVisitRow(item, row) ? row : item)),
      };
    });
    try {
      const next = await listVisitReport(request);
      if (generation.current !== generationAtCall) return;
      setReport({
        ...next,
        rows: next.rows.map((item) => (sameVisitRow(item, row) ? { ...item, hoursUsed: row.hoursUsed } : item)),
      });
    } catch (caught: unknown) {
      if (generation.current !== generationAtCall) return;
      setSummaryError(reportRequestError(caught));
    } finally {
      setRefreshingSummary(false);
    }
  }

  async function downloadPdf() {
    if (filterMessage) {
      setPdfError(filterMessage);
      return;
    }
    setPdfError("");
    setDownloading(true);
    try {
      const document = await listVisitReportDocument({
        period,
        date,
        from,
        to,
        caregiverId,
        clientId,
        status,
        page,
      });
      const { buildVisitReportPdf } = await import("@/lib/visit-report-pdf");
      saveDownloadedFile(
        buildVisitReportPdf({
          report: document,
          caregiverName: filterPersonName(caregiverId, caregivers, document.filters.caregiverName),
          clientName: filterPersonName(clientId, clients, document.filters.clientName),
        }),
      );
    } catch (caught: unknown) {
      setPdfError(reportRequestError(caught));
    } finally {
      setDownloading(false);
    }
  }

  const zone = report?.timeZone || VISIT_REPORT_TIME_ZONE;
  const meta = report?.meta;
  const hasPrevious = page > 1 && meta?.hasPreviousPage !== false;
  const hasNext =
    meta?.hasNextPage === true || (meta?.hasNextPage == null && meta?.totalPages != null && page < meta.totalPages);
  const showPager = Boolean(report && (hasPrevious || hasNext));
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Matching";
  const dateHint = periodDateHint(period);
  const summaryCards = report
    ? [
        { label: "Scheduled days", value: report.summary.scheduledDays.toLocaleString() },
        { label: "Completed days", value: report.summary.completedDays.toLocaleString() },
        { label: "Pending", value: report.summary.pendingDays.toLocaleString() },
        { label: "Missed", value: report.summary.missedDays.toLocaleString() },
        { label: "Cancelled", value: report.summary.cancelledDays.toLocaleString() },
        { label: "Total hours", value: formatHours(report.summary.totalHours) },
        { label: "Average hours", value: formatHours(report.summary.averageHours) },
        { label: "Completion rate", value: formatCompletionRate(report.summary.completionRate) },
      ]
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Visits"
        title="Reports"
        description="Caregiver visit days for the selected window. Download uses the current filters and includes every matching day, not only this page."
        action={
          <Button variant="secondary" onClick={() => void downloadPdf()} disabled={downloading || Boolean(filterMessage)}>
            {downloading ? "Preparing PDF…" : "Download PDF"}
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Period">
          <SelectInput
            value={period}
            onChange={(event) => {
              const next = event.target.value as VisitReportPeriod;
              if (next === "custom") {
                setFrom(date);
                setTo(date);
              }
              setPeriod(next);
              setPage(1);
            }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {period === "custom" ? (
          <>
            <Field label="From">
              <TextInput
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </Field>
            <Field label="To" hint="Inclusive, at most 366 days.">
              <TextInput
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </Field>
          </>
        ) : (
          <Field label="Date" hint={dateHint || undefined}>
            <TextInput
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          </Field>
        )}
        <Field label="Caregiver">
          <SelectInput
            value={caregiverId}
            disabled={directoryLoading}
            onChange={(event) => {
              setCaregiverId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All caregivers</option>
            {caregivers.map((caregiver) => (
              <option key={caregiver.id} value={caregiver.id}>
                {fullName(caregiver.firstName, caregiver.lastName, "Unnamed caregiver")}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Client">
          <SelectInput
            value={clientId}
            disabled={directoryLoading}
            onChange={(event) => {
              setClientId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {fullName(client.firstName, client.lastName, "Unnamed client")}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Status">
          <SelectInput
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as VisitReportStatusFilter);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      {directoryError ? <div className="mb-4"><Alert>{directoryError}</Alert></div> : null}
      {filterMessage ? <div className="mb-4"><Alert>{filterMessage}</Alert></div> : null}
      {pdfError ? <div className="mb-4"><Alert>{pdfError}</Alert></div> : null}
      {notice ? (
        <div className="mb-4" role="status">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}
      {summaryError ? <div className="mb-4"><Alert>{summaryError}</Alert></div> : null}
      {error ? (
        <div className="mb-4">
          <Alert>
            {error}{" "}
            <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          </Alert>
        </div>
      ) : null}

      {loading ? <StateBlock title="Loading visit report" /> : null}

      {!loading && report ? (
        <div className="mb-6">
          <p className="mb-3 text-sm text-muted">
            {formatReportWindow(report.from, report.to)} · Times shown in {zone}
            {report.generatedAt ? ` · Generated ${formatReportTimestamp(report.generatedAt, zone)}` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article key={card.label} className="rounded-2xl border border-line bg-card p-4 shadow-sm shadow-ink/5">
                <p className="text-sm text-muted">{card.label}</p>
                <p className="font-display mt-1 text-3xl">{card.value}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            Summary covers the whole date window and the caregiver and client filters. It does not follow the status filter or this page.
          </p>
        </div>
      ) : null}

      {!loading && report && report.rows.length === 0 ? (
        <StateBlock
          title={status === "all" ? "No visits in this window" : `No ${statusLabel.toLowerCase()} visits in this window`}
          body="Try another date, caregiver, client, or status."
        />
      ) : null}

      {!loading && report && report.rows.length > 0 ? (
        <div className="space-y-4">
          {report.rows.map((row, index) => (
            <VisitDayCard
              key={visitRowKey(row, index)}
              row={row}
              timeZone={zone}
              locked={loading || refreshingSummary}
              onCorrected={handleCorrected}
            />
          ))}
        </div>
      ) : null}

      {!loading && showPager ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Page {meta?.page || page}
            {meta?.totalPages != null ? ` of ${meta.totalPages}` : ""}
            {meta?.total != null ? ` · ${meta.total} days` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!hasPrevious || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Previous
            </Button>
            <Button variant="secondary" disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
