'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, ListChecks, Plus, Search, X } from 'lucide-react';
import type { OperationDefinition } from '@society/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { csrfToken } from '@/lib/client/csrf';
import type { OperationListView } from '@/lib/services/operations-service';

interface SocietyOption { id: string; name: string; city: string | null }
interface OperationWorkspaceProps {
  definition: OperationDefinition;
  societies: readonly SocietyOption[];
  societyId: string;
  initial: OperationListView;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type FormState = Record<string, string>;

const selectClass = 'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900';

function emptyForm(definition: OperationDefinition): FormState {
  const form: FormState = {
    title: '',
    description: '',
    status: definition.statusOptions[0] ?? 'ACTIVE',
    priority: definition.priorityOptions?.[0] ?? '',
    code: '',
    startAt: '',
    endAt: '',
    amount: '',
    residentId: '',
    flatId: '',
    assigneeUserId: '',
  };
  for (const field of definition.formFields ?? []) {
    form[field.key] = field.options?.[0] ?? '';
  }
  return form;
}

function errorText(body: unknown, fallback: string): string {
  const candidate = body as { error?: { message?: string } };
  return candidate.error?.message ?? fallback;
}

function statusTone(status: string): string {
  const value = status.toUpperCase();
  if (['APPROVED', 'ACTIVE', 'CHECKED_IN', 'RESOLVED', 'COMPLETED', 'CONFIRMED', 'CLOSED'].includes(value)) return 'success';
  if (['PENDING', 'IN_PROGRESS', 'ESCALATED', 'SCHEDULED', 'OPEN'].includes(value)) return 'warning';
  if (['REJECTED', 'CANCELLED', 'DECLINED'].includes(value)) return 'danger';
  return 'muted';
}

async function requestJson<T>(url: string, init: RequestInit): Promise<{ ok: boolean; body: T }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken(),
      ...(init.headers ?? {}),
    },
  });
  return { ok: response.ok, body: (await response.json()) as T };
}

