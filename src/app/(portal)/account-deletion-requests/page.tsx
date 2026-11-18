"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  PageHeader,
  StateBlock,
} from "@/components/ui";
import { errorMessage } from "@/lib/api/errors";
import {
  approveAccountDeletionRequest,
  listAccountDeletionRequests,
  rejectAccountDeletionRequest,
} from "@/lib/api/resources";
import type { AccountDeletionRequest, AccountDeletionStatus } from "@/lib/api/types";
import { formatLocalDateTime, fullName, initials } from "@/lib/format";

const tabs: Array<{ id: AccountDeletionStatus; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

function statusTone(status: AccountDeletionStatus): "neutral" | "good" | "bad" | "warn" {
  if (status === "approved") return "good";
  if (status === "rejected") return "bad";
  return "warn";
}

function statusLabel(status: AccountDeletionStatus): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

type PendingAction = {
  id: string;
  kind: "approve" | "reject";
  name: string;
};

function requestName(row: AccountDeletionRequest): string {
  return fullName(row.user?.firstName, row.user?.lastName, row.user?.email || "Unnamed account");
}

export default function AccountDeletionRequestsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<AccountDeletionStatus>("pending");
  const [rows, setRows] = useState<AccountDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listAccountDeletionRequests(tab)
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setRows([]);
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, tab]);

  async function onConfirmAction() {
    if (!pendingAction) return;
    setActionPending(true);
    try {
      if (pendingAction.kind === "approve") {
        await approveAccountDeletionRequest(pendingAction.id);
        toast.success(`Deletion approved for ${pendingAction.name}. Account stays deactivated.`);
      } else {
        await rejectAccountDeletionRequest(pendingAction.id);
        toast.success(`Deletion rejected for ${pendingAction.name}. Access restored.`);
      }
      setPendingAction(null);
      setReloadKey((value) => value + 1);
    } catch (caught) {
      toast.error(errorMessage(caught));
      setPendingAction(null);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Accounts"
        title="Account deletions"
        description="Caretakers request deletion from the app. Approve keeps the account deactivated; reject restores sign-in."
        action={
          <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
            Refresh
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-card p-1 ring-1 ring-line">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                tab === item.id ? "bg-ink text-white" : "text-muted"
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? <StateBlock title="Loading deletion requests" /> : null}
      {error ? (
        <Alert>
          {error}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Try again
          </button>
        </Alert>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <StateBlock
          title={`No ${tab} deletion requests`}
          body={
            tab === "pending"
              ? "When a caretaker requests account deletion, it will appear here for review."
              : undefined
          }
        />
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                {tab !== "pending" ? (
                  <th className="px-4 py-3 font-semibold">Resolved</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Status</th>
                {tab === "pending" ? <th className="px-4 py-3 font-semibold">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const name = requestName(row);
                return (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-3">
                        <Avatar
                          name={initials(row.user?.firstName, row.user?.lastName)}
                          className="h-9 w-9"
                        />
                        <span className="font-semibold">{name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.user?.email || "—"}</td>
                    <td className="px-4 py-3">{row.user?.position || "—"}</td>
                    <td className="max-w-[240px] px-4 py-3">
                      <span className="line-clamp-2">{row.reason || "—"}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatLocalDateTime(row.createdAt)}
                    </td>
                    {tab !== "pending" ? (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatLocalDateTime(row.resolvedAt)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                    </td>
                    {tab === "pending" ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() =>
                              setPendingAction({ id: row.id, kind: "approve", name })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setPendingAction({ id: row.id, kind: "reject", name })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingAction?.kind === "approve"}
        title="Approve account deletion?"
        body={
          pendingAction
            ? `This keeps ${pendingAction.name}'s account deactivated. They will not be able to sign in.`
            : null
        }
        confirmLabel="Approve deletion"
        confirmVariant="danger"
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setPendingAction(null);
        }}
        onConfirm={() => void onConfirmAction()}
      />
      <ConfirmDialog
        open={pendingAction?.kind === "reject"}
        title="Reject account deletion?"
        body={
          pendingAction
            ? `This restores access for ${pendingAction.name}. They will be able to sign in again.`
            : null
        }
        confirmLabel="Reject and restore"
        confirmVariant="primary"
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setPendingAction(null);
        }}
        onConfirm={() => void onConfirmAction()}
      />
    </div>
  );
}
