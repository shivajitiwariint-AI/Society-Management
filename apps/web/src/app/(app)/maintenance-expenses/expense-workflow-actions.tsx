'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CircleX, CreditCard, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { csrfToken } from '@/lib/client/csrf';

interface ExpenseActionRow {
  id: string;
  amount: string;
  paidAmount: string;
  approvalStatus: string;
  paymentStatus: string;
  createdBy: string | null;
}

type Mode = 'REJECT' | 'PAY' | null;

export function ExpenseWorkflowActions({
  expense,
  canSubmit,
  canApprove,
  canPay,
  currentUserId,
}: {
  expense: ExpenseActionRow;
  canSubmit: boolean;
  canApprove: boolean;
  canPay: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('OFFLINE');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const isOwn = Boolean(expense.createdBy && expense.createdBy === currentUserId);
  const outstanding = Math.max(0, Number(expense.amount) - Number(expense.paidAmount));
  const canDecide = canApprove && !isOwn;

  async function callWorkflow(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/expenses/${expense.id}/workflow`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to update expense');
      setMode(null);
      setReason('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/expenses/${expense.id}/payments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({
          amount: Number(amount),
          paidAt: new Date(`${paidAt}T00:00:00Z`).toISOString(),
          method,
        }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to record payment');
      setMode(null);
      setAmount('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {canSubmit && ['DRAFT', 'REJECTED'].includes(expense.approvalStatus) ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void callWorkflow('SUBMIT')}
            title="Submit for approval"
            className="inline-flex items-center gap-1 rounded-md border border-brand-200 px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            <Send className="h-3 w-3" /> Submit
          </button>
        ) : null}
        {canDecide && expense.approvalStatus === 'SUBMITTED' ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void callWorkflow('APPROVE')}
              title="Approve"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Check className="h-3 w-3" /> Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode('REJECT')}
              title="Reject"
              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <CircleX className="h-3 w-3" /> Reject
            </button>
          </>
        ) : null}
        {canPay && expense.approvalStatus === 'APPROVED' && outstanding > 0.005 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => { setAmount(outstanding.toFixed(2)); setMode('PAY'); }}
            title="Record payment"
            className="inline-flex items-center gap-1 rounded-md border border-sky-200 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
          >
            <CreditCard className="h-3 w-3" /> Pay
          </button>
        ) : null}
      </div>

      {mode ? (
        <div className="app-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) setMode(null); }}>
          <div className="app-modal-card">
            <div className="app-modal-header">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{mode === 'REJECT' ? 'Reject expense' : 'Record payment'}</h2>
                <p className="section-subtitle">
                  {mode === 'REJECT' ? 'Provide a reason for the rejection.' : `Outstanding amount ₹${outstanding.toFixed(2)}`}
                </p>
              </div>
              <button type="button" onClick={() => setMode(null)} aria-label="Close" className="rounded-lg p-2 text-ink-400 hover:bg-ink-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="app-modal-body space-y-4">
              {error ? <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
              {mode === 'REJECT' ? (
                <>
                  <label className="block space-y-1 text-xs font-medium text-ink-700">
                    Reason
                    <textarea
                      className="min-h-24 w-full rounded-lg border border-ink-200 p-2 text-sm"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why this expense is rejected"
                    />
                  </label>
                  <Button disabled={busy || !reason.trim()} onClick={() => void callWorkflow('REJECT', { reason })}>
                    Reject expense
                  </Button>
                </>
              ) : (
                <>
                  <label className="block space-y-1 text-xs font-medium text-ink-700">
                    Amount
                    <input
                      type="number"
                      min="0.01"
                      max={outstanding.toFixed(2)}
                      step="0.01"
                      className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-medium text-ink-700">
                    Method
                    <select className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                      {['OFFLINE', 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1 text-xs font-medium text-ink-700">
                    Paid at
                    <input type="date" className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                  </label>
                  <Button disabled={busy || Number(amount) <= 0 || Number(amount) > outstanding + 0.005} onClick={() => void recordPayment()}>
                    Record payment
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
