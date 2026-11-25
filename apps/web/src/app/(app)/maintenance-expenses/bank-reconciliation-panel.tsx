'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { csrfToken } from '@/lib/client/csrf';

interface BankTx {
  id: string;
  transactionDate: string;
  description: string | null;
  reference: string | null;
  amount: string;
  accountRef: string | null;
}
interface Payment {
  id: string;
  expenseId: string;
  amount: string;
  paidAt: string;
  method: string;
}

export function BankReconciliationPanel({ societyId, canManage }: { societyId: string; canManage: boolean }) {
  const router = useRouter();
  const [bank, setBank] = useState<BankTx[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [matches, setMatches] = useState<Array<{ id: string; amount: string; status: string }>>([]);
  const [paymentId, setPaymentId] = useState('');
  const [bankId, setBankId] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txAmount, setTxAmount] = useState('');
  const [txReference, setTxReference] = useState('');

  const load = async () => {
    const headers = { 'x-csrf-token': csrfToken() };
    const [b, p, r] = await Promise.all([
      fetch(`/api/v1/societies/${societyId}/bank-transactions`, { headers }),
      fetch(`/api/v1/societies/${societyId}/expense-payments`, { headers }),
      fetch(`/api/v1/societies/${societyId}/reconciliations`, { headers }),
    ]);
    if (b.ok) setBank(((await b.json()) as { items: BankTx[] }).items ?? []);
    if (p.ok) setPayments(((await p.json()) as { items: Payment[] }).items ?? []);
    if (r.ok) setMatches(((await r.json()) as { items: Array<{ id: string; amount: string; status: string }> }).items ?? []);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId]);

  async function addTransaction() {
    setBusy(true);
    try {
      await fetch(`/api/v1/societies/${societyId}/bank-transactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({
          transactionDate: new Date(`${txDate}T00:00:00Z`).toISOString(),
          amount: Number(txAmount),
          reference: txReference || undefined,
          description: 'Imported bank statement entry',
        }),
      });
      setShowForm(false);
      setTxAmount('');
      setTxReference('');
      await load();
    } finally { setBusy(false); }
  }

  async function match() {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/societies/${societyId}/reconciliations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ paymentId, bankTransactionId: bankId, amount: Number(payment.amount) }),
      });
      setPaymentId('');
      setBankId('');
      await load();
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <Card id="reconciliation" className="scroll-mt-24 lg:col-span-2">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Bank reconciliation</CardTitle>
        {canManage ? <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4" /> Add bank transaction</Button> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <div className="grid gap-3 rounded-lg border border-ink-200 p-3 sm:grid-cols-3">
            <input type="date" className="h-10 rounded-lg border border-ink-200 px-3 text-sm" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
            <input type="number" min="0.01" step="0.01" placeholder="Amount" className="h-10 rounded-lg border border-ink-200 px-3 text-sm" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
            <input placeholder="Reference" className="h-10 rounded-lg border border-ink-200 px-3 text-sm" value={txReference} onChange={(e) => setTxReference(e.target.value)} />
            <Button size="sm" disabled={busy || Number(txAmount) <= 0} onClick={() => void addTransaction()}>Save transaction</Button>
          </div>
        ) : null}

        {canManage && bank.length > 0 && payments.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3 rounded-lg bg-brand-50/60 p-3">
            <label className="space-y-1 text-xs font-medium text-ink-700">
              Payment
              <select className="h-9 max-w-xs rounded-lg border border-ink-200 px-2 text-xs" value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
                <option value="">Select payment</option>
                {payments.map((p) => <option key={p.id} value={p.id}>₹{Number(p.amount).toFixed(2)} · {p.method} · {p.paidAt.slice(0, 10)}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-ink-700">
              Bank transaction
              <select className="h-9 max-w-xs rounded-lg border border-ink-200 px-2 text-xs" value={bankId} onChange={(e) => setBankId(e.target.value)}>
                <option value="">Select transaction</option>
                {bank.map((b) => <option key={b.id} value={b.id}>₹{Number(b.amount).toFixed(2)} · {b.reference ?? b.transactionDate.slice(0, 10)}</option>)}
              </select>
            </label>
            <Button size="sm" disabled={busy || !paymentId || !bankId} onClick={() => void match()}><Link2 className="h-4 w-4" /> Match</Button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Bank transactions</p>
            {bank.length === 0 ? <p className="text-sm text-ink-500">No bank transactions yet.</p> : (
              <ul className="space-y-1.5">
                {bank.slice(0, 8).map((b) => (
                  <li key={b.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-xs">
                    <span>{b.transactionDate.slice(0, 10)} · {b.reference ?? b.description ?? '—'}</span>
                    <span className="font-semibold tabular-nums">₹{Number(b.amount).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Reconciled matches</p>
            {matches.length === 0 ? <p className="text-sm text-ink-500">No reconciliations yet.</p> : (
              <ul className="space-y-1.5">
                {matches.slice(0, 8).map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span>{m.status}</span>
                    <span className="font-semibold tabular-nums">₹{Number(m.amount).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
