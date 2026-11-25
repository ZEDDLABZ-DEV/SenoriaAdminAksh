"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useIntegrations } from "@/components/sales-portal/integrations-provider";
import { Badge, Button, PageHeader, StateBlock, Alert } from "@/components/ui";
import { describeApiError } from "@/lib/api/errors";
import {
  SALES_LIST_PAGE_SIZE,
  assignLead,
  getLeadAssignmentState,
  listLeads,
  listSalespeople,
} from "@/lib/api/resources";
import { isSalesRole } from "@/lib/api/session";
import type { LeadAssignmentState, LeadListItem, LeadStage, PageMeta, SalespersonListItem } from "@/lib/api/types";
import { formatLocalDateTime } from "@/lib/format";
import { LEAD_STAGES } from "@/lib/sales-portal";
import { stageTone } from "@/components/sales-portal/stage";

type StageFilter = "All" | LeadStage;

const OPTIONS: Array<{ id: StageFilter; label: string }> = [
  { id: "All", label: "All" },
  ...LEAD_STAGES.map((stage) => ({ id: stage, label: stage })),
];

function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function LeadsScreen() {
  const { user } = useAuth();
  const { status } = useIntegrations();
  const admin = !isSalesRole(user?.role);
  const [stage, setStage] = useState<StageFilter>("All");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LeadListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignment, setAssignment] = useState<LeadAssignmentState | null>(null);
  const [people, setPeople] = useState<SalespersonListItem[]>([]);
  const [assignError, setAssignError] = useState("");
  const [assigningId, setAssigningId] = useState("");

  const load = useCallback((nextStage: StageFilter, nextPage: number) => {
    setRows([]);
    setLoading(true);
    setError("");
    listLeads({
      page: nextPage,
      pageSize: SALES_LIST_PAGE_SIZE,
      stage: nextStage === "All" ? undefined : nextStage,
    })
      .then((result) => {
        setRows(result.items);
        setMeta(result.meta);
      })
      .catch((caught: unknown) => {
        setRows([]);
        setMeta(null);
        setError(describeApiError(caught));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(stage, page);
  }, [load, stage, page]);

  useEffect(() => {
    if (!admin) return;
    let cancel = false;
    getLeadAssignmentState()
      .then((next) => {
        if (!cancel) setAssignment(next);
      })
      .catch((caught: unknown) => {
        if (!cancel) setAssignError(describeApiError(caught));
      });
    listSalespeople("all")
      .then((next) => {
        if (!cancel) setPeople(next);
      })
      .catch((caught: unknown) => {
        if (!cancel) setAssignError(describeApiError(caught));
      });
    return () => {
      cancel = true;
    };
  }, [admin]);

  function chooseStage(next: StageFilter) {
    setStage(next);
    setPage(1);
  }

  async function onAssign(lead: LeadListItem, ownerId: string) {
    if (!ownerId || ownerId === lead.ownerId) return;
    setAssigningId(lead.id);
    setAssignError("");
    try {
      const updated = await assignLead(lead.id, ownerId);
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch (caught) {
      setAssignError(describeApiError(caught));
    } finally {
      setAssigningId("");
    }
  }

  const activeNames = (assignment?.activeRepIds ?? [])
    .map((id) => people.find((person) => person.id === id))
    .filter((person): person is SalespersonListItem => person != null)
    .map(personName);
  const nextOwner = assignment?.nextOwnerName;

  return (
    <div>
      <PageHeader
        eyebrow="Sales portal"
        title="Leads"
        description={
          admin
            ? "Every lead. A new lead is assigned to the next active sales executive. You can give a lead to anyone."
            : "Leads assigned to you. Open a person to see the call, the note, and the next step."
        }
      />
      {admin && status.meta.enabled ? (
        <p className="mb-4 text-sm text-muted">Facebook/Instagram lead ads sync when Meta is connected.</p>
      ) : null}
      {admin && assignment ? (
        <p className="mb-4 rounded-lg border border-line bg-card px-3 py-2 text-sm text-muted">
          {nextOwner
            ? `Active sales executives take new leads in turn${activeNames.length ? `: ${activeNames.join(", ")}` : ""}. The next lead goes to ${nextOwner}.`
            : "There is no active sales executive. Inactive people are skipped unless you assign a lead to them."}
          {nextOwner ? " Inactive people are skipped unless you assign a lead to them." : ""}
        </p>
      ) : null}
      {assignError ? (
        <div className="mb-4">
          <Alert>{assignError}</Alert>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-card p-1 ring-1 ring-line" role="group" aria-label="Stage">
        {OPTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={stage === item.id}
            onClick={() => chooseStage(item.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${stage === item.id ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading && rows.length === 0 ? <StateBlock title="Loading leads" /> : null}
      {error && rows.length === 0 ? (
        <StateBlock
          title="Leads could not be loaded"
          body={error}
          action={
            <Button variant="secondary" onClick={() => load(stage, page)}>
              Try again
            </Button>
          }
        />
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <StateBlock title="No leads in this stage." />
      ) : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Last touch</th>
                <th className="px-4 py-3 font-semibold">Next step</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => {
                const known = people.some((person) => person.id === lead.ownerId);
                return (
                  <tr key={lead.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/today?lead=${lead.id}`} className="font-semibold text-pine hover:underline">
                        {personName(lead)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{lead.source}</td>
                    <td className="px-4 py-3">
                      <Badge tone={stageTone(lead.stage)}>{lead.stage}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {admin ? (
                        <select
                          aria-label={`Assign ${personName(lead)}`}
                          className="w-full max-w-[220px] rounded-lg border border-line bg-card px-2 py-1.5 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/20"
                          value={lead.ownerId ?? ""}
                          disabled={assigningId === lead.id || people.length === 0}
                          onChange={(event) => void onAssign(lead, event.target.value)}
                        >
                          <option value="" disabled>
                            Unassigned
                          </option>
                          {lead.ownerId && !known ? (
                            <option value={lead.ownerId}>{lead.ownerName || "Owner"}</option>
                          ) : null}
                          {people.map((person) => (
                            <option key={person.id} value={person.id}>
                              {personName(person)}
                              {person.status === "active" ? "" : " (inactive)"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        lead.ownerName || "Unassigned"
                      )}
                    </td>
                    <td className="px-4 py-3">{lead.phone}</td>
                    <td className="px-4 py-3">{formatLocalDateTime(lead.lastTouchAt)}</td>
                    <td className="px-4 py-3">{lead.nextStep || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {meta && (meta.hasNextPage || meta.hasPreviousPage) ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Page {meta.page}
            {meta.total != null ? ` · ${meta.total} leads` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!meta.hasPreviousPage || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </Button>
            <Button variant="secondary" disabled={!meta.hasNextPage || loading} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
      {error && rows.length > 0 ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
