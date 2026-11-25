'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Download, FileSpreadsheet, Paperclip, Trash2, Upload } from 'lucide-react';
import {
  EXPENSE_ATTACHMENT_KINDS,
  EXPENSE_ATTACHMENT_LABELS,
  MAINTENANCE_EXPENSE_CATEGORIES,
  type ExpenseAttachmentKind,
  type MaintenanceExpenseCategory,
} from '@society/shared';
import {
  createMaintenanceExpenseSchema,
  type CreateMaintenanceExpenseInput,
} from '@society/validation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { csrfToken } from '@/lib/client/csrf';
import type { ExpenseListView, ExpenseView } from '@/lib/services/maintenance-expense-service';

interface SocietyOption {
  id: string;
  name: string;
  city: string | null;
}

interface ExpenseWorkspaceProps {
  societies: readonly SocietyOption[];
  societyId: string;
  categories: readonly MaintenanceExpenseCategory[];
  vendors: readonly { id: string; name: string }[];
  currencyCode: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  initial: ExpenseListView;
}

interface Filters {
  monthFrom: string;
  monthTo: string;
  category: string;
  source: string;
  search: string;
}

type Message = { tone: 'error' | 'success'; text: string };
type FormValues = z.input<typeof createMaintenanceExpenseSchema>;

const EMPTY_FILTERS: Filters = { monthFrom: '', monthTo: '', category: '', source: '', search: '' };
const selectClass =
  'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 disabled:opacity-50';

