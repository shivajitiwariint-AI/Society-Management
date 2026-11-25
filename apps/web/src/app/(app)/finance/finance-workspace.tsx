'use client';

import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ListChecks, Search } from 'lucide-react';
import { ModuleRecordsPanel, ModuleSearchPanel } from '@/components/module-panels';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { csrfToken } from '@/lib/client/csrf';

interface SocietyOption { id: string; name: string; city: string | null }
type Section = 'billing' | 'payments' | 'accounting' | 'reports';
type Row = Record<string, unknown>;
type Submit = (resource: string, payload: Record<string, unknown>, id?: string, action?: string) => Promise<void>;

const selectClass = 'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900';
const inputClass = 'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900';
const today = () => new Date().toISOString().slice(0, 10);

const RESOURCES_BY_SECTION: Record<Section, string[]> = {
  billing: ['charges', 'invoices', 'dues'],
  payments: ['payments', 'refunds'],
  accounting: ['accounts', 'journals', 'periods', 'trial-balance'],
  reports: ['dues', 'trial-balance', 'invoices'],
};

const SECTION_GUIDE: Record<Section, string[]> = {
  billing: ['Create a charge type', 'Issue an invoice', 'Track dues'],
  payments: ['Record a payment', 'Approve pending receipts', 'Issue refunds if needed'],
  accounting: ['Set up chart of accounts', 'Post balanced journals', 'Lock the period'],
  reports: ['Review dues', 'Check trial balance', 'Export invoices'],
};

const FIELD_LABELS: Record<string, string> = {
  invoiceNumber: 'Invoice',
  receiptNumber: 'Receipt',
  chargeType: 'Charge type',
  periodKey: 'Period',
  totalAmount: 'Total',
  paidAmount: 'Paid',
  unitAmount: 'Unit amount',
  issueDate: 'Issued',
  dueDate: 'Due',
  paidAt: 'Paid at',
  itemCount: 'Items',
  isActive: 'Active',
  reference: 'Reference',
  accountType: 'Account type',
  entryDate: 'Date',
  description: 'Description',
  entryNumber: 'Entry',
  lockedAt: 'Locked at',
  resident: 'Resident',
  flat: 'Flat',
  method: 'Method',
  status: 'Status',
  amount: 'Amount',
  name: 'Name',
  code: 'Code',
  frequency: 'Frequency',
  debit: 'Debit',
  credit: 'Credit',
};

const HIDDEN_FIELDS = new Set(['id', 'companyId', 'societyId', 'createdAt', 'updatedAt', 'items', 'lines', 'narrative']);

async function callApi<T>(url: string, init: RequestInit = {}): Promise<{ ok: boolean; body: T }> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken(), ...(init.headers ?? {}) },
  });
  const text = await response.text();
  return { ok: response.ok, body: (text ? JSON.parse(text) : {}) as T };
}

function messageOf(body: unknown, fallback: string): string {
  const candidate = body as { error?: { message?: string } };
  return candidate.error?.message ?? fallback;
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function text(row: Row, key: string): string {
  const value = row[key];
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function money(value: string, currencyCode: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }).format(number);
  } catch {
    return `${currencyCode} ${number.toFixed(2)}`;
  }
}

function formatCell(field: string, value: unknown, currencyCode: string): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-ink-400">—</span>;
  const raw = String(value);
  if (field === 'status') {
    const tone = raw === 'PAID' || raw === 'APPROVED' || raw === 'ACTIVE' || raw === 'VERIFIED'
      ? 'bg-emerald-50 text-emerald-700'
      : raw === 'PENDING' || raw === 'PARTIAL' || raw === 'DRAFT'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-ink-100 text-ink-700';
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{raw.replace(/_/g, ' ')}</span>;
  }
  if (/amount|total|paid|balance|debit|credit/i.test(field) && !Number.isNaN(Number(raw))) {
    return <span className="tabular-nums">{money(raw, currencyCode)}</span>;
  }
  if (/date|paidAt|lockedAt/i.test(field)) return raw.slice(0, 10);
  if (field === 'isActive' || field === 'locked') return raw === 'true' ? 'Yes' : 'No';
  if (raw.length > 36) return <span title={raw}>{`${raw.slice(0, 12)}…`}</span>;
  return raw;
}

