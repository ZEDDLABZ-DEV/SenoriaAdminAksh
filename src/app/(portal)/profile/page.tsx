"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, Avatar, Badge, Button, PageHeader, Panel, StateBlock } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { getSalesDashboard } from "@/lib/api/resources";
import { isSalesRole } from "@/lib/api/session";
import type { SalesDashboard } from "@/lib/api/types";
import { ageFromDateOfBirth, formatCalendarDate, fullName, initials } from "@/lib/format";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { ready, user } = useAuth();
  const sales = ready && isSalesRole(user?.role);
  const [person, setPerson] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPerson(await getSalesDashboard());
    } catch (caught) {
      setPerson(null);
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sales) return;
    void load();
  }, [sales, load]);

  if (!sales) return <StateBlock title="Opening home" />;
  if (loading && !person) return <StateBlock title="Loading your profile" />;
  if (error && !person) {
    return (
      <StateBlock
        title={error}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!person) return <StateBlock title="Profile unavailable" />;

  const name = fullName(person.firstName, person.lastName, person.email || "Sales");
  const age = ageFromDateOfBirth(person.dateOfBirth);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sales"
        title={name}
        description="Your profile"
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Try again
          </button>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card p-5">
        <Avatar name={initials(person.firstName, person.lastName)} className="h-16 w-16 text-xl" />
        <div>
          <Badge>Sales</Badge>
          <p className="mt-2 text-sm text-muted">
            {person.phone || "No phone"} · {person.email || "No email"}
          </p>
        </div>
      </div>
      <Panel title="Details">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Fact label="Name" value={name} />
          <Fact label="Email" value={person.email || "—"} />
          <Fact label="Phone" value={person.phone || "—"} />
          <Fact label="Role" value="Sales" />
          <Fact
            label="Date of birth"
            value={
              person.dateOfBirth
                ? `${formatCalendarDate(person.dateOfBirth)}${age == null ? "" : ` · age ${age}`}`
                : "—"
            }
          />
        </dl>
      </Panel>
    </div>
  );
}