function formatCurrency(value: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currencyCode} ${value}`;
  }
}

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  'Common Area Electricity': 'Electricity',
  'Plumbing & Sanitary Repairs': 'Plumbing',
  'Lift Maintenance / AMC': 'Lift AMC',
  'Garbage Collection': 'Garbage',
  'Housekeeping': 'Housekeeping',
  'Security Services': 'Security',
  'Water / STP / Pump Maintenance': 'Water / STP',
  'DG / Generator Maintenance': 'DG',
  'Fire Safety & Equipment': 'Fire Safety',
  'Common Area Repairs': 'Repairs',
  'Pest Control': 'Pest Control',
  'Miscellaneous Society Expenses': 'Misc',
};

function shortCategory(category: string): string {
  return CATEGORY_SHORT_LABELS[category] ?? category;
}

interface PivotRow {
  month?: string;
  year?: string;
  total: string;
  categories: Record<string, string>;
}

function PivotTable({ label, rows, currencyCode }: { label: string; rows: PivotRow[]; currencyCode: string }) {
  const [sortKey, setSortKey] = useState('label');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const rowLabel = (row: PivotRow) => row.month ?? row.year ?? '';

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = rows.filter((row) => !query || rowLabel(row).toLowerCase().includes(query));
    const value = (row: PivotRow): string | number => {
      if (sortKey === 'label') return rowLabel(row);
      if (sortKey === 'total') return Number(row.total) || 0;
      return Number(row.categories[sortKey] ?? 0) || 0;
    };
    return [...list].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const result = typeof av === 'string' ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
      return sortDir === 'asc' ? result : -result;
    });
  }, [rows, search, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIcon = (key: string) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const headerCell = (text: string, key: string, align: 'left' | 'right' = 'right', title?: string) => (
    <th key={key} className={`sticky top-0 z-20 border-b-2 border-brand-300 bg-brand-600 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white ${align === 'left' ? 'sticky left-0 z-30 text-left' : 'text-right'} whitespace-nowrap`} style={{ color: '#ffffff' }} title={title ?? text} aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="inline-flex w-full items-center gap-1 text-white hover:text-white" style={{ color: '#ffffff' }} onClick={() => toggleSort(key)}>
        {align === 'right' ? <span className="flex-1" /> : null}
        {text}<span className="text-[11px] opacity-80">{sortIcon(key)}</span>
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Filter ${label.toLowerCase()}…`}
          aria-label={`Filter ${label}`}
          className="h-9 w-full max-w-xs rounded-lg border border-ink-200 px-3 text-xs"
        />
        <span className="text-xs text-ink-500">
          {visible.length} of {rows.length} rows · sorted by {sortKey === 'label' ? label : sortKey === 'total' ? 'Total' : shortCategory(sortKey)} {sortDir === 'asc' ? '↑' : '↓'}
        </span>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-ink-200">
        <table className="w-full min-w-[1180px] border-collapse text-xs" data-table-no-tools="true">
          <thead className="text-[10px] uppercase tracking-wide text-ink-500">
            <tr>
              {headerCell(label, 'label', 'left')}
              {MAINTENANCE_EXPENSE_CATEGORIES.map((category) => headerCell(shortCategory(category), category, 'right', category))}
              {headerCell('Total', 'total')}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={rowLabel(row)} className={`border-b border-ink-100 transition-colors hover:bg-brand-50/60 ${index % 2 === 1 ? 'bg-ink-50/50' : 'bg-white'}`}>
                <th scope="row" className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left font-semibold text-ink-800">{rowLabel(row)}</th>
                {MAINTENANCE_EXPENSE_CATEGORIES.map((category) => (
                  <td key={category} className="px-3 py-2 text-right tabular-nums text-ink-700">
                    {formatCurrency(row.categories[category] ?? '0.00', currencyCode)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-bold tabular-nums text-brand-700">
                  {formatCurrency(row.total, currencyCode)}
                </td>
              </tr>
            ))}
            {visible.length === 0 ? <tr><td colSpan={14} className="py-8 text-center text-ink-500">No rows match your filter.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExpenseWorkspace({
  societies,
  societyId,
  categories,
  vendors,
  currencyCode,
  canCreate,
  canUpdate,
  canDelete,
  initial,
}: ExpenseWorkspaceProps) {
  const router = useRouter();
  const [selectedSocietyId, setSelectedSocietyId] = useState(societyId);
  const [data, setData] = useState<ExpenseListView>(initial);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    sheetName: string | null;
    rowCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
    preview: Array<{ month: string; category: string; vendorPayee: string | null; voucherRef: string | null; amount: string }>;
  } | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [attachmentExpense, setAttachmentExpense] = useState<{ id: string; label: string } | null>(null);
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    kind: string;
    createdAt: string;
  }>>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const form = useForm<FormValues, unknown, CreateMaintenanceExpenseInput>({
    resolver: zodResolver(createMaintenanceExpenseSchema),
    defaultValues: {
      month: new Date().toISOString().slice(0, 7),
      category: categories[0] ?? 'Common Area Electricity',
      vendorPayee: '',
      vendorRecordId: undefined,
      voucherRef: '',
      amount: 0,
      remarks: '',
    },
  });

  const load = async (
    nextFilters: Filters = filters,
    nextPage = page,
    nextSocietyId = selectedSocietyId,
  ): Promise<void> => {
    const params = new URLSearchParams();
    if (nextFilters.monthFrom) params.set('monthFrom', nextFilters.monthFrom);
    if (nextFilters.monthTo) params.set('monthTo', nextFilters.monthTo);
    if (nextFilters.category) params.set('category', nextFilters.category);
    if (nextFilters.source) params.set('source', nextFilters.source);
    if (nextFilters.search) params.set('search', nextFilters.search);
    params.set('page', String(nextPage));
    params.set('pageSize', '20');

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/societies/${nextSocietyId}/expenses?${params.toString()}`,
        { cache: 'no-store' },
      );
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? 'Unable to load maintenance expenses');
      }
      setData((await response.json()) as ExpenseListView);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load maintenance expenses');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    void load(next, 1, selectedSocietyId);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    void load(EMPTY_FILTERS, 1, selectedSocietyId);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    void load(filters, nextPage, selectedSocietyId);
  };

  const previewWorkbook = async (file: File) => {
    setImportBusy(true);
    setImportPreview(null);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`/api/v1/societies/${selectedSocietyId}/expenses/import/preview`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
        body,
      });
      const payload = await response.json() as {
        error?: { message?: string };
        sheetName?: string;
        rowCount?: number;
        errorCount?: number;
        errors?: Array<{ row: number; message: string }>;
        preview?: Array<{ month: string; category: string; vendorPayee: string | null; voucherRef: string | null; amount: string }>;
      };
      if (!response.ok) throw new Error(payload.error?.message ?? 'Unable to read workbook');
      setImportPreview({
        sheetName: payload.sheetName ?? null,
        rowCount: payload.rowCount ?? 0,
        errorCount: payload.errorCount ?? 0,
        errors: payload.errors ?? [],
        preview: payload.preview ?? [],
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to read workbook');
    } finally {
      setImportBusy(false);
    }
  };

  const commitImport = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', importFile);
      const response = await fetch(`/api/v1/societies/${selectedSocietyId}/expenses/import`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
        body,
      });
      const payload = await response.json() as {
        error?: { message?: string };
        created?: number;
        updated?: number;
        skipped?: number;
      };
      if (!response.ok) throw new Error(payload.error?.message ?? 'Unable to import workbook');
      setMessage({ tone: 'success', text: `Imported ${payload.created ?? 0} new and updated ${payload.updated ?? 0} rows (${payload.skipped ?? 0} skipped).` });
      setImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
      void load(filters, 1, selectedSocietyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to import workbook');
    } finally {
      setImportBusy(false);
    }
  };

  const loadSample = async () => {
    if (!window.confirm('Load the 672 illustrative OVH sample rows into this society? Existing sample rows will be updated.')) return;
    setImportBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/societies/${selectedSocietyId}/expenses/sample`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
      });
      const payload = await response.json() as {
        error?: { message?: string };
        created?: number;
        updated?: number;
      };
      if (!response.ok) throw new Error(payload.error?.message ?? 'Unable to load sample data');
      setMessage({ tone: 'success', text: `Loaded ${payload.created ?? 0} new and updated ${payload.updated ?? 0} sample rows.` });
      void load(filters, 1, selectedSocietyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load sample data');
    } finally {
      setImportBusy(false);
    }
  };

  const refreshAttachments = async (expenseId: string) => {
    const response = await fetch(`/api/v1/expenses/${expenseId}/attachments`, {
      headers: { 'x-csrf-token': csrfToken() },
    });
    const payload = await response.json() as {
      error?: { message?: string };
      items?: Array<{ id: string; fileName: string; mimeType: string; size: number; kind: string; createdAt: string }>;
    };
    if (!response.ok) throw new Error(payload.error?.message ?? 'Unable to load documents');
    setAttachments(payload.items ?? []);
  };

  const openAttachments = async (expense: ExpenseView) => {
    setAttachmentExpense({ id: expense.id, label: `${expense.category} · ${expense.month}` });
    setAttachmentBusy(true);
    setError(null);
    try {
      await refreshAttachments(expense.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load documents');
    } finally {
      setAttachmentBusy(false);
    }
  };

  const uploadAttachment = async (file: File, kind: ExpenseAttachmentKind) => {
    if (!attachmentExpense) return;
    setAttachmentBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      const response = await fetch(`/api/v1/expenses/${attachmentExpense.id}/attachments`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
        body,
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? 'Unable to upload document');
      await refreshAttachments(attachmentExpense.id);
      void load(filters, page, selectedSocietyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to upload document');
    } finally {
      setAttachmentBusy(false);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!attachmentExpense || !window.confirm('Delete this supporting document?')) return;
    setAttachmentBusy(true);
    try {
      const response = await fetch(`/api/v1/expenses/${attachmentExpense.id}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (!response.ok) throw new Error('Unable to delete document');
      await refreshAttachments(attachmentExpense.id);
      void load(filters, page, selectedSocietyId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete document');
    } finally {
      setAttachmentBusy(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(null);
    const endpoint = editingId
      ? `/api/v1/expenses/${editingId}?societyId=${selectedSocietyId}`
      : `/api/v1/societies/${selectedSocietyId}/expenses`;
    try {
      const response = await fetch(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setMessage({ tone: 'error', text: body.error?.message ?? 'Unable to save expense' });
        return;
      }
      setMessage({ tone: 'success', text: editingId ? 'Expense updated.' : 'Expense recorded.' });
      form.reset({
        month: new Date().toISOString().slice(0, 7),
        category: categories[0] ?? 'Common Area Electricity',
        vendorPayee: '',
        vendorRecordId: undefined,
        voucherRef: '',
        amount: 0,
        remarks: '',
      });
      setEditingId(null);
      setSelectedVendorId('');
      setPage(1);
      await load(filters, 1, selectedSocietyId);
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    }
  });

  const startEdit = (row: ExpenseView) => {
    form.reset({
      month: row.month,
      category: row.category as MaintenanceExpenseCategory,
      vendorPayee: row.vendorPayee ?? '',
      vendorRecordId: row.vendorRecordId ?? undefined,
      voucherRef: row.voucherRef ?? '',
      amount: Number(row.amount),
      remarks: row.remarks ?? '',
    });
    setSelectedVendorId(row.vendorRecordId ?? '');
    setEditingId(row.id);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedVendorId('');
    form.reset();
  };

  const removeExpense = async (row: ExpenseView) => {
    if (!window.confirm(`Delete ${row.category} for ${row.month}?`)) return;
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/expenses/${row.id}?societyId=${selectedSocietyId}`,
        {
          method: 'DELETE',
          headers: { 'x-csrf-token': csrfToken() },
        },
      );
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? 'Unable to delete expense');
      }
      if (editingId === row.id) cancelEdit();
      setPage(1);
      await load(filters, 1, selectedSocietyId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete expense');
    }
  };

  const changeSociety = (nextSocietyId: string) => {
    setSelectedSocietyId(nextSocietyId);
    setEditingId(null);
    setPage(1);
    void load(filters, 1, nextSocietyId);
    router.replace(`/maintenance-expenses?societyId=${nextSocietyId}`, { scroll: false });
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Society</CardTitle>
          <div className="w-full sm:w-80">
            <select
              aria-label="Society"
              className={selectClass}
              value={selectedSocietyId}
              onChange={(event) => changeSociety(event.target.value)}
            >
              {societies.map((society) => (
                <option key={society.id} value={society.id}>
                  {society.name}
                  {society.city ? ` — ${society.city}` : ''}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="month-from">From month</Label>
              <Input id="month-from" type="month" value={filters.monthFrom} onChange={(event) => applyFilter('monthFrom', event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="month-to">To month</Label>
              <Input id="month-to" type="month" value={filters.monthTo} onChange={(event) => applyFilter('monthTo', event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category-filter">Category</Label>
              <select
                id="category-filter"
                className={selectClass}
                value={filters.category}
                onChange={(event) => applyFilter('category', event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="source-filter">Source</Label>
              <select
                id="source-filter"
                className={selectClass}
                value={filters.source}
                onChange={(event) => applyFilter('source', event.target.value)}
              >
                <option value="">All sources</option>
                <option value="MANUAL">Manual</option>
                <option value="IMPORTED">Imported</option>
                <option value="SAMPLE">Sample workbook</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="expense-search">Search</Label>
              <Input
                id="expense-search"
                placeholder="Vendor, voucher, remarks"
                value={filters.search}
                onChange={(event) => applyFilter('search', event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>
            <span className="text-xs text-ink-500">
              {loading ? 'Loading…' : `${data.total} record${data.total === 1 ? '' : 's'}`}
            </span>
          </div>
          {error ? <Alert>{error}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workbook tools</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { setImportOpen(true); setImportFile(null); setImportPreview(null); }}>
            <Upload className="h-4 w-4" /> Import workbook
          </Button>
          {canCreate ? (
            <Button variant="outline" size="sm" disabled={importBusy} onClick={loadSample}>
              <FileSpreadsheet className="h-4 w-4" /> Load sample data
            </Button>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500">Export</span>
            {(['detail', 'monthly', 'yearly', 'category'] as const).map((view) => (
              <a
                key={view}
                className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                href={`/api/v1/societies/${selectedSocietyId}/expenses/export?view=${view}&format=xlsx`}
              >
                <Download className="mr-1 inline h-3.5 w-3.5" />
                {view === 'detail' ? 'Detail' : view === 'monthly' ? 'Month-wise' : view === 'yearly' ? 'FY-wise' : 'Category'}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {(canCreate || canUpdate) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit expense' : 'Record maintenance expense'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" noValidate>
              {message ? <div className="sm:col-span-2 lg:col-span-4">{message.tone === 'error' ? <Alert>{message.text}</Alert> : <Alert tone="success">{message.text}</Alert>}</div> : null}
              <div className="space-y-1">
                <Label htmlFor="expense-month">Month</Label>
                <Input id="expense-month" type="month" {...form.register('month')} />
                {form.formState.errors.month ? <p className="text-xs text-red-700">{form.formState.errors.month.message}</p> : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="expense-category">Category</Label>
                <select id="expense-category" className={selectClass} {...form.register('category')}>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="expense-amount">Amount ({currencyCode})</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...form.register('amount', { valueAsNumber: true })}
                />
                {form.formState.errors.amount ? <p className="text-xs text-red-700">{form.formState.errors.amount.message}</p> : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="expense-voucher">Voucher / bill ref</Label>
                <Input id="expense-voucher" {...form.register('voucherRef')} />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="expense-vendor">Vendor / payee</Label>
                {vendors.length > 0 ? (
                  <select
                    id="expense-vendor-select"
                    className={selectClass}
                    value={selectedVendorId}
                    onChange={(event) => {
                      const vendorId = event.target.value;
                      const vendor = vendors.find((item) => item.id === vendorId);
                      setSelectedVendorId(vendorId);
                      form.setValue('vendorRecordId', vendorId || undefined, { shouldDirty: true });
                      form.setValue('vendorPayee', vendor?.name ?? '', { shouldDirty: true });
                    }}
                  >
                    <option value="">Manual entry…</option>
                    {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                  </select>
                ) : null}
                <Input
                  id="expense-vendor"
                  {...form.register('vendorPayee', {
                    onChange: () => {
                      setSelectedVendorId('');
                      form.setValue('vendorRecordId', undefined);
                    },
                  })}
                  placeholder="Vendor or payee name"
                />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="expense-remarks">Remarks</Label>
                <Input id="expense-remarks" {...form.register('remarks')} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving…' : editingId ? 'Update expense' : 'Add expense'}
                </Button>
                {editingId ? <Button type="button" variant="outline" onClick={cancelEdit}>Cancel edit</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="space-y-1"><p className="text-xs uppercase tracking-wide text-ink-500">Total</p><p className="text-xl font-semibold tabular-nums">{formatCurrency(data.summary.total, currencyCode)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1"><p className="text-xs uppercase tracking-wide text-ink-500">Average / month</p><p className="text-xl font-semibold tabular-nums">{formatCurrency(data.summary.averageMonthly, currencyCode)}</p></CardContent></Card>
        <Card><CardContent className="space-y-1"><p className="text-xs uppercase tracking-wide text-ink-500">Months</p><p className="text-xl font-semibold tabular-nums">{data.summary.monthCount}</p></CardContent></Card>
        <Card><CardContent className="space-y-1"><p className="text-xs uppercase tracking-wide text-ink-500">Categories</p><p className="text-xl font-semibold tabular-nums">{data.summary.categoryCount}</p></CardContent></Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Month-wise summary</CardTitle></CardHeader>
          <CardContent>
            <PivotTable label="Month" rows={data.summary.monthly} currencyCode={currencyCode} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Financial year summary</CardTitle></CardHeader>
            <CardContent>
              <PivotTable label="FY (Apr–Mar)" rows={data.summary.yearly} currencyCode={currencyCode} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Category-wise summary</CardTitle></CardHeader>
            <CardContent className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-50 text-[10px] uppercase tracking-wide text-ink-500">
                  <tr><th className="py-2 text-left">Category</th><th className="py-2 text-right">Total</th></tr>
                </thead>
                <tbody>
                  {data.summary.byCategory.map((row, index) => (
                    <tr key={row.category} className={`border-b border-ink-100 ${index % 2 === 1 ? 'bg-ink-50/50' : ''}`}>
                      <td className="py-2">{row.category}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{formatCurrency(row.total, currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Expense detail</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="py-2">Month</th>
                <th className="py-2">Category</th>
                <th className="py-2">Vendor / payee</th>
                <th className="py-2">Voucher</th>
                <th className="py-2 text-center">Docs</th>
                <th className="py-2">Source</th>
                <th className="py-2 text-right">Amount</th>
                {(canUpdate || canDelete) ? <th className="py-2 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-t border-ink-100">
                  <td className="py-2 font-medium">{row.month}</td>
                  <td className="py-2">{row.category}</td>
                  <td className="py-2">{row.vendorPayee ?? '—'}</td>
                  <td className="py-2">{row.voucherRef ?? '—'}</td>
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50"
                      onClick={() => void openAttachments(row)}
                    >
                      <Paperclip className="h-3.5 w-3.5" /> {row.attachmentCount}
                    </button>
                  </td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${row.source === 'SAMPLE' ? 'bg-amber-100 text-amber-800' : 'bg-ink-100 text-ink-700'}`}>
                      {row.source}
                    </span>
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(row.amount, currencyCode)}</td>
                  {(canUpdate || canDelete) ? (
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate ? <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>Edit</Button> : null}
                        {canDelete ? <Button variant="ghost" size="sm" onClick={() => void removeExpense(row)}>Delete</Button> : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {data.items.length === 0 ? <tr><td colSpan={canUpdate || canDelete ? 8 : 7} className="py-6 text-center text-ink-500">No expenses found.</td></tr> : null}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-ink-500">Page {data.page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => changePage(Math.max(1, page - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => changePage(Math.min(totalPages, page + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {attachmentExpense ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" role="dialog" aria-modal="true" aria-label="Supporting documents">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-ink-900">Supporting documents</h2>
            <p className="mt-1 text-sm text-ink-500">{attachmentExpense.label}</p>
            <p className="mt-2 text-xs leading-5 text-ink-500">
              Keep bills, vendor invoices, AMC agreements, work orders, payment approvals, bank statements and receipts against this expense.
            </p>

            {canUpdate ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="file"
                  accept="application/pdf,image/*,.xlsx,.xls,.csv"
                  className="block w-full text-xs text-ink-700"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    const selected = (document.getElementById('attachment-kind') as HTMLSelectElement | null)?.value ?? 'BILL';
                    if (file) void uploadAttachment(file, selected as ExpenseAttachmentKind);
                    event.target.value = '';
                  }}
                  disabled={attachmentBusy}
                />
                <select
                  aria-label="Document kind"
                  className={selectClass}
                  defaultValue="BILL"
                  id="attachment-kind"
                  disabled={attachmentBusy}
                >
                  {EXPENSE_ATTACHMENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>{EXPENSE_ATTACHMENT_LABELS[kind]}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-4 max-h-72 space-y-2 overflow-auto">
              {attachments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-ink-200 p-4 text-center text-sm text-ink-500">
                  No supporting documents uploaded yet.
                </p>
              ) : attachments.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-ink-200 p-2.5">
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{item.fileName}</p>
                    <p className="text-xs text-ink-500">
                      {EXPENSE_ATTACHMENT_LABELS[item.kind as ExpenseAttachmentKind] ?? item.kind} · {(item.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <a
                    className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                    href={`/api/v1/expenses/${attachmentExpense.id}/attachments/${item.id}`}
                    download={item.fileName}
                  >
                    Download
                  </a>
                  {canUpdate ? (
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${item.fileName}`}
                      onClick={() => void deleteAttachment(item.id)}
                      disabled={attachmentBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setAttachmentExpense(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4" role="dialog" aria-modal="true" aria-label="Import expense workbook">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-ink-900">Import expense workbook</h2>
            <p className="mt-2 text-sm text-ink-500">
              Choose an OVH-style <code>.xlsx</code> workbook. The &ldquo;Monthly Expense Detail&rdquo; sheet is read using its Month, Category, Vendor, Voucher, Amount and Remarks columns.
            </p>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-4 block w-full text-sm text-ink-700"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImportFile(file);
                setImportPreview(null);
                if (file) void previewWorkbook(file);
              }}
            />
            {importBusy ? <p className="mt-3 text-sm text-ink-500">Reading workbook…</p> : null}
            {importPreview ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-ink-900">
                  Sheet: {importPreview.sheetName ?? '—'} · {importPreview.rowCount} valid rows · {importPreview.errorCount} skipped
                </p>
                {importPreview.errors.length > 0 ? (
                  <div className="max-h-28 overflow-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    {importPreview.errors.slice(0, 10).map((item) => <p key={item.row}>Row {item.row}: {item.message}</p>)}
                  </div>
                ) : null}
                <div className="max-h-56 overflow-auto rounded-lg border border-ink-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ink-50 text-ink-500">
                      <tr><th className="px-2 py-2">Month</th><th className="px-2 py-2">Category</th><th className="px-2 py-2">Voucher</th><th className="px-2 py-2 text-right">Amount</th></tr>
                    </thead>
                    <tbody>
                      {importPreview.preview.map((row, index) => (
                        <tr key={`${row.voucherRef ?? row.month}-${index}`} className="border-t border-ink-100">
                          <td className="px-2 py-1.5">{row.month}</td>
                          <td className="px-2 py-1.5">{row.category}</td>
                          <td className="px-2 py-1.5">{row.voucherRef ?? '—'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(row.amount, currencyCode)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={!importFile || !importPreview || importPreview.rowCount === 0 || importBusy || !canCreate} onClick={() => void commitImport()}>
                Import {importPreview?.rowCount ?? 0} rows
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
