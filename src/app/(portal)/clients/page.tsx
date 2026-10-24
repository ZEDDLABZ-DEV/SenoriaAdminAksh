"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, PageHeader, StateBlock, TextInput } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { listAllClients } from "@/lib/api/resources";
import type { ClientRecord } from "@/lib/api/types";
import { ageFromDateOfBirth, careTypeLabel, clientStatusLabel, fullName } from "@/lib/format";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [careType, setCareType] = useState("All");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listAllClients(query)
      .then((rows) => {
        if (!cancelled) setClients(rows);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  const careTypes = useMemo(() => {
    const labels = new Set(clients.map((client) => careTypeLabel(client.serviceRequirements[0]?.category)));
    return ["All", ...Array.from(labels).sort()];
  }, [clients]);

  const activeCareType = careTypes.includes(careType) ? careType : "All";
  const visible = clients.filter((client) => {
    if (activeCareType === "All") return true;
    return careTypeLabel(client.serviceRequirements[0]?.category) === activeCareType;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Clients"
        description="Search matches last or first name. Care type is filtered on this page."
        action={
          <Link href="/clients/new">
            <Button>New client</Button>
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <TextInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by last or first name"
          className="max-w-sm"
          aria-label="Search clients"
        />
        <select
          className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
          value={activeCareType}
          onChange={(event) => setCareType(event.target.value)}
          aria-label="Care type"
        >
          {careTypes.map((type) => (
            <option key={type} value={type}>
              {type === "All" ? "All care types" : type}
            </option>
          ))}
        </select>
      </div>
      {loading ? <StateBlock title="Loading clients" /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && visible.length === 0 ? (
        <StateBlock title="No clients" body="Nothing matches this search and care type." />
      ) : null}
      {visible.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Age</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Care type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((client) => {
                const age = ageFromDateOfBirth(client.dateOfBirth);
                const status = client.status || "active";
                return (
                  <tr key={client.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="font-semibold text-pine hover:underline">
                        {fullName(client.firstName, client.lastName, "Unnamed client")}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{age == null ? "—" : age}</td>
                    <td className="px-4 py-3">{client.phone || "—"}</td>
                    <td className="px-4 py-3">{careTypeLabel(client.serviceRequirements[0]?.category)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={status === "inactive" ? "warn" : "good"}>{clientStatusLabel(status)}</Badge>
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
