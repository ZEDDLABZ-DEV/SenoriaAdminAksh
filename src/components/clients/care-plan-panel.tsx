"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { Alert, Badge, Button, ConfirmDialog, Field, Panel, SelectInput, StringListEditor, TextArea, TextInput } from "@/components/ui";
import { errorMessage, fieldErrors } from "@/lib/api/errors";
import {
  addCarePlanDiet,
  addCarePlanHygiene,
  addCarePlanMedication,
  addCarePlanTask,
  createCarePlan,
  deleteCarePlanDiet,
  deleteCarePlanHygiene,
  deleteCarePlanMedication,
  deleteCarePlanTask,
  updateCarePlanDiet,
  updateCarePlanHygiene,
  updateCarePlanMedication,
  updateCarePlanTask,
} from "@/lib/api/resources";
import type { CarePlan, CarePlanDiet, CarePlanHygiene, CarePlanMedication, CarePlanTask } from "@/lib/api/types";
import { formatCalendarDate } from "@/lib/format";

const SCHEDULES = [
  { value: "OD", label: "OD — once a day" },
  { value: "BD", label: "BD — twice a day" },
  { value: "TDS", label: "TDS — three times a day" },
  { value: "QID", label: "QID — four times a day" },
  { value: "PRN", label: "PRN — as needed" },
  { value: "HS", label: "HS — at bedtime" },
];

function statusTone(status: string): "good" | "warn" | "neutral" {
  if (status === "active") return "good";
  if (status === "completed") return "neutral";
  return "warn";
}

export function CarePlanPanel({
  clientId,
  plan,
  onChanged,
}: {
  clientId: string;
  plan: CarePlan | null;
  onChanged: () => Promise<void>;
}) {
  return (
    <Panel id="care-plan" title="Care plan">
      {plan ? <ExistingPlan plan={plan} onChanged={onChanged} /> : <CreatePlan clientId={clientId} onChanged={onChanged} />}
    </Panel>
  );
}

