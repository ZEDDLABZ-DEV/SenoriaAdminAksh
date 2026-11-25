"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MonthYearButtons } from "@/components/date-calendar";
import { useIntegrations } from "@/components/sales-portal/integrations-provider";
import { Alert, Button, ConfirmDialog, Field, PageHeader, SegmentedControl, SelectInput, StateBlock, TextInput } from "@/components/ui";
import { ApiError, describeApiError, fieldErrors } from "@/lib/api/errors";
import { SALES_LIST_PAGE_SIZE, createMeeting, deleteMeeting, listLeads, listMeetings, pushMeetingToOutlook, updateMeeting } from "@/lib/api/resources";
import type { LeadListItem, MeetingKind, SalesMeeting, UpdateMeetingInput } from "@/lib/api/types";
import { formatLocalTime, localDateTimeToIso } from "@/lib/format";
import { outlookOutcome } from "@/lib/integrations";
import { dayOfMonth, monthDays, monthLabel, weekdayOf } from "@/lib/schedule";
import { sameDay, toYmd, weekDays } from "@/lib/sales-portal";

const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_HEIGHT = 64;
const MIN_EVENT_HEIGHT = 88;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
const MONTH_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarView = "month" | "week" | "day";

type Draft = {
  id: string;
  leadId: string;
  leadLabel: string;
  title: string;
  kind: MeetingKind;
  date: string;
  start: string;
  endDate: string;
  end: string;
};

function formatHour(hour: number): string {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const value = normalized % 12 || 12;
  return `${value} ${suffix}`;
}

