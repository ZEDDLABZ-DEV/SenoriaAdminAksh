"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useIntegrations } from "@/components/sales-portal/integrations-provider";
import { Alert, Avatar, Badge, Button, PageHeader, StateBlock, TextArea, TextInput } from "@/components/ui";
import { stageTone } from "@/components/sales-portal/stage";
import { describeApiError } from "@/lib/api/errors";
import {
  SALES_LIST_PAGE_SIZE,
  addLeadNote,
  assignLead,
  getLead,
  getLeadQueueSummary,
  listLeads,
  listMeetings,
  listSalespeople,
  pushMeetingToOutlook,
  startLeadCall,
  updateLeadStage,
} from "@/lib/api/resources";
import { isSalesRole } from "@/lib/api/session";
import type {
  AddLeadNoteInput,
  LeadDetail,
  LeadListItem,
  LeadQueueSummary,
  LeadStage,
  NoteOutcome,
  PageMeta,
  SalesMeeting,
  SalespersonListItem,
} from "@/lib/api/types";
import { formatLocalDateTime, formatLocalTime, initials } from "@/lib/format";
import { callOutcome, outlookOutcome } from "@/lib/integrations";
import { LEAD_STAGES, QUEUE_FILTERS, toYmd, type QueueFilter } from "@/lib/sales-portal";

const OUTCOMES: NoteOutcome[] = ["Connected", "No answer", "Voicemail", "Booked"];
const EMPTY_SUMMARY: LeadQueueSummary = { new: 0, due: 0, overdue: 0, mine: 0 };

function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function hhmm(value: string): string {
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value;
}

