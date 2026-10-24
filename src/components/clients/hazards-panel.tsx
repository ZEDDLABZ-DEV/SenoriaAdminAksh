"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, ConfirmDialog, Field, Panel, SelectInput, StateBlock, TextArea } from "@/components/ui";
import { ApiError, errorMessage, fieldErrors } from "@/lib/api/errors";
import { createHazard, deleteHazard, listHazards, updateHazard } from "@/lib/api/resources";
import type { Hazard } from "@/lib/api/types";

const TYPES = [
  { value: "environmental_risks", label: "Environmental" },
  { value: "medical_risks", label: "Medical" },
];

function typeLabel(value: string): string {
  return TYPES.find((item) => item.value === value)?.label ?? value;
}

export function HazardsPanel({ clientId }: { clientId: string }) {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("environmental_risks");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<Hazard | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Hazard | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setHazards(await listHazards(clientId));
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? "Client not found" : errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [clientId]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!description.trim()) {
      setFields({ description: "Description is required." });
      return;
    }
    setPending(true);
    setError("");
    try {
      await createHazard(clientId, type, description.trim());
      setDescription("");
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  async function onEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (!editing.description.trim()) {
      setFields({ description: "Description is required." });
      return;
    }
    setPending(true);
    setError("");
    try {
      await updateHazard(clientId, editing.id, editing.type, editing.description.trim());
      setEditing(null);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!pendingDelete?.id) return;
    setPending(true);
    try {
      await deleteHazard(clientId, pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
      setPendingDelete(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel id="hazards" title="Hazards">
      <div className="space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        {loading ? <StateBlock title="Loading hazards" /> : null}
        {!loading && hazards.length === 0 ? <p className="text-sm text-muted">No hazards on this client.</p> : null}
        {hazards.length > 0 ? (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {hazards.map((hazard) => (
              <li key={hazard.id || hazard.description} className="flex items-start justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-gold uppercase">{typeLabel(hazard.type)}</p>
                  <p className="mt-1 text-sm">{hazard.description || "—"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditing(hazard)} disabled={!hazard.id}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => setPendingDelete(hazard)} disabled={!hazard.id}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {editing ? (
          <form onSubmit={onEdit} className="space-y-3 rounded-xl bg-paper p-3">
            <Field label="Type">
              <SelectInput value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value })}>
                {TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Description" error={fields.description}>
              <TextArea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                Save hazard
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
            <Field label="Type">
              <SelectInput value={type} onChange={(event) => setType(event.target.value)}>
                {TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Description" error={fields.description}>
              <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add hazard"}
            </Button>
          </form>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this hazard?"
        body="The hazard is removed from the client."
        confirmLabel="Delete hazard"
        pending={pending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void onDelete()}
      />
    </Panel>
  );
}