export function OperationWorkspace({
  definition,
  societies,
  societyId,
  initial,
  canCreate,
  canUpdate,
  canDelete,
}: OperationWorkspaceProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedSocietyId, setSelectedSocietyId] = useState(societyId);
  const [data, setData] = useState(initial);
  const [form, setForm] = useState<FormState>(() => emptyForm(definition));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const endpoint = `/api/v1/operations/${definition.moduleKey}/${definition.resourceKey}`;
  const formFields = definition.formFields ?? [];
  const singular = definition.label.toLowerCase().replace(/s$/, '');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (formOpen && !dialog.open) dialog.showModal();
    if (!formOpen && dialog.open) dialog.close();
  }, [formOpen]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const reload = async (overrides: { societyId?: string; page?: number; search?: string; status?: string } = {}) => {
    const nextSociety = overrides.societyId ?? selectedSocietyId;
    const nextPage = overrides.page ?? page;
    const nextSearch = overrides.search ?? search;
    const nextStatus = overrides.status ?? statusFilter;
    const params = new URLSearchParams({ societyId: nextSociety, page: String(nextPage), pageSize: '20' });
    if (nextSearch) params.set('search', nextSearch);
    if (nextStatus) params.set('status', nextStatus);
    const result = await requestJson<OperationListView | { error?: { message?: string } }>(
      `${endpoint}?${params.toString()}`,
      { method: 'GET' },
    );
    if (result.ok && 'items' in result.body) setData(result.body as OperationListView);
    else setError(errorText(result.body, 'Unable to refresh records'));
  };

  const setField = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void reload({ search: value, page: 1 });
    }, 300);
  };

  const onStatusChange = (value: string) => {
    setStatusFilter(value);
    void reload({ status: value, page: 1 });
  };

  const onSocietyChange = (value: string) => {
    setSelectedSocietyId(value);
    void reload({ societyId: value, page: 1 });
  };

  const openCreate = () => {
    setForm(emptyForm(definition));
    setEditingId(null);
    setError(null);
    setNotice(null);
    setFormOpen(true);
  };

  const buildPayload = () => {
    const metadata: Record<string, string> = { societyId: selectedSocietyId };
    for (const field of formFields) {
      const value = form[field.key] ?? '';
      if (value) metadata[field.key] = value;
    }
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      status: form.status,
      priority: form.priority || undefined,
      code: definition.useCode ? form.code || undefined : undefined,
      startAt: definition.useSchedule ? form.startAt || undefined : undefined,
      endAt: definition.useSchedule ? form.endAt || undefined : undefined,
      amount: definition.useAmount && form.amount ? Number(form.amount) : undefined,
      residentId: definition.useResident ? form.residentId || undefined : undefined,
      flatId: definition.useFlat ? form.flatId || undefined : undefined,
      assigneeUserId: definition.useAssignee ? form.assigneeUserId || undefined : undefined,
      metadata,
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const payload = buildPayload();
    const url = editingId ? `${endpoint}/${editingId}` : endpoint;
    const result = await requestJson<{ error?: { message?: string }; id?: string }>(url, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify(editingId ? { id: editingId, societyId: selectedSocietyId, ...payload } : payload),
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.body, 'Unable to save record'));
      return;
    }
    setForm(emptyForm(definition));
    setEditingId(null);
    setFormOpen(false);
    setNotice(editingId ? 'Record updated' : 'Record created');
    await reload();
    router.refresh();
  };

  const edit = (item: OperationListView['items'][number]) => {
    const metadata = item.metadata;
    const next = emptyForm(definition);
    next.title = item.title;
    next.description = item.description ?? '';
    next.status = item.status;
    next.priority = item.priority ?? '';
    next.code = item.code ?? '';
    next.startAt = item.startAt ? item.startAt.slice(0, 16) : '';
    next.endAt = item.endAt ? item.endAt.slice(0, 16) : '';
    next.amount = item.amount ?? '';
    for (const field of formFields) {
      next[field.key] = typeof metadata[field.key] === 'string' ? String(metadata[field.key]) : '';
    }
    setForm(next);
    setEditingId(item.id);
    setError(null);
    setNotice(null);
    setFormOpen(true);
  };

  const changeStatus = async (id: string, status: string) => {
    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: { message?: string } }>(`${endpoint}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ societyId: selectedSocietyId, status, action: 'UPDATE' }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.body, 'Unable to change status'));
      return;
    }
    setNotice(`Status changed to ${status}`);
    await reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    setBusy(true);
    setError(null);
    const result = await requestJson<{ error?: { message?: string } }>(
      `${endpoint}/${id}?societyId=${encodeURIComponent(selectedSocietyId)}`,
      { method: 'DELETE' },
    );
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.body, 'Unable to delete record'));
      return;
    }
    setNotice('Record deleted');
    await reload();
  };

  return (
    <div className="space-y-6">
      <Card className="op-search-panel">
        <CardHeader className="flex items-center gap-3">
          <span className="op-section-icon op-section-search"><Search className="h-5 w-5" /></span>
          <div>
            <CardTitle>Search {definition.label.toLowerCase()}</CardTitle>
            <p className="section-subtitle">Filters apply automatically as you type or choose an option.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder={`Search ${definition.label.toLowerCase()}…`} value={search} onChange={(event) => onSearchChange(event.target.value)} />
            <select className={selectClass} value={statusFilter} onChange={(event) => onStatusChange(event.target.value)} aria-label="Status">
              <option value="">All statuses</option>
              {definition.statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select className={selectClass} value={selectedSocietyId} onChange={(event) => onSocietyChange(event.target.value)} aria-label="Society">
              {societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="op-list-panel">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="op-section-icon op-section-list"><ListChecks className="h-5 w-5" /></span>
            <div>
              <CardTitle>{definition.label} · {data.total} records</CardTitle>
              <p className="section-subtitle">Tenant-scoped records with workflow status and a complete audit trail.</p>
            </div>
          </div>
          {canCreate ? (
            <Button type="button" onClick={openCreate} className="shadow-[0_10px_24px_-12px_rgba(79,70,229,0.9)]">
              <Plus className="h-4 w-4" /> New {singular}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && !formOpen ? <Alert tone="error">{error}</Alert> : null}
          {notice && !formOpen ? <Alert tone="success">{notice}</Alert> : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-table-no-tools="true">
              <thead className="text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="py-2 pr-3">{definition.titleLabel}</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Schedule / amount</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-ink-900">{item.code ? `${item.code} · ` : ''}{item.title}</div>
                      <div className="text-xs text-ink-500">{item.description ?? item.resident ?? item.flat ?? '—'}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        className={`h-8 rounded-md border px-2 text-xs font-semibold op-status-select tone-${statusTone(item.status)}`}
                        value={item.status}
                        disabled={!canUpdate || busy}
                        onChange={(event) => void changeStatus(item.id, event.target.value)}
                      >
                        {definition.statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-xs text-ink-500">
                      {item.startAt ? new Date(item.startAt).toLocaleString() : item.amount ? item.amount : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate ? <Button type="button" variant="ghost" onClick={() => edit(item)}>Edit</Button> : null}
                        {canDelete ? <Button type="button" variant="ghost" onClick={() => void remove(item.id)}>Delete</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="op-empty">
                        <span className="society-empty-icon"><ClipboardList className="h-6 w-6" /></span>
                        <h3>No {definition.label.toLowerCase()} yet</h3>
                        <p>
                          Create the first record to start tracking {definition.label.toLowerCase()} for this society.
                        </p>
                        {canCreate ? (
                          <Button type="button" onClick={openCreate}>
                            <Plus className="h-4 w-4" /> New {singular}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={data.page <= 1} onClick={() => {
                const next = data.page - 1;
                setPage(next);
                void reload({ page: next });
              }}>Previous</Button>
              <Button type="button" variant="outline" disabled={data.page * data.pageSize >= data.total} onClick={() => {
                const next = data.page + 1;
                setPage(next);
                void reload({ page: next });
              }}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/50"
        aria-labelledby="operation-form-title"
        onCancel={(event) => { event.preventDefault(); setFormOpen(false); }}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                {editingId ? 'Edit record' : 'New record'}
              </p>
              <h2 id="operation-form-title" className="mt-1 text-xl font-semibold">
                {editingId ? `Edit ${singular}` : `Add ${singular}`}
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                Saved to {societies.find((society) => society.id === selectedSocietyId)?.name ?? 'the selected society'}.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
              onClick={() => setFormOpen(false)}
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6">
            {error ? <Alert tone="error">{error}</Alert> : null}
            {definition.useCode ? (
              <div className="space-y-1">
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={form.code} onChange={(event) => setField('code', event.target.value)} />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="title">{definition.titleLabel}</Label>
              <Input id="title" required value={form.title} onChange={(event) => setField('title', event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="min-h-20 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <select id="status" className={selectClass} value={form.status} onChange={(event) => setField('status', event.target.value)}>
                  {definition.statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              {definition.priorityOptions ? (
                <div className="space-y-1">
                  <Label htmlFor="priority">Priority</Label>
                  <select id="priority" className={selectClass} value={form.priority} onChange={(event) => setField('priority', event.target.value)}>
                    {definition.priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </div>
              ) : null}
            </div>
            {definition.useSchedule ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="startAt">Start</Label>
                  <Input id="startAt" type="datetime-local" value={form.startAt} onChange={(event) => setField('startAt', event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endAt">End</Label>
                  <Input id="endAt" type="datetime-local" value={form.endAt} onChange={(event) => setField('endAt', event.target.value)} />
                </div>
              </div>
            ) : null}
            {definition.useAmount ? (
              <div className="space-y-1">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setField('amount', event.target.value)} />
              </div>
            ) : null}
            {definition.useResident ? (
              <div className="space-y-1">
                <Label htmlFor="residentId">Resident ID</Label>
                <Input id="residentId" placeholder="Optional UUID" value={form.residentId} onChange={(event) => setField('residentId', event.target.value)} />
              </div>
            ) : null}
            {definition.useFlat ? (
              <div className="space-y-1">
                <Label htmlFor="flatId">Flat ID</Label>
                <Input id="flatId" placeholder="Optional UUID" value={form.flatId} onChange={(event) => setField('flatId', event.target.value)} />
              </div>
            ) : null}
            {definition.useAssignee ? (
              <div className="space-y-1">
                <Label htmlFor="assigneeUserId">Assignee user ID</Label>
                <Input id="assigneeUserId" placeholder="Optional UUID" value={form.assigneeUserId} onChange={(event) => setField('assigneeUserId', event.target.value)} />
              </div>
            ) : null}
            {formFields.map((field) => (
              <div className="space-y-1" key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.type === 'select' ? (
                  <select
                    id={field.key}
                    className={selectClass}
                    value={form[field.key] ?? ''}
                    onChange={(event) => setField(field.key, event.target.value)}
                  >
                    {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <Input
                    id={field.key}
                    type={field.type === 'number' ? 'number' : field.type === 'datetime-local' ? 'datetime-local' : 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(event) => setField(field.key, event.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || (!canCreate && !editingId) || (!!editingId && !canUpdate)}>
              {busy ? 'Saving…' : editingId ? 'Save changes' : `Create ${singular}`}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
