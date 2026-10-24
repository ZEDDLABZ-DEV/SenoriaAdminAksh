"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, Avatar, Button, PageHeader, StateBlock } from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import { listAllCaregivers } from "@/lib/api/resources";
import type { CaregiverRecord } from "@/lib/api/types";
import { fullName, initials } from "@/lib/format";

export default function CaregiversPage() {
  const [caregivers, setCaregivers] = useState<CaregiverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    listAllCaregivers()
      .then(setCaregivers)
      .catch((caught: unknown) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Caregivers"
        description="Position is the caregiver type saved on the account. Turned-off caregivers are omitted."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load}>
              Refresh
            </Button>
            <Link href="/caregivers/new">
              <Button>New caregiver</Button>
            </Link>
          </div>
        }
      />
      <Suspense fallback={null}>
        <TurnedOffNotice />
      </Suspense>
      {loading ? <StateBlock title="Loading caregivers" /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={load}>
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && caregivers.length === 0 ? (
        <StateBlock title="No caregivers" body="Active caregiver accounts will appear here." />
      ) : null}
      {caregivers.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
              </tr>
            </thead>
            <tbody>
              {caregivers.map((caregiver) => (
                <tr key={caregiver.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-3">
                      <Avatar name={initials(caregiver.firstName, caregiver.lastName)} className="h-9 w-9" />
                      <Link href={`/caregivers/${caregiver.id}`} className="font-semibold text-pine hover:underline">
                        {fullName(caregiver.firstName, caregiver.lastName, caregiver.email || "Unnamed caregiver")}
                      </Link>
                    </span>
                  </td>
                  <td className="px-4 py-3">{caregiver.role || "—"}</td>
                  <td className="px-4 py-3">{caregiver.phone || "—"}</td>
                  <td className="px-4 py-3">{caregiver.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function TurnedOffNotice() {
  const notice = useSearchParams().get("notice");
  if (notice !== "off") return null;
  return (
    <div className="mb-4">
      <Alert tone="success">Caregiver turned off. They cannot sign in, and saved visits stay attached.</Alert>
    </div>
  );
}