function CreatePlan({ clientId, onChanged }: { clientId: string; onChanged: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive" | "completed">("active");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setFields({ name: "Name is required." });
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setFields({ endDate: "End date cannot be before the start date." });
      return;
    }
    setPending(true);
    setError("");
    try {
      await createCarePlan({
        clientId,
        name,
        description,
        goals,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
      setFields(fieldErrors(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted">This client has no care plan yet. Each client has one.</p>
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={fields.name}>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Status">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="completed">Completed</option>
          </SelectInput>
        </Field>
        <Field label="Start date">
          <TextInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </Field>
        <Field label="End date" error={fields.endDate}>
          <TextInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
      </div>
      <Field label="Description">
        <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <StringListEditor label="Goals" values={goals} onChange={setGoals} placeholder="Add a goal" />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create care plan"}
      </Button>
    </form>
  );
}

function ExistingPlan({ plan, onChanged }: { plan: CarePlan; onChanged: () => Promise<void> }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold">{plan.name || "Untitled plan"}</h3>
        <Badge tone={statusTone(plan.status)}>{plan.status || "active"}</Badge>
      </div>
      <p className="text-sm text-muted">{plan.description || "No description."}</p>
      <p className="text-sm text-muted">
        {plan.startDate ? formatCalendarDate(plan.startDate) : "No start"} – {plan.endDate ? formatCalendarDate(plan.endDate) : "No end"}
      </p>
      {plan.goals.length > 0 ? (
        <ul className="list-disc pl-5 text-sm">
          {plan.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No goals.</p>
      )}
      <PlanItems
        title="Tasks"
        noun="task"
        rows={plan.tasks.map((item) => ({
          id: item.id,
          title: item.name,
          detail: [item.frequency, item.description].filter(Boolean).join(" · "),
        }))}
        onDelete={(id) => deleteCarePlanTask(plan.id, id)}
        onChanged={onChanged}
        editor={(editingId, cancelEdit) => (
          <TaskForm
            key={editingId ?? "new-task"}
            carePlanId={plan.id}
            task={plan.tasks.find((item) => item.id === editingId) ?? null}
            onChanged={onChanged}
            onCancel={editingId ? cancelEdit : undefined}
          />
        )}
      />
      <PlanItems
        title="Medications"
        noun="medication"
        rows={plan.medications.map((item) => ({
          id: item.id,
          title: item.medicationName,
          detail: [item.dosage, item.schedule, item.description].filter(Boolean).join(" · "),
        }))}
        onDelete={(id) => deleteCarePlanMedication(plan.id, id)}
        onChanged={onChanged}
        editor={(editingId, cancelEdit) => (
          <MedicationForm
            key={editingId ?? "new-medication"}
            carePlanId={plan.id}
            medication={plan.medications.find((item) => item.id === editingId) ?? null}
            onChanged={onChanged}
            onCancel={editingId ? cancelEdit : undefined}
          />
        )}
      />
      <PlanItems
        title="Diet"
        noun="diet row"
        rows={plan.dietInstructions.map((item) => ({
          id: item.id,
          title: item.meal,
          detail: [item.restrictions, item.description].filter(Boolean).join(" · "),
        }))}
        onDelete={(id) => deleteCarePlanDiet(plan.id, id)}
        onChanged={onChanged}
        editor={(editingId, cancelEdit) => (
          <DietForm
            key={editingId ?? "new-diet"}
            carePlanId={plan.id}
            diet={plan.dietInstructions.find((item) => item.id === editingId) ?? null}
            onChanged={onChanged}
            onCancel={editingId ? cancelEdit : undefined}
          />
        )}
      />
      <PlanItems
        title="Hygiene"
        noun="hygiene activity"
        rows={plan.hygieneInstructions.map((item) => ({
          id: item.id,
          title: item.activity,
          detail: [item.frequency, item.description].filter(Boolean).join(" · "),
        }))}
        onDelete={(id) => deleteCarePlanHygiene(plan.id, id)}
        onChanged={onChanged}
        editor={(editingId, cancelEdit) => (
          <HygieneForm
            key={editingId ?? "new-hygiene"}
            carePlanId={plan.id}
            hygiene={plan.hygieneInstructions.find((item) => item.id === editingId) ?? null}
            onChanged={onChanged}
            onCancel={editingId ? cancelEdit : undefined}
          />
        )}
      />
    </div>
  );
}

function PlanItems({
  title,
  noun,
  rows,
  onDelete,
  onChanged,
  editor,
}: {
  title: string;
  noun: string;
  rows: Array<{ id: string; title: string; detail: string }>;
  onDelete: (id: string) => Promise<void>;
  onChanged: () => Promise<void>;
  editor: (editingId: string | null, cancelEdit: () => void) => ReactNode;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete?.id) return;
    setPending(true);
    setError("");
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
      if (editingId === pendingDelete.id) setEditingId(null);
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
      setPendingDelete(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h4 className="text-sm font-semibold tracking-wide text-muted uppercase">{title}</h4>
      {error ? <div className="mt-2"><Alert>{error}</Alert></div> : null}
      {rows.length === 0 ? <p className="mt-1 text-sm text-muted">None yet.</p> : null}
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id || row.title}
            className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm ${editingId === row.id ? "bg-moss ring-1 ring-pine" : "bg-paper"}`}
          >
            <div>
              <span className="font-medium">{row.title || "Untitled"}</span>
              {row.detail ? <span className="mt-0.5 block text-muted">{row.detail}</span> : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" onClick={() => setEditingId(row.id)} disabled={!row.id || pending}>
                Edit
              </Button>
              <Button variant="ghost" onClick={() => setPendingDelete({ id: row.id, title: row.title })} disabled={!row.id || pending}>
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3">{editor(editingId, () => setEditingId(null))}</div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Remove this ${noun}?`}
        body={pendingDelete?.title ? `"${pendingDelete.title}" is removed from the care plan.` : `This ${noun} is removed from the care plan.`}
        confirmLabel={`Remove ${noun}`}
        pending={pending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function TaskForm({
  carePlanId,
  task,
  onChanged,
  onCancel,
}: {
  carePlanId: string;
  task: CarePlanTask | null;
  onChanged: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(task?.name ?? "");
  const [frequency, setFrequency] = useState(task?.frequency ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Task name is required.");
      return;
    }
    const input = { name: name.trim(), frequency: frequency.trim(), description: description.trim() };
    setPending(true);
    setError("");
    try {
      if (task?.id) await updateCarePlanTask(carePlanId, task.id, input);
      else await addCarePlanTask(carePlanId, input);
      if (!task) {
        setName("");
        setFrequency("");
        setDescription("");
      }
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
      {error ? <div className="sm:col-span-3"><Alert>{error}</Alert></div> : null}
      <Field label="Task name">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Frequency">
        <TextInput value={frequency} onChange={(event) => setFrequency(event.target.value)} />
      </Field>
      <Field label="Description">
        <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !carePlanId}>
          {pending ? "Saving…" : task ? "Save task" : "Add task"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function MedicationForm({
  carePlanId,
  medication,
  onChanged,
  onCancel,
}: {
  carePlanId: string;
  medication: CarePlanMedication | null;
  onChanged: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [medicationName, setMedicationName] = useState(medication?.medicationName ?? "");
  const [dosage, setDosage] = useState(medication?.dosage ?? "");
  const [schedule, setSchedule] = useState(medication ? medication.schedule : "OD");
  const [description, setDescription] = useState(medication?.description ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const scheduleOptions = SCHEDULES.some((item) => item.value === schedule)
    ? SCHEDULES
    : [{ value: schedule, label: schedule || "No schedule" }, ...SCHEDULES];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!medicationName.trim()) {
      setError("Medication name is required.");
      return;
    }
    const fields = {
      medicationName: medicationName.trim(),
      dosage: dosage.trim(),
      description: description.trim(),
    };
    const recognizedSchedule = schedule === "" || SCHEDULES.some((item) => item.value === schedule);
    setPending(true);
    setError("");
    try {
      if (medication?.id) {
        await updateCarePlanMedication(
          carePlanId,
          medication.id,
          recognizedSchedule ? { ...fields, schedule } : fields,
        );
      } else {
        await addCarePlanMedication(carePlanId, { ...fields, schedule });
      }
      if (!medication) {
        setMedicationName("");
        setDosage("");
        setDescription("");
        setSchedule("OD");
      }
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
      {error ? <div className="sm:col-span-2"><Alert>{error}</Alert></div> : null}
      <Field label="Medication">
        <TextInput value={medicationName} onChange={(event) => setMedicationName(event.target.value)} />
      </Field>
      <Field label="Dosage">
        <TextInput value={dosage} onChange={(event) => setDosage(event.target.value)} />
      </Field>
      <Field label="Schedule">
        <SelectInput value={schedule} onChange={(event) => setSchedule(event.target.value)}>
          {scheduleOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Description">
        <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !carePlanId}>
          {pending ? "Saving…" : medication ? "Save medication" : "Add medication"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function DietForm({
  carePlanId,
  diet,
  onChanged,
  onCancel,
}: {
  carePlanId: string;
  diet: CarePlanDiet | null;
  onChanged: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [meal, setMeal] = useState(diet?.meal ?? "");
  const [restrictions, setRestrictions] = useState(diet?.restrictions ?? "");
  const [description, setDescription] = useState(diet?.description ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!meal.trim()) {
      setError("Meal is required.");
      return;
    }
    const input = { meal: meal.trim(), restrictions: restrictions.trim(), description: description.trim() };
    setPending(true);
    setError("");
    try {
      if (diet?.id) await updateCarePlanDiet(carePlanId, diet.id, input);
      else await addCarePlanDiet(carePlanId, input);
      if (!diet) {
        setMeal("");
        setRestrictions("");
        setDescription("");
      }
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
      {error ? <div className="sm:col-span-3"><Alert>{error}</Alert></div> : null}
      <Field label="Meal">
        <TextInput value={meal} onChange={(event) => setMeal(event.target.value)} />
      </Field>
      <Field label="Restrictions">
        <TextInput value={restrictions} onChange={(event) => setRestrictions(event.target.value)} />
      </Field>
      <Field label="Description">
        <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !carePlanId}>
          {pending ? "Saving…" : diet ? "Save diet" : "Add diet"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function HygieneForm({
  carePlanId,
  hygiene,
  onChanged,
  onCancel,
}: {
  carePlanId: string;
  hygiene: CarePlanHygiene | null;
  onChanged: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [activity, setActivity] = useState(hygiene?.activity ?? "");
  const [frequency, setFrequency] = useState(hygiene?.frequency ?? "");
  const [description, setDescription] = useState(hygiene?.description ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!activity.trim()) {
      setError("Activity is required.");
      return;
    }
    const input = { activity: activity.trim(), frequency: frequency.trim(), description: description.trim() };
    setPending(true);
    setError("");
    try {
      if (hygiene?.id) await updateCarePlanHygiene(carePlanId, hygiene.id, input);
      else await addCarePlanHygiene(carePlanId, input);
      if (!hygiene) {
        setActivity("");
        setFrequency("");
        setDescription("");
      }
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-3">
      {error ? <div className="sm:col-span-3"><Alert>{error}</Alert></div> : null}
      <Field label="Activity">
        <TextInput value={activity} onChange={(event) => setActivity(event.target.value)} />
      </Field>
      <Field label="Frequency">
        <TextInput value={frequency} onChange={(event) => setFrequency(event.target.value)} />
      </Field>
      <Field label="Description">
        <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !carePlanId}>
          {pending ? "Saving…" : hygiene ? "Save hygiene" : "Add hygiene"}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