export function TodayScreen() {
  const params = useSearchParams();
  const requested = params.get("lead") ?? "";
  const { user } = useAuth();
  const { status } = useIntegrations();
  const phoneOn = status.ringcentral.enabled;
  const outlookOn = status.outlook.enabled;
  const zohoOn = status.zoho.enabled;
  const admin = !isSalesRole(user?.role);
  const [filter, setFilter] = useState<QueueFilter>("due");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<LeadQueueSummary>(EMPTY_SUMMARY);
  const [summaryError, setSummaryError] = useState("");
  const [meetingsError, setMeetingsError] = useState("");
  const [queue, setQueue] = useState<LeadListItem[]>([]);
  const [queueMeta, setQueueMeta] = useState<PageMeta | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");
  const [selectedId, setSelectedId] = useState(requested);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [meetings, setMeetings] = useState<SalesMeeting[]>([]);
  const [people, setPeople] = useState<SalespersonListItem[]>([]);
  const [outcome, setOutcome] = useState<NoteOutcome>("Connected");
  const [note, setNote] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followTime, setFollowTime] = useState("10:00");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState("");
  const [calling, setCalling] = useState(false);
  const [callNote, setCallNote] = useState<{ ok: boolean; message: string } | null>(null);
  const [outlookPendingId, setOutlookPendingId] = useState("");
  const [outlookNote, setOutlookNote] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  const today = new Date();
  const todayKey = toYmd(today);
  const todayLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const loadSummary = useCallback(() => {
    getLeadQueueSummary()
      .then((next) => {
        setSummary(next);
        setSummaryError("");
      })
      .catch((caught: unknown) => {
        setSummary(EMPTY_SUMMARY);
        setSummaryError(describeApiError(caught));
      });
  }, []);

  const loadMeetings = useCallback(() => {
    listMeetings({ from: todayKey, to: todayKey })
      .then((next) => {
        setMeetings(next);
        setMeetingsError("");
      })
      .catch((caught: unknown) => {
        setMeetings([]);
        setMeetingsError(describeApiError(caught));
      });
  }, [todayKey]);

  const loadQueue = useCallback((nextFilter: QueueFilter, nextPage: number) => {
    setQueue([]);
    setQueueLoading(true);
    setQueueError("");
    listLeads({ queue: nextFilter, page: nextPage, pageSize: SALES_LIST_PAGE_SIZE })
      .then((result) => {
        setQueue(result.items);
        setQueueMeta(result.meta);
      })
      .catch((caught: unknown) => {
        setQueue([]);
        setQueueMeta(null);
        setQueueError(describeApiError(caught));
      })
      .finally(() => setQueueLoading(false));
  }, []);

  useEffect(() => {
    loadSummary();
    loadMeetings();
  }, [loadSummary, loadMeetings]);

  useEffect(() => {
    loadQueue(filter, page);
  }, [filter, page, loadQueue]);

  useEffect(() => {
    if (!admin) return;
    listSalespeople("all")
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [admin]);

  useEffect(() => {
    if (requested) setSelectedId(requested);
  }, [requested]);

  useEffect(() => {
    if (selectedId || queueLoading || queue.length === 0) return;
    setSelectedId(queue[0].id);
  }, [queue, selectedId, queueLoading]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError("");
      return;
    }
    let cancel = false;
    setDetailLoading(true);
    setDetailError("");
    setActionError("");
    setSaved("");
    setCallNote(null);
    setOutlookNote(null);
    getLead(selectedId)
      .then((lead) => {
        if (cancel) return;
        setDetail(lead);
        setNote("");
        setFollowDate("");
        setFollowTime("10:00");
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

  function replaceLead(updated: LeadDetail) {
    setDetail(updated);
    setQueue((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  }

  async function onStage(next: LeadStage) {
    if (!detail || next === detail.stage || pending) return;
    setPending(true);
    setActionError("");
    setSaved("");
    try {
      const updated = await updateLeadStage(detail.id, next);
      replaceLead(updated);
      loadSummary();
      loadQueue(filter, page);
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  }

  async function onAssign(ownerId: string) {
    if (!detail || !ownerId || ownerId === detail.ownerId || pending) return;
    setPending(true);
    setActionError("");
    setSaved("");
    try {
      const updated = await assignLead(detail.id, ownerId);
      replaceLead(updated);
      loadSummary();
      loadQueue(filter, page);
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  }

  async function onNote() {
    if (!detail || pending) return;
    const text = note.trim();
    if (!text) {
      setActionError("Write what happened.");
      return;
    }
    const input: AddLeadNoteInput = { outcome, text };
    if (followDate) {
      input.followUpDate = followDate;
      if (followTime) input.followUpTime = hhmm(followTime);
    }
    setPending(true);
    setActionError("");
    setSaved("");
    try {
      const updated = await addLeadNote(detail.id, input);
      replaceLead(updated);
      setNote("");
      setFollowDate("");
      setFollowTime("10:00");
      setSaved(zohoOn ? "Saved (CRM sync on)." : "Note saved.");
      loadSummary();
      loadQueue(filter, page);
      loadMeetings();
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  }

  async function onCall() {
    if (!detail || calling || !phoneOn) return;
    setCalling(true);
    setCallNote(null);
    try {
      const result = await startLeadCall(detail.id);
      setCallNote(callOutcome(result));
    } catch (caught) {
      setCallNote({ ok: false, message: describeApiError(caught) });
    } finally {
      setCalling(false);
    }
  }

  async function onOutlook(meetingId: string) {
    if (!outlookOn || outlookPendingId) return;
    setOutlookPendingId(meetingId);
    setOutlookNote(null);
    try {
      const result = await pushMeetingToOutlook(meetingId);
      setOutlookNote({ id: meetingId, ...outlookOutcome(result) });
    } catch (caught) {
      setOutlookNote({ id: meetingId, ok: false, message: describeApiError(caught) });
    } finally {
      setOutlookPendingId("");
    }
  }

  function chooseFilter(next: QueueFilter) {
    setFilter(next);
    setPage(1);
  }

  const knownOwner = people.some((person) => person.id === detail?.ownerId);

  return (
    <div>
      <PageHeader
        eyebrow="Sales portal"
        title="Today"
        description={
          admin
            ? `${todayLabel}. Every lead. A new one is given to the next active sales executive, and you can assign it to someone else.`
            : `${todayLabel}. Your leads, the note, and what is already on the calendar.`
        }
      />
      {summaryError || queueError ? (
        <div className="mb-4">
          <Alert>{summaryError || queueError}</Alert>
        </div>
      ) : null}
      <div className="grid items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <section className="rounded-2xl border border-line bg-card p-3 shadow-sm shadow-ink/5">
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="Queue">
            {QUEUE_FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseFilter(item.id)}
                  className={`rounded-lg px-2 py-1.5 text-left text-sm font-semibold ${active ? "bg-ink text-white" : "text-muted hover:bg-paper hover:text-ink"}`}
                >
                  {item.label}
                  <span className={`ml-1 ${active ? "text-white/70" : "text-muted"}`}>{summary[item.id]}</span>
                </button>
              );
            })}
          </div>
          <ul className="mt-3 space-y-1">
            {queueLoading && queue.length === 0 ? <li className="px-2 py-6 text-sm text-muted">Loading this queue.</li> : null}
            {!queueLoading && queue.length === 0 ? <li className="px-2 py-6 text-sm text-muted">No one in this queue.</li> : null}
            {queue.map((lead) => {
              const active = lead.id === selectedId;
              return (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(lead.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left ${active ? "bg-moss" : "hover:bg-paper"}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-ink">{personName(lead)}</span>
                      <span className="shrink-0 text-xs text-muted">{formatLocalDateTime(lead.nextStepAt ?? lead.createdAt)}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Badge tone={stageTone(lead.stage)}>{lead.stage}</Badge>
                      {lead.source}
                      {admin ? <span>{lead.ownerName || "Unassigned"}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {page > 1 || queueMeta?.hasNextPage ? (
            <div className="mt-3 flex gap-2">
              {page > 1 ? (
                <Button className="flex-1" variant="secondary" disabled={queueLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
              ) : null}
              {queueMeta?.hasNextPage ? (
                <Button className="flex-1" variant="secondary" disabled={queueLoading} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
          {detailLoading && !detail ? <StateBlock title="Loading lead" /> : null}
          {detailError && !detail ? <StateBlock title="This lead could not be opened" body={detailError} /> : null}
          {!detailLoading && !detail && !detailError ? <StateBlock title="Select a lead" body="Choose someone from the queue." /> : null}
          {detail ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={initials(detail.firstName, detail.lastName)} className="h-12 w-12 text-base" />
                  <div>
                    <h2 className="font-display text-3xl text-ink">{personName(detail)}</h2>
                    <p className="text-sm text-muted">
                      {detail.phone} · {detail.email || "No email"}
                    </p>
                    {phoneOn ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button variant="secondary" disabled={calling || !detail.phone} onClick={() => void onCall()}>
                          {calling ? "Starting…" : "Call"}
                        </Button>
                        {callNote ? (
                          <p className={`text-sm ${callNote.ok ? "text-muted" : "text-danger"}`}>{callNote.message}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-muted">Phone not connected.</p>
                    )}
                  </div>
                </div>
                <Badge tone={stageTone(detail.stage)}>{detail.source}</Badge>
              </div>
              <p className="mt-4 text-sm text-ink">{detail.about || "—"}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Owner</dt>
                  <dd className="mt-1 text-sm">
                    {admin ? (
                      <select
                        aria-label={`Assign ${personName(detail)}`}
                        className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
                        value={detail.ownerId ?? ""}
                        disabled={pending || people.length === 0}
                        onChange={(event) => void onAssign(event.target.value)}
                      >
                        <option value="" disabled>
                          Unassigned
                        </option>
                        {detail.ownerId && !knownOwner ? (
                          <option value={detail.ownerId}>{detail.ownerName || "Owner"}</option>
                        ) : null}
                        {people.map((person) => (
                          <option key={person.id} value={person.id}>
                            {personName(person)}
                            {person.status === "active" ? "" : " (inactive)"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      detail.ownerName || "Unassigned"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Last touch</dt>
                  <dd className="mt-1 text-sm">{formatLocalDateTime(detail.lastTouchAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Next step</dt>
                  <dd className="mt-1 text-sm">{detail.nextStep || "—"}</dd>
                </div>
              </dl>
              <label className="mt-4 block text-sm font-medium" htmlFor="lead-stage">
                Stage
              </label>
              <select
                id="lead-stage"
                className="mt-1.5 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 sm:w-auto"
                value={detail.stage}
                disabled={pending}
                onChange={(event) => void onStage(event.target.value as LeadStage)}
              >
                {LEAD_STAGES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <h3 className="mt-6 font-display text-2xl">Timeline</h3>
              {detail.timeline.length === 0 ? <p className="mt-3 text-sm text-muted">No events yet.</p> : null}
              <ol className="mt-3 space-y-3">
                {detail.timeline.map((item) => (
                  <li key={item.id} className="grid grid-cols-[140px_88px_minmax(0,1fr)] gap-2 text-sm">
                    <span className="text-muted">{formatLocalDateTime(item.occurredAt)}</span>
                    <span className="font-semibold text-pine">{item.kind}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ol>

              <h3 className="mt-6 font-display text-2xl">Note</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {OUTCOMES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={outcome === item}
                    onClick={() => setOutcome(item)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${outcome === item ? "bg-ink text-white" : "bg-paper text-muted"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <TextArea
                className="mt-3"
                value={note}
                placeholder="What happened on this call…"
                onChange={(event) => setNote(event.target.value)}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextInput aria-label="Follow-up date" type="date" value={followDate} onChange={(event) => setFollowDate(event.target.value)} />
                <TextInput aria-label="Follow-up time" type="time" value={followTime} onChange={(event) => setFollowTime(event.target.value)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button disabled={pending} onClick={() => void onNote()}>
                  {pending ? "Saving…" : "Save note and follow-up"}
                </Button>
                {saved ? <p className="text-sm text-muted">{saved}</p> : null}
              </div>
              {actionError ? (
                <div className="mt-3">
                  <Alert>{actionError}</Alert>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl">Today</h2>
              <Link href="/calendar" className="text-sm font-semibold text-pine hover:underline">
                Calendar
              </Link>
            </div>
            {meetingsError ? <p className="mt-3 text-sm text-danger">{meetingsError}</p> : null}
            {!meetingsError && meetings.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing on today’s calendar.</p> : null}
            <ul className="mt-3 space-y-2">
              {meetings.map((meeting) => (
                <li key={meeting.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-paper px-3 py-2 text-left"
                    onClick={() => meeting.leadId && setSelectedId(meeting.leadId)}
                  >
                    <span className="text-xs font-semibold text-muted">
                      {formatLocalTime(meeting.startAt)}–{formatLocalTime(meeting.endAt)} · {meeting.kind}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold">{meeting.title}</span>
                    <span className="block text-sm text-muted">{meeting.person}</span>
                  </button>
                  {outlookOn ? (
                    <div className="px-3 pt-1 pb-1">
                      <button
                        type="button"
                        className="text-xs font-semibold text-pine hover:underline disabled:opacity-50"
                        disabled={outlookPendingId === meeting.id}
                        onClick={() => void onOutlook(meeting.id)}
                      >
                        {outlookPendingId === meeting.id ? "Adding…" : "Add to Outlook"}
                      </button>
                      {outlookNote?.id === meeting.id ? (
                        <p className={`mt-1 text-xs ${outlookNote.ok ? "text-muted" : "text-danger"}`}>{outlookNote.message}</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
            <h2 className="font-display text-2xl">Next step</h2>
            <p className="mt-2 text-sm">{detail?.nextStep || "—"}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
