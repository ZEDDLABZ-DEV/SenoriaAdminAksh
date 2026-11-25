"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, PageHeader, StateBlock } from "@/components/ui";
import { describeApiError } from "@/lib/api/errors";
import { listSalespeople } from "@/lib/api/resources";
import type { SalespersonListItem } from "@/lib/api/types";

function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function SalespeopleScreen() {
  const [people, setPeople] = useState<SalespersonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    listSalespeople("all")
      .then(setPeople)
      .catch((caught: unknown) => {
        setPeople([]);
        setError(describeApiError(caught));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow="Sales portal"
        title="Sales executives"
        description="Open a person to see the leads assigned to them and the history of how those leads were handled."
      />
      {loading ? <StateBlock title="Loading sales executives" /> : null}
      {error ? (
        <StateBlock
          title="Sales executives could not be loaded"
          body={error}
          action={
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          }
        />
      ) : null}
      {!loading && !error && people.length === 0 ? <StateBlock title="No sales executives." /> : null}
      {people.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Round robin</th>
                <th className="px-4 py-3 font-semibold">Assigned leads</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={`/salespeople/${person.id}`} className="font-semibold text-pine hover:underline">
                      {personName(person)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={person.status === "active" ? "good" : "warn"}>
                      {person.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{person.inRoundRobin ? "In the round robin" : "Skipped"}</td>
                  <td className="px-4 py-3">{person.assignedLeadCount}</td>
                  <td className="px-4 py-3">{person.phone || "—"}</td>
                  <td className="px-4 py-3">{person.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
