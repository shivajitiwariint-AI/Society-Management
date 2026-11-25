'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  status: string;
  lastLoginAt: string | null;
  companyId: string | null;
  companies: string[];
  roles: string[];
}

export function UserAdmin({ rows }: { rows: readonly AdminUserRow[] }) {
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>, row: AdminUserRow) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage(null);
    setBusyId(row.id);
    const form = new FormData(formElement);
    const csrfToken = document.cookie
      .split('; ')
      .find((item) => item.startsWith('society_csrf='))
      ?.split('=')[1] ?? '';
    try {
      const response = await fetch(`/api/v1/users/${row.id}/password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrfToken) },
        body: JSON.stringify({
          newPassword: String(form.get('newPassword') ?? ''),
          reason: String(form.get('reason') ?? ''),
        }),
      });
      const body = (await response.json()) as {
        error?: { message?: string };
        sessionsRevoked?: number;
      };
      if (!response.ok) {
        setMessage({ tone: 'error', text: body.error?.message ?? 'Password reset failed.' });
        return;
      }
      setMessage({
        tone: 'success',
        text: `Password reset for ${row.email}. ${body.sessionsRevoked ?? 0} active session(s) revoked.`,
      });
      formElement.reset();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {rows.length === 0 ? <Alert tone="info">No company users are registered yet.</Alert> : null}
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-ink-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{row.name || row.email}</p>
              <p className="text-sm text-ink-500">{row.email}</p>
              <p className="mt-1 text-xs text-ink-500">
                {row.companies.join(', ') || 'No company'} · {row.roles.join(', ') || 'No company role'} · {row.status}
              </p>
              {row.companyId ? (
                <Link href={`/companies/${row.companyId}/users`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                  Manage in company <ArrowUpRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
            <form onSubmit={(event) => void submit(event, row)} className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
              <div className="min-w-48 flex-1">
                <Label htmlFor={`password-${row.id}`}>New password</Label>
                <Input id={`password-${row.id}`} name="newPassword" type="password" required minLength={8} />
              </div>
              <div className="min-w-48 flex-1">
                <Label htmlFor={`reason-${row.id}`}>Audit reason</Label>
                <Input id={`reason-${row.id}`} name="reason" required minLength={5} placeholder="Support ticket or request" />
              </div>
              <Button type="submit" variant="outline" disabled={busyId === row.id}>
                {busyId === row.id ? 'Resetting…' : 'Reset password'}
              </Button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
