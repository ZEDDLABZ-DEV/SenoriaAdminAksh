"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Alert, Button, ConfirmDialog, Field, Panel, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import type { NamedCatalogItem } from "@/lib/api/types";

function cleanedName(value: string): string {
  return value.trim();
}

function nameError(value: string, items: NamedCatalogItem[], ignoreId?: string): string {
  const cleaned = cleanedName(value);
  if (!cleaned) return "Enter a name.";
  if (cleaned.length > 80) return "Use 80 characters or fewer.";
  const duplicate = items.some((item) => item.id !== ignoreId && item.name.toLowerCase() === cleaned.toLowerCase());
  return duplicate ? "That name is already in the list." : "";
}

export function TypeCatalog({
  title,
  description,
  placeholder,
  emptyLabel,
  deleteBody,
  load,
  createItem,
  updateItem,
  deleteItem,
}: {
  title: string;
  description: string;
  placeholder: string;
  emptyLabel: string;
  deleteBody: string;
  load: () => Promise<NamedCatalogItem[]>;
  createItem: (name: string) => Promise<unknown>;
  updateItem: (id: string, name: string) => Promise<unknown>;
  deleteItem: (id: string) => Promise<unknown>;
}) {
  const [items, setItems] = useState<NamedCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [editError, setEditError] = useState("");
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<NamedCatalogItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await load());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh, reloadKey]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const nextError = nameError(draft, items);
    setDraftError(nextError);
    if (nextError) return;
    setPending(true);
    setError("");
    try {
      await createItem(cleanedName(draft));
      setDraft("");
      setDraftError("");
      setItems(await load());
    } catch (caught) {
      setDraftError(fieldErrors(caught).name || "");
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function startRename(item: NamedCatalogItem) {
    setEditingId(item.id);
    setEditDraft(item.name);
    setEditError("");
    setError("");
  }

  async function onRename(event: FormEvent, item: NamedCatalogItem) {
    event.preventDefault();
    const cleaned = cleanedName(editDraft);
    if (cleaned === item.name) {
      setEditingId("");
      setEditError("");
      return;
    }
    const nextError = nameError(editDraft, items, item.id);
    setEditError(nextError);
    if (nextError) return;
    setPending(true);
    setError("");
    try {
      await updateItem(item.id, cleaned);
      setEditingId("");
      setEditDraft("");
      setItems(await load());
    } catch (caught) {
      setEditError(fieldErrors(caught).name || "");
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!removing) return;
    setPending(true);
    setError("");
    try {
      await deleteItem(removing.id);
      setRemoving(null);
      if (editingId === removing.id) setEditingId("");
      setItems(await load());
    } catch (caught) {
      setRemoving(null);
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title={title}>
      <p className="mb-4 text-sm text-muted">{description}</p>
      {error ? (
        <div className="mb-4">
          <Alert>
            {error}{" "}
            <button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </button>
          </Alert>
        </div>
      ) : null}
      {loading && items.length === 0 ? <p className="mb-4 text-sm text-muted">Loading…</p> : null}
      {!loading || items.length > 0 ? (
        <form onSubmit={onAdd} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <Field label="Name" error={draftError}>
              <TextInput
                value={draft}
                placeholder={placeholder}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (draftError) setDraftError("");
                }}
              />
            </Field>
          </div>
          <Button type="submit" className="sm:mt-7" disabled={pending}>
            Add
          </Button>
        </form>
      ) : null}
      {!loading && !error && items.length === 0 ? <p className="mt-4 text-sm text-muted">{emptyLabel}</p> : null}
      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {items.map((item) => (
            <li key={item.id} className="bg-paper/40 px-3 py-2">
              {editingId === item.id ? (
                <form onSubmit={(event) => void onRename(event, item)} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <Field label={`Rename ${item.name}`} error={editError}>
                      <TextInput
                        value={editDraft}
                        onChange={(event) => {
                          setEditDraft(event.target.value);
                          if (editError) setEditError("");
                        }}
                      />
                    </Field>
                  </div>
                  <div className="flex gap-2 sm:mt-7">
                    <Button type="submit" disabled={pending}>
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId("");
                        setEditError("");
                      }}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => startRename(item)} disabled={pending}>
                      Rename
                    </Button>
                    <Button variant="ghost" onClick={() => setRemoving(item)} disabled={pending} aria-label={`Remove ${item.name}`}>
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.name || "this name"}?`}
        body={deleteBody}
        confirmLabel="Remove"
        pending={pending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void onDelete()}
      />
    </Panel>
  );
}
