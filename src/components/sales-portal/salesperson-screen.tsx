"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, PageHeader, StateBlock } from "@/components/ui";
import { stageTone } from "@/components/sales-portal/stage";
import { ApiError, describeApiError } from "@/lib/api/errors";
import { getSalesperson } from "@/lib/api/resources";
import type { LeadListItem, SalespersonDetail } from "@/lib/api/types";
import { formatLocalDateTime } from "@/lib/format";

function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function LeadTable({
  leads,
  empty,
  whenHeader,
  when,
  showNext,
}: {
  leads: LeadListItem[];
  empty: string;
  whenHeader: string;
  when: (lead: LeadListItem) => string;
  showNext?: boolean;
}) {
  if (leads.length === 0) return <p className="mt-3 text-sm text-muted">{empty}</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="py-2 pr-3 font-semibold">Name</th>
            <th className="px-3 py-2 font-semibold">Source</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className={`px-3 py-2 font-semibold ${showNext ? "" : "pr-0 pl-3"}`}>{whenHeader}</th>
            {showNext ? <th className="py-2 pl-3 font-semibold">Next step</th> : null}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-line">
              <td className="py-3 pr-3">
                <Link href={`/today?lead=${lead.id}`} className="font-semibold text-pine hover:underline">
                  {personName(lead)}
                </Link>
                <span className="mt-0.5 block text-xs text-muted">{lead.phone}</span>
              </td>
              <td className="px-3 py-3">{lead.source}</td>
              <td className="px-3 py-3">
                <Badge tone={stageTone(lead.stage)}>{lead.stage}</Badge>
              </td>
              <td className="px-3 py-3">{when(lead)}</td>
              {showNext ? <td className="py-3 pl-3">{lead.nextStep || "—"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalespersonScreen({ id }: { id: string }) {
  const [person, setPerson] = useState<SalespersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setPerson(null);
    setLoading(true);
    setError("");
    setMissing(false);
    getSalesperson(id)
      .then(setPerson)
      .catch((caught: unknown) => {
        setPerson(null);
        if (caught instanceof ApiError && caught.status === 404) setMissing(true);
        else setError(describeApiError(caught));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!id || missing) {
    return (
      <StateBlock
        title="Sales executive not found"
        action={
          <Link href="/salespeople" className="font-semibold text-pine hover:underline">
            Back to sales executives
          </Link>
        }
      />
    );
  }

  if (loading && !person) return <StateBlock title="Loading sales executive" />;
  if (error && !person) {
    return (
      <StateBlock
        title="This sales executive could not be opened"
        body={error}
        action={
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!person) return <StateBlock title="Sales executive not found" />;

  const name = personName(person);
  const counts = [
    { label: "Open", value: person.stats.open },
    { label: "Won", value: person.stats.won },
    { label: "Lost", value: person.stats.lost },
    { label: "Overdue", value: person.stats.overdue },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Sales executive"
        title={name}
        description={
          person.status === "active"
            ? "Active. New leads are assigned to them when it is their turn."
            : "Inactive. New leads skip them. An admin can still assign a lead to them."
        }
        action={
          <Link href="/salespeople" className="text-sm font-semibold text-pine hover:underline">
            All sales executives
          </Link>
        }
      />
      <div className="mb-4 rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={person.status === "active" ? "good" : "warn"}>{person.status === "active" ? "Active" : "Inactive"}</Badge>
          <p className="text-sm text-muted">
            {person.phone || "No phone"} · {person.email || "No email"}
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counts.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{item.label}</dt>
              <dd className="font-display mt-1 text-3xl">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
        <h2 className="font-display text-2xl">Current leads</h2>
        <LeadTable
          leads={person.currentLeads}
          empty={`No open leads for ${name}.`}
          whenHeader="Last touch"
          when={(lead) => formatLocalDateTime(lead.lastTouchAt)}
          showNext
        />
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
        <h2 className="font-display text-2xl">Past leads</h2>
        <LeadTable
          leads={person.pastLeads}
          empty={`No won or lost leads for ${name}.`}
          whenHeader="Closed"
          when={(lead) => formatLocalDateTime(lead.lastTouchAt)}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5">
        <h2 className="font-display text-2xl">Recent events</h2>
        <p className="mt-1 text-sm text-muted">Assigned leads, stage changes, call results, and booked visits.</p>
        {person.events.length === 0 ? <p className="mt-3 text-sm text-muted">No events yet.</p> : null}
        {person.events.length > 0 ? (
          <ol className="mt-4 space-y-3">
            {person.events.map((item) => (
              <li key={item.id} className="grid gap-1 border-t border-line py-3 text-sm sm:grid-cols-[160px_110px_minmax(0,1fr)] sm:gap-3">
                <span className="text-muted">{formatLocalDateTime(item.occurredAt)}</span>
                <span className="font-semibold text-pine">{item.kind}</span>
                <span>
                  {item.leadId ? (
                    <Link href={`/today?lead=${item.leadId}`} className="font-semibold text-pine hover:underline">
                      {item.leadName || "Lead"}
                    </Link>
                  ) : (
                    <span className="font-semibold">{item.leadName || "—"}</span>
                  )}
                  {item.text ? `. ${item.text}` : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}
