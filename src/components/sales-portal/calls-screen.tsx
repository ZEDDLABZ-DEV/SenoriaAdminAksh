"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, Badge, Button, Field, PageHeader, SelectInput, StateBlock, TextInput } from "@/components/ui";
import { describeApiError, fieldErrors } from "@/lib/api/errors";
import { SALES_LIST_PAGE_SIZE, getCall, listCalls, listLeads, logCall } from "@/lib/api/resources";
import { isSalesRole } from "@/lib/api/session";
import type { CallDetail, CallDirection, CallListItem, CallResult, LeadListItem, LogCallInput } from "@/lib/api/types";
import { formatLocalDateTime, localDateTimeToIso } from "@/lib/format";
import { mondayOf, toYmd } from "@/lib/sales-portal";

const DIRECTIONS: CallDirection[] = ["Outbound", "Inbound"];
const RESULTS: CallResult[] = ["Connected", "No answer", "Voicemail", "Missed"];

function resultTone(result: string): "neutral" | "good" | "warn" | "bad" {
  if (result === "Connected") return "good";
  if (result === "Missed") return "bad";
  if (result === "No answer" || result === "Voicemail") return "warn";
  return "neutral";
}

function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function weekRange(from = new Date()): { from: string; to: string } {
  const start = mondayOf(from);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: toYmd(start), to: toYmd(end) };
}

function hhmm(value: string): string {
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value;
}

