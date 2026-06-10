import { useEffect, useState, type FormEvent } from 'react';
import {
  listClinicSlots,
  createClinicSlot,
  updateClinicSlot,
  deleteClinicSlot,
} from '../api/appointments';
import type { ClinicSlot } from '../api/types';
import { errorMessage } from '../api/client';
import {
  Card,
  Spinner,
  ErrorMessage,
  EmptyState,
  PageTitle,
  Field,
  inputCls,
  btnPrimary,
  btnSecondary,
  ConfirmDialog,
} from '../components/ui';
import { formatTime } from '../utils/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type SlotForm = {
  label: string;
  startTime: string;
  endTime: string;
  slotType: 'available' | 'blocked';
  dayOfWeek: number[];
};

const emptyForm: SlotForm = { label: '', startTime: '09:00', endTime: '10:00', slotType: 'available', dayOfWeek: [] };

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<ClinicSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SlotForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setSlots(await listClinicSlots());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: ClinicSlot) => {
    setEditId(s.id);
    setForm({
      label: s.label,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      slotType: s.slot_type,
      dayOfWeek: s.day_of_week ?? [],
    });
    setShowForm(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        label: form.label.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        slotType: form.slotType,
        dayOfWeek: form.dayOfWeek.length > 0 ? form.dayOfWeek : null,
      };
      if (editId) await updateClinicSlot(editId, payload);
      else await createClinicSlot(payload);
      setShowForm(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle
        actions={
          <button className={btnPrimary} onClick={openCreate}>
            + Add slot
          </button>
        }
      >
        Manage Clinic Slots
      </PageTitle>

      {error && <div className="mb-4"><ErrorMessage error={error} /></div>}

      {showForm && (
        <Card className="mb-4">
          <h2 className="mb-3 font-bold">{editId ? 'Edit slot' : 'New slot'}</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Label" required>
                <input
                  className={inputCls}
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Morning 1"
                  required
                />
              </Field>
              <Field label="Start time" required>
                <input
                  type="time"
                  className={inputCls}
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  required
                />
              </Field>
              <Field label="End time" required>
                <input
                  type="time"
                  className={inputCls}
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Type">
                <select
                  className={inputCls}
                  value={form.slotType}
                  onChange={(e) => setForm((f) => ({ ...f, slotType: e.target.value as 'available' | 'blocked' }))}
                >
                  <option value="available">Available</option>
                  <option value="blocked">Blocked</option>
                </select>
              </Field>
            </div>
            <Field label="Days of week (leave empty for all days)">
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        dayOfWeek: f.dayOfWeek.includes(i)
                          ? f.dayOfWeek.filter((x) => x !== i)
                          : [...f.dayOfWeek, i].sort(),
                      }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                      form.dayOfWeek.includes(i)
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex gap-2">
              <button type="submit" className={btnPrimary} disabled={busy}>
                {busy ? 'Saving…' : 'Save slot'}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : slots.length === 0 ? (
        <EmptyState>No clinic slots configured</EmptyState>
      ) : (
        <div className="space-y-2">
          {slots.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {s.label}
                  {!s.is_active && (
                    <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">inactive</span>
                  )}
                  {s.slot_type === 'blocked' && (
                    <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">blocked</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatTime(s.start_time)} – {formatTime(s.end_time)} •{' '}
                  {s.day_of_week && s.day_of_week.length > 0
                    ? s.day_of_week.map((d) => DAYS[d]).join(', ')
                    : 'Every day'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => openEdit(s)}
                >
                  Edit
                </button>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={async () => {
                    try {
                      await updateClinicSlot(s.id, { isActive: !s.is_active });
                      load();
                    } catch (err) {
                      setError(errorMessage(err));
                    }
                  }}
                >
                  {s.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteId(s.id)}
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Delete slot"
        message="Are you sure you want to delete this clinic slot?"
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          const id = deleteId!;
          setDeleteId(null);
          try {
            await deleteClinicSlot(id);
            load();
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
