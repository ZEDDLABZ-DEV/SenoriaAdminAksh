"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Alert, Avatar, Badge, Button, PageHeader, SegmentedControl, StateBlock } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { listAllSales, type SalesAccountStatus } from "@/lib/api/resources";
import type { SalesRecord } from "@/lib/api/types";
import { ageFromDateOfBirth, clientStatusLabel, formatCalendarDate, fullName, initials } from "@/lib/format";

const STATUS_OPTIONS: Array<{ id: SalesAccountStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

export default function SalesPage() {
  const [people, setPeople] = useState<SalesRecord[]>([]);
  const [status, setStatus] = useState<SalesAccountStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback((next: SalesAccountStatus) => {
    setLoading(true);
    setError("");
    setPeople([]);
    listAllSales(next)
      .then(setPeople)
      .catch((caught: unknown) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Sales"
        description="Active and inactive sales accounts. An inactive person cannot sign in."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => load(status)}>
              Refresh
            </Button>
            <Link href="/sales/new">
              <Button>New sales person</Button>
            </Link>
          </div>
        }
      />
      <div className="mb-4">
        <SegmentedControl<SalesAccountStatus>
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />
      </div>
      <Suspense fallback={null}>
        <TurnedOffNotice />
      </Suspense>
      {loading ? <StateBlock title="Loading sales people" /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => load(status)}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && people.length === 0 ? (
        <StateBlock title={emptyTitle(status)} body={emptyBody(status)} />
      ) : null}
      {!loading && people.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Date of birth</th>
                <th className="px-4 py-3 font-semibold">Age</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const age = ageFromDateOfBirth(person.dateOfBirth);
                const accountStatus = (person.status || "active").toLowerCase();
                return (
                  <tr key={person.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-3">
                        <Avatar name={initials(person.firstName, person.lastName)} className="h-9 w-9" />
                        <span>
                          <Link href={`/sales/${person.id}`} className="font-semibold text-pine hover:underline">
                            {fullName(person.firstName, person.lastName, person.email || "Unnamed sales person")}
                          </Link>
                          <Link href={`/sales/${person.id}#lead-history`} className="mt-0.5 block text-xs font-semibold text-pine hover:underline">
                            Lead history
                          </Link>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatCalendarDate(person.dateOfBirth)}</td>
                    <td className="px-4 py-3">{age == null ? "—" : age}</td>
                    <td className="px-4 py-3">{person.phone || "—"}</td>
                    <td className="px-4 py-3">{person.email || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={accountStatus === "inactive" ? "warn" : "good"}>{clientStatusLabel(accountStatus)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function emptyTitle(status: SalesAccountStatus): string {
  if (status === "active") return "No active sales people";
  if (status === "inactive") return "No inactive sales people";
  return "No sales people";
}

function emptyBody(status: SalesAccountStatus): string {
  if (status === "active") return "Active sales accounts will appear here.";
  if (status === "inactive") return "Turned-off sales accounts will appear here.";
  return "Sales accounts will appear here.";
}

function TurnedOffNotice() {
  const notice = useSearchParams().get("notice");
  if (notice !== "off") return null;
  return (
    <div className="mb-4">
      <Alert tone="success">Sales person turned off. They cannot sign in.</Alert>
    </div>
  );
}