export function CallsScreen() {
  const { user } = useAuth();
  const admin = !isSalesRole(user?.role);
  const range = weekRange();
  const [calls, setCalls] = useState<CallListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [direction, setDirection] = useState<CallDirection>("Outbound");
  const [result, setResult] = useState<CallResult>("Connected");
  const [startDate, setStartDate] = useState(toYmd(new Date()));
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");
  const [leadId, setLeadId] = useState("");
  const [leadLabel, setLeadLabel] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");

  const load = useCallback(
    (nextPage: number, append: boolean) => {
      setLoading(true);
      setError("");
      listCalls({ from: range.from, to: range.to, page: nextPage, pageSize: SALES_LIST_PAGE_SIZE })
        .then((resultPage) => {
          setCalls((current) => (append ? [...current, ...resultPage.items] : resultPage.items));
          setHasNext(resultPage.meta.hasNextPage === true);
          setPage(nextPage);
        })
        .catch((caught: unknown) => {
          if (!append) setCalls([]);
          setError(describeApiError(caught));
        })
        .finally(() => setLoading(false));
    },
    [range.from, range.to],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      listLeads({ page: 1, pageSize: SALES_LIST_PAGE_SIZE, search: leadSearch.trim() || undefined })
        .then((resultPage) => setLeads(resultPage.items))
        .catch(() => setLeads([]));
    }, leadSearch.trim() ? 300 : 0);
    return () => window.clearTimeout(handle);
  }, [leadSearch]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError("");
      return;
    }
    let cancel = false;
    setDetailLoading(true);
    setDetailError("");
    getCall(selectedId)
      .then((call) => {
        if (!cancel) setDetail(call);
      })
      .catch((caught: unknown) => {
        if (cancel) return;
        setDetail(null);
        setDetailError(describeApiError(caught));
      })
      .finally(() => {
        if (!cancel) setDetailLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [selectedId]);

  async function onLog() {
    setFormError("");
    setFormFields({});
    setSaved("");
    const startedAt = localDateTimeToIso(startDate, hhmm(startTime));
    if (!phone.trim() || !startedAt) {
      setFormError("Phone, start date, and start time are required.");
      return;
    }
    const hasEndDate = Boolean(endDate);
    const hasEndTime = Boolean(endTime);
    if (hasEndDate !== hasEndTime) {
      setFormError("Enter both the end date and time, or leave both empty.");
      return;
    }
    const endedAt = hasEndDate ? localDateTimeToIso(endDate, hhmm(endTime)) : null;
    if (hasEndDate && !endedAt) {
      setFormError("The end time could not be read.");
      return;
    }
    if (endedAt && new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
      setFormError("The end must be after the start.");
      return;
    }
    let durationSeconds: number | undefined;
    if (duration.trim()) {
      const parsed = Number(duration);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setFormError("Duration must be a whole number of seconds.");
        return;
      }
      durationSeconds = parsed;
    }
    const input: LogCallInput = {
      phone: phone.trim(),
      direction,
      result,
      startedAt,
    };
    if (endedAt) input.endedAt = endedAt;
    if (durationSeconds != null) input.durationSeconds = durationSeconds;
    if (leadId) input.leadId = leadId;
    if (name.trim()) input.name = name.trim();

    setSaving(true);
    try {
      await logCall(input);
      setPhone("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setDuration("");
      setLeadId("");
      setLeadLabel("");
      setName("");
      setSaved("Call logged.");
      load(1, false);
    } catch (caught) {
      setFormFields(fieldErrors(caught));
      setFormError(describeApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const leadOptions = [
    ...(leadId && !leads.some((lead) => lead.id === leadId) ? [{ id: leadId, label: leadLabel || "Selected lead" }] : []),
    ...leads.map((lead) => ({ id: lead.id, label: `${personName(lead)} · ${lead.phone}` })),
  ];
  const connected = calls.filter((call) => call.result === "Connected").length;
  const missed = calls.filter((call) => call.result === "Missed" || call.result === "No answer").length;

  return (
    <div>
      <PageHeader
        eyebrow="Sales portal"
        title="Calls"
        description={`Calls from ${range.from} to ${range.to}. Log a finished call here. Nothing is dialed from this screen.`}
      />
      <section className="mb-4 rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
        <h2 className="font-display text-2xl">Log a call</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Phone" error={formFields.phone}>
            <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Direction" error={formFields.direction}>
            <SelectInput value={direction} onChange={(event) => setDirection(event.target.value as CallDirection)}>
              {DIRECTIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Result" error={formFields.result}>
            <SelectInput value={result} onChange={(event) => setResult(event.target.value as CallResult)}>
              {RESULTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Name" hint="Optional. A linked lead uses that person’s name." error={formFields.name}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Start date" error={formFields.startedAt}>
            <TextInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="Start time" error={formFields.startedAt}>
            <TextInput type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </Field>
          <Field label="End date" error={formFields.endedAt}>
            <TextInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
          <Field label="End time" error={formFields.endedAt}>
            <TextInput type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </Field>
          <Field label="Duration in seconds" hint="Optional when both times are set." error={formFields.durationSeconds}>
            <TextInput inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} />
          </Field>
          <Field label="Lead" error={formFields.leadId}>
            <TextInput
              placeholder="Search leads"
              value={leadSearch}
              onChange={(event) => setLeadSearch(event.target.value)}
            />
            <SelectInput
              className="mt-2"
              value={leadId}
              onChange={(event) => {
                const next = event.target.value;
                setLeadId(next);
                setLeadLabel(leadOptions.find((lead) => lead.id === next)?.label ?? "");
              }}
            >
              <option value="">No matching lead</option>
              {leadOptions.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button disabled={saving} onClick={() => void onLog()}>
            {saving ? "Saving…" : "Log call"}
          </Button>
          {saved ? <p className="text-sm text-muted">{saved}</p> : null}
        </div>
        {formError ? (
          <div className="mt-3">
            <Alert>{formError}</Alert>
          </div>
        ) : null}
      </section>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
          <p className="text-sm text-muted">Calls this week</p>
          <p className="font-display mt-2 text-5xl">{calls.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
          <p className="text-sm text-muted">Connected</p>
          <p className="font-display mt-2 text-5xl">{connected}</p>
        </article>
        <article className="rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
          <p className="text-sm text-muted">Missed or no answer</p>
          <p className="font-display mt-2 text-5xl">{missed}</p>
        </article>
      </div>
      {loading && calls.length === 0 ? <StateBlock title="Loading calls" /> : null}
      {error && calls.length === 0 ? (
        <StateBlock
          title="Calls could not be loaded"
          body={error}
          action={
            <Button variant="secondary" onClick={() => load(1, false)}>
              Try again
            </Button>
          }
        />
      ) : null}
      {!loading && !error && calls.length === 0 ? <StateBlock title="No calls this week." /> : null}
      {calls.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Person</th>
                {admin ? <th className="px-4 py-3 font-semibold">Sales executive</th> : null}
                <th className="px-4 py-3 font-semibold">Direction</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Result</th>
                <th className="px-4 py-3 font-semibold">Recording</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr
                  key={call.id}
                  className={`cursor-pointer border-t border-line ${call.id === selectedId ? "bg-moss/60" : "hover:bg-paper"}`}
                  onClick={() => setSelectedId(call.id)}
                >
                  <td className="px-4 py-3">{formatLocalDateTime(call.when)}</td>
                  <td className="px-4 py-3">
                    {call.leadId ? (
                      <Link href={`/today?lead=${call.leadId}`} className="font-semibold text-pine hover:underline">
                        {call.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{call.name}</span>
                    )}
                    <span className="mt-0.5 block text-xs text-muted">{call.phone}</span>
                  </td>
                  {admin ? <td className="px-4 py-3">{call.ownerName || "—"}</td> : null}
                  <td className="px-4 py-3">{call.direction}</td>
                  <td className="px-4 py-3">{call.durationLabel || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={resultTone(call.result)}>{call.result}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{call.recordingAvailable ? "Available" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {hasNext ? (
        <Button className="mt-4" variant="secondary" disabled={loading} onClick={() => load(page + 1, true)}>
          Load more
        </Button>
      ) : null}
      {error && calls.length > 0 ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {selectedId ? (
        <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
          <h2 className="font-display text-2xl">Call detail</h2>
          {detailLoading ? <p className="mt-3 text-sm text-muted">Loading this call.</p> : null}
          {detailError ? (
            <div className="mt-3">
              <Alert>{detailError}</Alert>
            </div>
          ) : null}
          {detail ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Started</dt>
                <dd className="mt-1 text-sm">{formatLocalDateTime(detail.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Ended</dt>
                <dd className="mt-1 text-sm">{formatLocalDateTime(detail.endedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Recording</dt>
                <dd className="mt-1 text-sm">
                  {detail.recordingUrl ? (
                    <a href={detail.recordingUrl} className="font-semibold text-pine hover:underline" target="_blank" rel="noreferrer">
                      Open recording
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