function parseLocal(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function hhmm(value: string): string {
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value;
}

function timePart(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function meetingsOn(day: Date, meetings: SalesMeeting[]): SalesMeeting[] {
  return meetings.filter((meeting) => sameDay(new Date(meeting.startAt), day));
}

function eventPlacement(meeting: SalesMeeting): { top: number; height: number } {
  const start = new Date(meeting.startAt);
  const end = new Date(meeting.endAt);
  const startMin = start.getHours() * 60 + start.getMinutes();
  let endMin = end.getHours() * 60 + end.getMinutes();
  if (end.getTime() > start.getTime() && toYmd(end) !== toYmd(start)) endMin += 24 * 60;
  const gridStart = START_HOUR * 60;
  const gridEnd = END_HOUR * 60;
  const topMin = Math.min(Math.max(startMin, gridStart), gridEnd);
  const bottomMin = Math.min(Math.max(endMin, topMin), gridEnd);
  const top = ((topMin - gridStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(((bottomMin - topMin) / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
  return { top, height };
}

function blankDraft(date: string): Draft {
  return { id: "", leadId: "", leadLabel: "", title: "", kind: "Call", date, start: "09:00", endDate: date, end: "09:30" };
}

function draftFromMeeting(meeting: SalesMeeting): Draft {
  const start = new Date(meeting.startAt);
  const end = new Date(meeting.endAt);
  return {
    id: meeting.id,
    leadId: meeting.leadId ?? "",
    leadLabel: meeting.person,
    title: meeting.title,
    kind: meeting.kind,
    date: toYmd(start),
    start: timePart(meeting.startAt),
    endDate: toYmd(end),
    end: timePart(meeting.endAt),
  };
}

function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function EventCard({ meeting, onEdit }: { meeting: SalesMeeting; onEdit: (meeting: SalesMeeting) => void }) {
  const { top, height } = eventPlacement(meeting);
  const tone = meeting.kind === "Visit" ? "border-pine bg-moss text-pine-dark" : "border-visit-scheduled bg-white text-ink";
  const className = `absolute right-1 left-1 rounded-lg border-l-4 px-2 py-1.5 text-left text-xs leading-4 ${tone}`;
  return (
    <div className={className} style={{ top, minHeight: height, height: "auto" }}>
      <span className="block text-[11px] font-semibold tracking-wide uppercase">{meeting.kind}</span>
      {meeting.leadId ? (
        <Link href={`/today?lead=${meeting.leadId}`} className="block font-semibold hover:underline">
          {meeting.title}
        </Link>
      ) : (
        <span className="block font-semibold">{meeting.title}</span>
      )}
      <span className="block text-xs opacity-80">
        {formatLocalTime(meeting.startAt)} · {meeting.person}
      </span>
      <button type="button" className="font-semibold underline" onClick={() => onEdit(meeting)}>
        Edit
      </button>
    </div>
  );
}

function MonthGrid({
  month,
  today,
  meetings,
  onOpenDay,
  onEdit,
}: {
  month: string;
  today: Date;
  meetings: SalesMeeting[];
  onOpenDay: (date: string) => void;
  onEdit: (meeting: SalesMeeting) => void;
}) {
  const days = monthDays(month);
  const first = days[0] ?? `${month}-01`;
  const leading = (weekdayOf(first) + 6) % 7;
  const cells: Array<string | null> = [...Array.from({ length: leading }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const todayKey = toYmd(today);

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-line bg-paper">
          {MONTH_LABELS.map((label) => (
            <div key={label} className="px-2 py-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="min-h-28 border-t border-l border-line bg-paper/50" />;
            }
            const current = date === todayKey;
            const events = meetingsOn(parseLocal(date), meetings);
            return (
              <div key={date} className={`min-h-28 border-t border-l border-line p-1.5 ${current ? "bg-moss/70" : "bg-card"}`}>
                <button
                  type="button"
                  onClick={() => onOpenDay(date)}
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold ${current ? "bg-pine text-white" : "text-ink hover:bg-paper"}`}
                >
                  {dayOfMonth(date)}
                </button>
                <ul className="mt-1 space-y-1">
                  {events.map((meeting) => {
                    const tone = meeting.kind === "Visit" ? "border-pine bg-moss text-pine-dark" : "border-visit-scheduled bg-white text-ink";
                    const className = `block truncate rounded-md border-l-4 px-1.5 py-1 text-xs ${tone}`;
                    return (
                      <li key={meeting.id} className={className}>
                        {meeting.leadId ? (
                          <Link href={`/today?lead=${meeting.leadId}`} className="font-semibold hover:underline">
                            {formatLocalTime(meeting.startAt)} {meeting.title}
                          </Link>
                        ) : (
                          <span className="font-semibold">
                            {formatLocalTime(meeting.startAt)} {meeting.title}
                          </span>
                        )}
                        <button type="button" className="ml-1 font-semibold underline" onClick={() => onEdit(meeting)}>
                          Edit
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CalendarScreen() {
  const { status } = useIntegrations();
  const outlookOn = status.outlook.enabled;
  const today = new Date();
  const todayKey = toYmd(today);
  const [view, setView] = useState<CalendarView>("month");
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [focus, setFocus] = useState(todayKey);
  const [meetings, setMeetings] = useState<SalesMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timeScrollRef = useRef<HTMLDivElement>(null);
  const [outlookPending, setOutlookPending] = useState(false);
  const [outlookNote, setOutlookNote] = useState<{ ok: boolean; message: string } | null>(null);

  const focusDate = parseLocal(focus);
  const visibleDays = view === "day" ? [focusDate] : weekDays(focusDate);
  const monthDates = monthDays(month);
  const range =
    view === "day"
      ? { from: focus, to: focus }
      : view === "week"
        ? { from: toYmd(visibleDays[0] ?? focusDate), to: toYmd(visibleDays[visibleDays.length - 1] ?? focusDate) }
        : { from: monthDates[0] ?? `${month}-01`, to: monthDates[monthDates.length - 1] ?? `${month}-28` };

  const rangeFrom = range.from;
  const rangeTo = range.to;
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    listMeetings({ from: rangeFrom, to: rangeTo })
      .then(setMeetings)
      .catch((caught: unknown) => {
        setMeetings([]);
        setError(describeApiError(caught));
      })
      .finally(() => setLoading(false));
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    load();
  }, [load]);

  useLayoutEffect(() => {
    if (view === "month" || loading) return;
    const node = timeScrollRef.current;
    if (!node) return;
    node.scrollTop = 8 * HOUR_HEIGHT;
  }, [view, focus, loading]);

  const formOpen = draft != null;
  useEffect(() => {
    if (!formOpen) return;
    const handle = window.setTimeout(() => {
      listLeads({ page: 1, pageSize: SALES_LIST_PAGE_SIZE, search: leadSearch.trim() || undefined })
        .then((result) => setLeads(result.items))
        .catch(() => setLeads([]));
    }, leadSearch.trim() ? 300 : 0);
    return () => window.clearTimeout(handle);
  }, [formOpen, leadSearch]);

  function changeMonth(next: string) {
    setMonth(next);
    const nextFocus = next === todayKey.slice(0, 7) ? todayKey : `${next}-01`;
    setFocus(nextFocus);
  }

  function openDay(date: string) {
    setFocus(date);
    setMonth(date.slice(0, 7));
    setView("day");
  }

  function openCreate() {
    setFormError("");
    setFormFields({});
    setOutlookNote(null);
    setLeadSearch("");
    setDraft(blankDraft(focus));
  }

  function openEdit(meeting: SalesMeeting) {
    setFormError("");
    setFormFields({});
    setOutlookNote(null);
    setLeadSearch("");
    setDraft(draftFromMeeting(meeting));
  }

  async function onSave() {
    if (!draft) return;
    const startAt = localDateTimeToIso(draft.date, hhmm(draft.start));
    const endAt = localDateTimeToIso(draft.endDate, hhmm(draft.end));
    if (!draft.leadId || !draft.title.trim() || !startAt || !endAt) {
      setFormError("Lead, title, date, start, and end are required.");
      return;
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setFormError("The end must be after the start.");
      return;
    }
    setSaving(true);
    setFormError("");
    setFormFields({});
    try {
      if (!draft.id) {
        await createMeeting({
          leadId: draft.leadId,
          title: draft.title.trim(),
          kind: draft.kind,
          startAt,
          endAt,
        });
      } else {
        const current = meetings.find((meeting) => meeting.id === draft.id);
        const patch: UpdateMeetingInput = {};
        if (!current || draft.title.trim() !== current.title) patch.title = draft.title.trim();
        if (!current || draft.kind !== current.kind) patch.kind = draft.kind;
        if (!current || draft.leadId !== (current.leadId ?? "")) patch.leadId = draft.leadId;
        if (!current || new Date(startAt).getTime() !== new Date(current.startAt).getTime()) patch.startAt = startAt;
        if (!current || new Date(endAt).getTime() !== new Date(current.endAt).getTime()) patch.endAt = endAt;
        if (Object.keys(patch).length > 0) await updateMeeting(draft.id, patch);
      }
      setDraft(null);
      load();
    } catch (caught) {
      setFormFields(fieldErrors(caught));
      setFormError(describeApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function onOutlook() {
    if (!draft?.id || !outlookOn || outlookPending) return;
    setOutlookPending(true);
    setOutlookNote(null);
    try {
      const result = await pushMeetingToOutlook(draft.id);
      setOutlookNote(outlookOutcome(result));
    } catch (caught) {
      setOutlookNote({ ok: false, message: describeApiError(caught) });
    } finally {
      setOutlookPending(false);
    }
  }

  async function onDelete() {
    if (!draft?.id) return;
    setSaving(true);
    setFormError("");
    try {
      await deleteMeeting(draft.id);
      setConfirmDelete(false);
      setDraft(null);
      load();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setConfirmDelete(false);
        setDraft(null);
        load();
        return;
      }
      setConfirmDelete(false);
      setFormError(describeApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  const shownMeetings = meetings.filter((meeting) => visibleDays.some((day) => sameDay(new Date(meeting.startAt), day)));
  const monthCount = meetings.filter((meeting) => toYmd(new Date(meeting.startAt)).startsWith(month)).length;
  const leadOptions = [
    ...(draft?.leadId && !leads.some((lead) => lead.id === draft.leadId) ? [{ id: draft.leadId, label: draft.leadLabel }] : []),
    ...leads.map((lead) => ({ id: lead.id, label: `${personName(lead)}${lead.phone ? ` · ${lead.phone}` : ""}` })),
  ];

  return (
    <div className="flex min-h-0 flex-col lg:h-[calc(100dvh-7.5rem)]">
      <div className="shrink-0">
      <PageHeader
          eyebrow="Sales portal"
          title="Calendar"
          description="Calls and home visits. Click the month to choose a different one."
          action={<Button onClick={openCreate}>New meeting</Button>}
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl text-ink">
            <MonthYearButtons month={month} onChange={changeMonth} />
          </h2>
          <SegmentedControl<CalendarView>
            label="Calendar view"
            value={view}
            options={[
              { id: "month", label: "Month" },
              { id: "week", label: "Week" },
              { id: "day", label: "Day" },
            ]}
            onChange={setView}
          />
        </div>
        {loading && meetings.length === 0 ? <StateBlock title="Loading the calendar" /> : null}
        {error ? (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}
        {draft ? (
          <section className="mb-4 rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
            <h2 className="font-display text-2xl">{draft.id ? "Edit meeting" : "New meeting"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Lead" error={formFields.leadId}>
                <TextInput placeholder="Search leads" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} />
                <SelectInput className="mt-2" value={draft.leadId} onChange={(event) => setDraft({ ...draft, leadId: event.target.value })}>
                  <option value="">Choose a lead</option>
                  {leadOptions.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.label || "Lead"}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Title" error={formFields.title}>
                <TextInput value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </Field>
              <Field label="Kind" error={formFields.kind}>
                <SelectInput value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as MeetingKind })}>
                  <option>Call</option>
                  <option>Visit</option>
                </SelectInput>
              </Field>
              <Field label="Start date" error={formFields.startAt}>
                <TextInput type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
              </Field>
              <Field label="Start time" error={formFields.startAt}>
                <TextInput type="time" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
              </Field>
              <Field label="End date" error={formFields.endAt}>
                <TextInput type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
              </Field>
              <Field label="End time" error={formFields.endAt}>
                <TextInput type="time" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} />
              </Field>
            </div>
            {formError ? (
              <div className="mt-3">
                <Alert>{formError}</Alert>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button disabled={saving || outlookPending} onClick={() => void onSave()}>
                {saving ? "Saving…" : "Save meeting"}
              </Button>
              <Button variant="secondary" disabled={saving || outlookPending} onClick={() => setDraft(null)}>
                Cancel
              </Button>
              {draft.id && outlookOn ? (
                <Button variant="secondary" disabled={saving || outlookPending} onClick={() => void onOutlook()}>
                  {outlookPending ? "Adding…" : "Add to Outlook"}
                </Button>
              ) : null}
              {draft.id ? (
                <Button variant="danger" disabled={saving || outlookPending} onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              ) : null}
              {outlookNote ? (
                <p className={`text-sm ${outlookNote.ok ? "text-muted" : "text-danger"}`}>{outlookNote.message}</p>
              ) : null}
            </div>
            {draft.id && !outlookOn ? <p className="mt-3 text-sm text-muted">Outlook not connected.</p> : null}
          </section>
        ) : null}
      </div>
      {view === "month" && !loading ? (
        <div className="min-h-0 overflow-auto">
          <MonthGrid month={month} today={today} meetings={meetings} onOpenDay={openDay} onEdit={openEdit} />
          {monthCount === 0 ? <p className="mt-3 text-sm text-muted">No calls or visits in {monthLabel(month)}.</p> : null}
        </div>
      ) : null}
      {view !== "month" && !loading ? (
        <div ref={timeScrollRef} className="min-h-0 overflow-auto rounded-2xl border border-line bg-card lg:flex-1">
          <div className={view === "week" ? "min-w-[1100px] pb-6" : "pb-6"}>
                  <div className="grid" style={{ gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
                    <div className="sticky top-0 z-20 border-b border-line bg-paper" />
                    {visibleDays.map((day) => {
                      const current = sameDay(day, today);
                      return (
                        <div
                          key={toYmd(day)}
                          className={`sticky top-0 z-20 border-b border-l border-line px-3 py-3 ${current ? "bg-moss" : "bg-paper"}`}
                        >
                          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                            {day.toLocaleDateString("en-US", { weekday: "short" })}
                          </p>
                          <p className={`font-display text-2xl ${current ? "text-pine" : "text-ink"}`}>{day.getDate()}</p>
                        </div>
                      );
                    })}
                    <div className="relative z-0">
                      {HOURS.map((hour) => (
                        <div key={hour} className="border-b border-line pr-2 text-right text-xs text-muted" style={{ height: HOUR_HEIGHT }}>
                          <span className="inline-block">{formatHour(hour)}</span>
                        </div>
                      ))}
                      <div className="h-6 pr-2 text-right text-xs leading-4 text-muted">
                        <span className="inline-block -translate-y-1/2">{formatHour(END_HOUR)}</span>
                      </div>
                    </div>
                    {visibleDays.map((day) => (
                      <div key={`${toYmd(day)}-col`} className="relative z-0 border-l border-line">
                        {HOURS.map((hour) => (
                          <div key={hour} className="border-b border-line" style={{ height: HOUR_HEIGHT }} />
                        ))}
                        <div className="h-6" />
                        {meetingsOn(day, meetings).map((meeting) => (
                          <EventCard key={meeting.id} meeting={meeting} onEdit={openEdit} />
                        ))}
                      </div>
                    ))}
            </div>
          </div>
        </div>
      ) : null}
      {view !== "month" && !loading && shownMeetings.length === 0 ? (
        <p className="mt-3 shrink-0 text-sm text-muted">No calls or visits on this {view}.</p>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this meeting?"
        body="The lead keeps a note that the meeting was removed."
        confirmLabel="Delete"
        pending={saving}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
