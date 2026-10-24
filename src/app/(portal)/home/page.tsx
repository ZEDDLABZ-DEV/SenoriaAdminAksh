"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Avatar, Button, PageHeader, StateBlock } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { getDashboardStats, listClientPreview } from "@/lib/api/resources";
import type { ClientRecord, DashboardStats } from "@/lib/api/types";
import { ageFromDateOfBirth, browserTimeZoneOffset, careTypeLabel, fullName, initials } from "@/lib/format";

const cards: Array<{ key: keyof DashboardStats; label: string; href?: string }> = [
  { key: "totalClients", label: "Clients", href: "/clients" },
  { key: "todayAppointments", label: "Today's appointments", href: "/appointments" },
  { key: "activeCarePlans", label: "Active care plans" },
  { key: "totalCaregivers", label: "Caregivers", href: "/caregivers" },
  { key: "completedAppointmentsToday", label: "Completed today" },
  { key: "pendingAppointmentsToday", label: "Pending today" },
];

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [statsError, setStatsError] = useState("");
  const [clientsError, setClientsError] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);

  async function load() {
    setLoadingStats(true);
    setLoadingClients(true);
    setStatsError("");
    setClientsError("");
    const statsPromise = getDashboardStats(browserTimeZoneOffset())
      .then(setStats)
      .catch((error: unknown) => setStatsError(errorMessage(error)))
      .finally(() => setLoadingStats(false));
    const clientsPromise = listClientPreview()
      .then((rows) => setClients(rows.slice(0, 6)))
      .catch((error: unknown) => setClientsError(errorMessage(error)))
      .finally(() => setLoadingClients(false));
    await Promise.all([statsPromise, clientsPromise]);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Today"
        title="Home"
        description="Counts use this browser's calendar day."
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />
      {loadingStats ? <StateBlock title="Loading today's counts" /> : null}
      {statsError ? (
        <Alert>
          {statsError}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Try again
          </button>
        </Alert>
      ) : null}
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const content = (
              <>
                <p className="text-sm text-muted">{card.label}</p>
                <p className="font-display mt-2 text-5xl">{stats[card.key].toLocaleString()}</p>
              </>
            );
            const className = "rounded-2xl border border-line bg-card p-5 shadow-sm shadow-ink/5";
            return card.href ? (
              <Link key={card.key} href={card.href} className={`${className} hover:border-pine/40`}>
                {content}
              </Link>
            ) : (
              <article key={card.key} className={className}>
                {content}
              </article>
            );
          })}
        </div>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-3xl">Clients</h2>
          <Link href="/clients" className="text-sm font-semibold text-pine hover:underline">
            Open directory
          </Link>
        </div>
        {loadingClients ? <StateBlock title="Loading clients" /> : null}
        {clientsError ? <Alert>{clientsError}</Alert> : null}
        {!loadingClients && !clientsError && clients.length === 0 ? (
          <StateBlock title="No clients yet" body="Create a client to start a care record." />
        ) : null}
        {clients.length > 0 ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {clients.map((client) => {
              const name = fullName(client.firstName, client.lastName, "Unnamed client");
              const age = ageFromDateOfBirth(client.dateOfBirth);
              return (
                <li key={client.id}>
                  <Link href={`/clients/${client.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                    <Avatar name={initials(client.firstName, client.lastName)} className="h-10 w-10" />
                    <span>
                      <span className="block font-medium">{name}</span>
                      <span className="text-sm text-muted">
                        {age == null ? "Age unknown" : `${age} years`} · {careTypeLabel(client.serviceRequirements[0]?.category)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