function Summary({ items }: { items: Array<{ label: string; value: string; hint?: string }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-ink-500">{item.label}</p>
            <p className="text-xl font-semibold tabular-nums text-ink-900">{item.value}</p>
            {item.hint ? <p className="text-xs text-ink-500">{item.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Guide({ section }: { section: Section }) {
  return (
    <Card className="border-brand-100 bg-brand-50/60">
      <CardContent className="flex flex-wrap items-center gap-2 pt-6 text-sm">
        <span className="mr-1 font-semibold text-brand-700">Recommended flow</span>
        {SECTION_GUIDE[section].map((step, index) => (
          <span key={step} className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{index + 1}</span>
            <span className="text-ink-700">{step}</span>
            {index < SECTION_GUIDE[section].length - 1 ? <span className="text-ink-300">→</span> : null}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}

function DataTable({ resource, rows, currencyCode }: { resource: string; rows: Row[]; currencyCode: string }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);

  const fields = useMemo(
    () => (rows[0] ? Object.keys(rows[0]).filter((key) => !HIDDEN_FIELDS.has(key)) : []),
    [rows],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query)));
  }, [rows, search]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-500">No records yet. Use the forms above to create the first one.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setLimit(20); }}
          placeholder={`Search ${resource.replace('-', ' ')}…`}
          aria-label={`Search ${resource}`}
          className="h-9 max-w-xs text-xs"
        />
        <span className="text-xs text-ink-500">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="uppercase tracking-wide text-ink-500">
            <tr>{fields.map((field) => <th key={field} className="py-2 pr-3 whitespace-nowrap">{FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, ' $1')}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.slice(0, limit).map((row, index) => (
              <tr key={text(row, 'id') || index} className="hover:bg-ink-50/60">
                {fields.map((field) => <td key={field} className="py-2 pr-3 text-ink-700">{formatCell(field, row[field], currencyCode)}</td>)}
              </tr>
            ))}
            {filtered.length === 0 ? <tr><td colSpan={Math.max(fields.length, 1)} className="py-6 text-center text-ink-500">No matching records.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {filtered.length > limit ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setLimit((value) => value + 20)}>
          Show more ({filtered.length - limit} remaining)
        </Button>
      ) : null}
    </div>
  );
}

export function FinanceWorkspace({ section, societies, societyId, initialData }: {
  section: Section;
  societies: readonly SocietyOption[];
  societyId: string;
  initialData: Record<string, Row[]>;
}) {
  const currencyCode = 'INR';
  const [selectedSocietyId, setSelectedSocietyId] = useState(societyId);
  const [data, setData] = useState<Record<string, Row[]>>(initialData);
  const [activeResource, setActiveResource] = useState<string>(RESOURCES_BY_SECTION[section][0] ?? 'invoices');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resources = RESOURCES_BY_SECTION[section];

  const load = useCallback(async () => {
    const entries = await Promise.all(resources.map(async (resource) => {
      const result = await callApi<Row[] | { error?: { message?: string } }>(
        `/api/v1/societies/${selectedSocietyId}/finance/${resource}`,
      );
      return [resource, result.ok ? asRows(result.body) : []] as const;
    }));
    setData(Object.fromEntries(entries));
  }, [resources, selectedSocietyId]);

  const submit = async (resource: string, payload: Record<string, unknown>, id?: string, action?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await callApi<{ error?: { message?: string } }>(
      `/api/v1/societies/${selectedSocietyId}/finance/${resource}`,
      { method: id ? 'PATCH' : 'POST', body: JSON.stringify(id ? { ...payload, id, action } : payload) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(messageOf(result.body, 'Unable to save record'));
      return;
    }
    setNotice('Saved successfully');
    await load();
  };

  const invoices = data.invoices ?? [];
  const payments = data.payments ?? [];
  const total = (rows: Row[], field: string) => money(
    rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0).toFixed(2),
    currencyCode,
  );

  let summary: Array<{ label: string; value: string; hint?: string }> = [];
  if (section === 'billing') {
    const outstanding = invoices.filter((row) => text(row, 'status') !== 'PAID').length;
    summary = [
      { label: 'Invoices', value: String(invoices.length) },
      { label: 'Total billed', value: total(invoices, 'totalAmount') },
      { label: 'Collected', value: total(invoices, 'paidAmount') },
      { label: 'Outstanding', value: String(outstanding), hint: 'invoices not fully paid' },
    ];
  } else if (section === 'payments') {
    const pending = payments.filter((row) => text(row, 'status') === 'PENDING').length;
    summary = [
      { label: 'Receipts', value: String(payments.length) },
      { label: 'Amount received', value: total(payments, 'amount') },
      { label: 'Pending approval', value: String(pending), hint: 'needs your review' },
      { label: 'Refunds', value: String((data.refunds ?? []).length) },
    ];
  } else if (section === 'accounting') {
    summary = [
      { label: 'Accounts', value: String((data.accounts ?? []).length) },
      { label: 'Journal entries', value: String((data.journals ?? []).length) },
      { label: 'Locked periods', value: String((data.periods ?? []).filter((row) => row.locked === true || row.locked === 'true').length) },
      { label: 'Trial balance rows', value: String((data['trial-balance'] ?? []).length) },
    ];
  } else {
    summary = [
      { label: 'Dues rows', value: String((data.dues ?? []).length) },
      { label: 'Invoices', value: String(invoices.length) },
      { label: 'Trial balance rows', value: String((data['trial-balance'] ?? []).length) },
      { label: 'Billed total', value: total(invoices, 'totalAmount') },
    ];
  }

  return (
    <div className="space-y-6">
      <ModuleSearchPanel
        icon={Search}
        title={`Search ${section === 'billing' ? 'billing' : section === 'accounting' ? 'accounts' : section === 'payments' ? 'payments' : 'reports'}`}
        subtitle="Filters apply automatically as you type or choose an option."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="society">Society</Label>
          <select id="society" className={selectClass} value={selectedSocietyId} onChange={(event) => { setSelectedSocietyId(event.target.value); setActiveResource(RESOURCES_BY_SECTION[section][0] ?? 'invoices'); }}>
            {societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}
          </select>
          <Button type="button" variant="outline" onClick={() => void load()}>Refresh</Button>
          <span className="ml-auto text-xs text-ink-500">Amounts shown in {currencyCode}</span>
        </div>
      </ModuleSearchPanel>

      <Guide section={section} />
      <Summary items={summary} />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {section === 'billing' ? <BillingForms busy={busy} submit={submit} charges={data.charges ?? []} /> : null}
      {section === 'payments' ? <PaymentForms busy={busy} submit={submit} payments={payments} invoices={invoices} /> : null}
      {section === 'accounting' ? <AccountingForms busy={busy} submit={submit} accounts={data.accounts ?? []} setNotice={setNotice} /> : null}

      <ModuleRecordsPanel
        icon={ListChecks}
        title={`${activeResource === 'trial-balance' ? 'Trial balance' : (FIELD_LABELS[activeResource] ?? activeResource.replace('-', ' '))} · ${(data[activeResource] ?? []).length} records`}
        subtitle="Tenant-scoped records with server-enforced permissions and a complete audit trail."
        action={
          <div className="flex flex-wrap gap-2">
            {resources.map((resource) => (
              <Button
                key={resource}
                type="button"
                size="sm"
                variant={activeResource === resource ? 'default' : 'outline'}
                onClick={() => setActiveResource(resource)}
              >
                {FIELD_LABELS[resource] ?? resource.replace('-', ' ')}
                <span className="ml-1.5 opacity-70">{(data[resource] ?? []).length}</span>
              </Button>
            ))}
          </div>
        }
      >
        <DataTable resource={activeResource} rows={data[activeResource] ?? []} currencyCode={currencyCode} />
      </ModuleRecordsPanel>
    </div>
  );
}

function BillingForms({ busy, submit, charges }: { busy: boolean; submit: Submit; charges: Row[] }) {
  const [charge, setCharge] = useState({ code: '', name: '', chargeType: 'FIXED', amount: '', frequency: 'MONTHLY' });
  const [invoice, setInvoice] = useState({ issueDate: today(), dueDate: today(), periodKey: '', description: '', amount: '' });

  const addCharge = (event: FormEvent) => {
    event.preventDefault();
    void submit('charges', { ...charge, amount: Number(charge.amount) });
    setCharge({ code: '', name: '', chargeType: 'FIXED', amount: '', frequency: 'MONTHLY' });
  };
  const addInvoice = (event: FormEvent) => {
    event.preventDefault();
    void submit('invoices', {
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      periodKey: invoice.periodKey || undefined,
      items: [{ description: invoice.description || 'Maintenance dues', quantity: 1, unitAmount: Number(invoice.amount) }],
    });
    setInvoice({ ...invoice, description: '', amount: '' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create a charge type</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={addCharge}>
            <p className="text-xs text-ink-500">Define a recurring billing head, then use it when you issue invoices.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="charge-code">Code</Label><Input id="charge-code" required placeholder="e.g. MAINT" value={charge.code} onChange={(e) => setCharge({ ...charge, code: e.target.value })} /></div>
              <div><Label htmlFor="charge-name">Name</Label><Input id="charge-name" required placeholder="e.g. Maintenance charges" value={charge.name} onChange={(e) => setCharge({ ...charge, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label htmlFor="charge-type">Type</Label><select id="charge-type" className={selectClass} value={charge.chargeType} onChange={(e) => setCharge({ ...charge, chargeType: e.target.value })}>{['FIXED', 'AREA', 'USAGE', 'ONE_TIME'].map((v) => <option key={v}>{v}</option>)}</select></div>
              <div><Label htmlFor="charge-amount">Amount</Label><Input id="charge-amount" type="number" min="0" step="0.01" required value={charge.amount} onChange={(e) => setCharge({ ...charge, amount: e.target.value })} /></div>
              <div><Label htmlFor="charge-frequency">Frequency</Label><select id="charge-frequency" className={selectClass} value={charge.frequency} onChange={(e) => setCharge({ ...charge, frequency: e.target.value })}>{['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'].map((v) => <option key={v}>{v}</option>)}</select></div>
            </div>
            <Button type="submit" disabled={busy}>Create charge</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Issue an invoice</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={addInvoice}>
            <p className="text-xs text-ink-500">Pick an existing charge to fill the description and amount automatically.</p>
            {charges.length > 0 ? (
              <div>
                <Label htmlFor="invoice-charge">Charge type</Label>
                <select
                  id="invoice-charge"
                  className={selectClass}
                  defaultValue=""
                  onChange={(event) => {
                    const selected = charges.find((row) => String(row.id) === event.target.value);
                    if (selected) setInvoice((current) => ({ ...current, description: String(selected.name ?? ''), amount: String(selected.amount ?? '') }));
                  }}
                >
                  <option value="">Choose a charge (optional)</option>
                  {charges.map((row) => <option key={String(row.id)} value={String(row.id)}>{text(row, 'name')} · ₹{text(row, 'amount')}</option>)}
                </select>
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-3">
              <div><Label htmlFor="issue-date">Issue date</Label><Input id="issue-date" type="date" required value={invoice.issueDate} onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })} /></div>
              <div><Label htmlFor="due-date">Due date</Label><Input id="due-date" type="date" required value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} /></div>
              <div><Label htmlFor="billing-period">Period</Label><Input id="billing-period" placeholder="YYYY-MM" value={invoice.periodKey} onChange={(e) => setInvoice({ ...invoice, periodKey: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="invoice-description">Description</Label><Input id="invoice-description" value={invoice.description} placeholder="What is this invoice for?" onChange={(e) => setInvoice({ ...invoice, description: e.target.value })} /></div>
            <div><Label htmlFor="invoice-amount">Amount</Label><Input id="invoice-amount" type="number" min="0" step="0.01" required value={invoice.amount} onChange={(e) => setInvoice({ ...invoice, amount: e.target.value })} /></div>
            <Button type="submit" disabled={busy}>Issue invoice</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentForms({ busy, submit, payments, invoices }: { busy: boolean; submit: Submit; payments: Row[]; invoices: Row[] }) {
  const [payment, setPayment] = useState({ invoiceId: '', amount: '', method: 'OFFLINE', reference: '', paidAt: '' });
  const [refund, setRefund] = useState({ paymentId: '', amount: '', reason: '' });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Record a payment</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            void submit('payments', {
              ...(payment.invoiceId ? { invoiceId: payment.invoiceId } : {}),
              amount: Number(payment.amount),
              method: payment.method,
              reference: payment.reference || undefined,
              paidAt: payment.paidAt || undefined,
            });
            setPayment({ invoiceId: '', amount: '', method: 'OFFLINE', reference: '', paidAt: '' });
          }}>
            <p className="text-xs text-ink-500">Link the payment to an invoice so outstanding balances update automatically.</p>
            <div>
              <Label htmlFor="payment-invoice">Invoice</Label>
              <select
                id="payment-invoice"
                className={selectClass}
                value={payment.invoiceId}
                onChange={(event) => {
                  const selected = invoices.find((row) => String(row.id) === event.target.value);
                  const outstanding = selected ? (Number(selected.totalAmount) || 0) - (Number(selected.paidAmount) || 0) : 0;
                  setPayment({ ...payment, invoiceId: event.target.value, amount: outstanding > 0 ? outstanding.toFixed(2) : payment.amount });
                }}
              >
                <option value="">No invoice (general receipt)</option>
                {invoices.map((row) => (
                  <option key={String(row.id)} value={String(row.id)}>
                    {text(row, 'invoiceNumber')} · due {money(String(Number(row.totalAmount ?? 0) - Number(row.paidAmount ?? 0)), 'INR')}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="payment-amount">Amount</Label><Input id="payment-amount" type="number" min="0" step="0.01" required value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></div>
              <div><Label htmlFor="payment-method">Method</Label><select id="payment-method" className={selectClass} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>{['OFFLINE', 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'].map((v) => <option key={v}>{v}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="payment-reference">Reference / cheque no.</Label><Input id="payment-reference" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></div>
              <div><Label htmlFor="payment-date">Paid at</Label><Input id="payment-date" type="date" value={payment.paidAt} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} /></div>
            </div>
            <Button type="submit" disabled={busy}>Record payment</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Approve & refund</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => {
            event.preventDefault();
            void submit('refunds', { amount: Number(refund.amount), reason: refund.reason }, refund.paymentId);
            setRefund({ paymentId: '', amount: '', reason: '' });
          }}>
            <div><Label htmlFor="refund-payment">Payment to refund</Label><select id="refund-payment" className={selectClass} required value={refund.paymentId} onChange={(e) => setRefund({ ...refund, paymentId: e.target.value })}><option value="">Select payment</option>{payments.map((row) => <option key={String(row.id)} value={String(row.id)}>{text(row, 'receiptNumber')} · ₹{text(row, 'amount')}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="refund-amount">Amount</Label><Input id="refund-amount" type="number" min="0" step="0.01" required value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} /></div>
              <div><Label htmlFor="refund-reason">Reason</Label><Input id="refund-reason" required value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} /></div>
            </div>
            <Button type="submit" disabled={busy}>Request refund</Button>
          </form>
          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold text-ink-900">Pending approvals</p>
            {payments.filter((row) => text(row, 'status') === 'PENDING').slice(0, 5).map((row) => (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 p-2.5 text-xs" key={String(row.id)}>
                <span className="min-w-0">
                  <span className="font-medium">{text(row, 'receiptNumber')}</span>
                  <span className="ml-2 text-ink-500">{money(String(row.amount ?? 0), 'INR')} · {text(row, 'method')}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button type="button" size="sm" disabled={busy} onClick={() => void submit('payments', { action: 'APPROVE', reason: 'Verified payment instrument' }, String(row.id))}>Approve</Button>
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void submit('payments', { action: 'REJECT', reason: 'Payment instrument rejected' }, String(row.id))}>Reject</Button>
                </span>
              </div>
            ))}
            {payments.filter((row) => text(row, 'status') === 'PENDING').length === 0 ? (
              <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">All payments are approved. Nothing needs review.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface JournalLine { accountId: string; debit: string; credit: string; narrative: string }

function AccountingForms({ busy, submit, accounts, setNotice }: { busy: boolean; submit: Submit; accounts: Row[]; setNotice: (value: string | null) => void }) {
  const [account, setAccount] = useState({ code: '', name: '', accountType: 'INCOME' });
  const emptyLine = (): JournalLine => ({ accountId: '', debit: '', credit: '', narrative: '' });
  const [journal, setJournal] = useState({ entryDate: today(), description: '', periodKey: '', lines: [emptyLine(), emptyLine()] });
  const [period, setPeriod] = useState({ periodKey: '', locked: true, reason: '' });

  const totalDebit = journal.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = journal.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  const updateLine = (index: number, patch: Partial<JournalLine>) => {
    setJournal((current) => ({
      ...current,
      lines: current.lines.map((line, position) => (position === index ? { ...line, ...patch } : line)),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>New account</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit('accounts', account); setAccount({ code: '', name: '', accountType: 'INCOME' }); }}>
              <p className="text-xs text-ink-500">Build the chart of accounts before posting journals.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="account-code">Code</Label><Input id="account-code" required placeholder="e.g. INCOME-01" value={account.code} onChange={(e) => setAccount({ ...account, code: e.target.value })} /></div>
                <div><Label htmlFor="account-name">Name</Label><Input id="account-name" required value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} /></div>
              </div>
              <div><Label htmlFor="account-type">Type</Label><select id="account-type" className={selectClass} value={account.accountType} onChange={(e) => setAccount({ ...account, accountType: e.target.value })}>{['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY'].map((v) => <option key={v}>{v}</option>)}</select></div>
              <Button type="submit" disabled={busy}>Create account</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lock a period</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit('periods', period); setPeriod({ ...period, reason: '' }); }}>
              <p className="text-xs text-ink-500">Close a month after its entries are reconciled to prevent further changes.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="period-key">Period</Label><Input id="period-key" placeholder="YYYY-MM" required value={period.periodKey} onChange={(e) => setPeriod({ ...period, periodKey: e.target.value })} /></div>
                <div><Label htmlFor="period-reason">Reason</Label><Input id="period-reason" required value={period.reason} onChange={(e) => setPeriod({ ...period, reason: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={period.locked} onChange={(e) => setPeriod({ ...period, locked: e.target.checked })} /> Lock period</label>
              <Button type="submit" disabled={busy}>Apply period status</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post a journal entry</CardTitle>
          <p className="text-xs text-ink-500">Choose accounts and enter debit/credit amounts — no JSON or account IDs needed.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!balanced) { setNotice('Debits must equal credits before posting'); return; }
            void submit('journals', {
              entryDate: journal.entryDate,
              description: journal.description,
              ...(journal.periodKey ? { periodKey: journal.periodKey } : {}),
              lines: journal.lines.map((line) => ({
                accountId: line.accountId,
                debit: Number(line.debit) || 0,
                credit: Number(line.credit) || 0,
                ...(line.narrative ? { narrative: line.narrative } : {}),
              })),
            });
            setJournal({ entryDate: today(), description: '', periodKey: '', lines: [emptyLine(), emptyLine()] });
          }}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label htmlFor="entry-date">Date</Label><Input id="entry-date" type="date" required value={journal.entryDate} onChange={(e) => setJournal({ ...journal, entryDate: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label htmlFor="entry-description">Description</Label><Input id="entry-description" required placeholder="e.g. June maintenance expenses" value={journal.description} onChange={(e) => setJournal({ ...journal, description: e.target.value })} /></div>
            </div>
            <div className="max-w-xs"><Label htmlFor="entry-period">Period (optional)</Label><Input id="entry-period" placeholder="YYYY-MM" value={journal.periodKey} onChange={(e) => setJournal({ ...journal, periodKey: e.target.value })} /></div>

            <div className="space-y-2">
              {journal.lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-ink-200 p-3 sm:grid-cols-[2fr_1fr_1fr_1.5fr_auto]">
                  <div>
                    <Label htmlFor={`line-account-${index}`}>Account</Label>
                    <select id={`line-account-${index}`} className={selectClass} required value={line.accountId} onChange={(e) => updateLine(index, { accountId: e.target.value })}>
                      <option value="">Select account</option>
                      {accounts.map((row) => <option key={String(row.id)} value={String(row.id)}>{text(row, 'code')} — {text(row, 'name')}</option>)}
                    </select>
                  </div>
                  <div><Label htmlFor={`line-debit-${index}`}>Debit</Label><Input id={`line-debit-${index}`} type="number" min="0" step="0.01" value={line.debit} onChange={(e) => updateLine(index, { debit: e.target.value, credit: '' })} /></div>
                  <div><Label htmlFor={`line-credit-${index}`}>Credit</Label><Input id={`line-credit-${index}`} type="number" min="0" step="0.01" value={line.credit} onChange={(e) => updateLine(index, { credit: e.target.value, debit: '' })} /></div>
                  <div><Label htmlFor={`line-narrative-${index}`}>Narrative</Label><Input id={`line-narrative-${index}`} value={line.narrative} onChange={(e) => updateLine(index, { narrative: e.target.value })} /></div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" size="sm" disabled={journal.lines.length <= 2} onClick={() => setJournal((current) => ({ ...current, lines: current.lines.filter((_, position) => position !== index) }))}>Remove</Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" disabled={journal.lines.length >= 40} onClick={() => setJournal((current) => ({ ...current, lines: [...current.lines, emptyLine()] }))}>+ Add line</Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-ink-50 p-3 text-sm">
              <span>Debit total: <strong className="tabular-nums">{money(totalDebit.toFixed(2), 'INR')}</strong></span>
              <span>Credit total: <strong className="tabular-nums">{money(totalCredit.toFixed(2), 'INR')}</strong></span>
              <span className={balanced ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                {balanced ? '✓ Balanced' : `Difference ${money(Math.abs(totalDebit - totalCredit).toFixed(2), 'INR')}`}
              </span>
            </div>

            <Button type="submit" disabled={busy || !balanced}>Post journal entry</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
