"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChangePasswordDialog } from "@/components/caregivers/change-password-dialog";
import { Alert, Avatar, Badge, Button, ConfirmDialog, PageHeader, Panel, StateBlock } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { changeSalesPassword, deactivateSales, getSalesUser, revokeSalesSessions } from "@/lib/api/resources";
import type { SalesRecord } from "@/lib/api/types";
import { ageFromDateOfBirth, formatCalendarDate, fullName, initials, routeParam } from "@/lib/format";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

export default function SalesDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = routeParam(params.id);
  const [person, setPerson] = useState<SalesRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      setPerson(await getSalesUser(id));
    } catch (caught) {
      setPerson(null);
      setError(caught instanceof ApiError && caught.status === 404 ? "Sales person not found" : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDeactivate() {
    if (!id) return;
    setPending(true);
    setActionError("");
    try {
      await deactivateSales(id);
      router.replace("/sales?notice=off");
    } catch (caught) {
      setActionError(errorMessage(caught));
      setConfirmOff(false);
    } finally {
      setPending(false);
    }
  }

  async function onRevoke() {
    if (!person) return;
    setPending(true);
    setActionError("");
    setNotice("");
    try {
      const result = await revokeSalesSessions(person.id);
      if (result.sales?.id === person.id) setPerson(result.sales);
      setNotice(result.message);
      setConfirmRevoke(false);
    } catch (caught) {
      setActionError(errorMessage(caught));
      setConfirmRevoke(false);
    } finally {
      setPending(false);
    }
  }

  if (loading && !person) return <StateBlock title="Loading sales person" />;
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
  if (!person) return <StateBlock title="Sales person not found" />;

  const name = fullName(person.firstName, person.lastName, person.email || "Unnamed sales person");
  const age = ageFromDateOfBirth(person.dateOfBirth);
  const status = person.status || "active";
  const active = status !== "inactive";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sales person"
        title={name}
        description={active ? "Sales sign-in" : "Inactive. They cannot sign in."}
        action={
          <Button variant="danger" onClick={() => setConfirmOff(true)} disabled={pending || !active}>
            Turn off
          </Button>
        }
      />
      {actionError ? <Alert>{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card p-5">
        <Avatar name={initials(person.firstName, person.lastName)} className="h-16 w-16 text-xl" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Sales</Badge>
            <Badge tone={active ? "good" : "warn"}>{active ? "Active" : "Inactive"}</Badge>
          </div>
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
      <Panel title="Password">
        <div className="max-w-md space-y-4">
          <p className="text-sm text-muted">
            Set a new sign-in password. Their old password stops working, and their current sign-in ends.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPasswordOpen(true)}>Change password</Button>
            <Button variant="secondary" onClick={() => setConfirmRevoke(true)} disabled={pending || !active}>
              End current sign-in
            </Button>
          </div>
        </div>
      </Panel>
      <ChangePasswordDialog
        open={passwordOpen}
        caregiverName={name}
        onClose={() => setPasswordOpen(false)}
        onSave={async (password) => {
          const result = await changeSalesPassword(person.id, password);
          if (result.sales?.id === person.id) setPerson(result.sales);
          setNotice(result.message);
        }}
      />
      <ConfirmDialog
        open={confirmOff}
        title="Turn off this sales person?"
        body="They cannot sign in. Their current sign-in ends."
        confirmLabel="Turn off"
        pending={pending}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => void onDeactivate()}
      />
      <ConfirmDialog
        open={confirmRevoke}
        title="End the current sign-in?"
        body="They stay active and can sign in again with the same password."
        confirmLabel="End sign-in"
        confirmVariant="primary"
        pending={pending}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() => void onRevoke()}
      />
    </div>
  );
}
