'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface WorkspaceOption {
  value: string;
  label: string;
}

function csrfToken(): string {
  return document.cookie.split('; ').find((entry) => entry.startsWith('society_csrf='))?.split('=')[1] ?? '';
}

export function WorkspaceSwitcher({ options, current }: { options: WorkspaceOption[]; current: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(nextValue: string) {
    const [companyId, societyId = ''] = nextValue.split('|');
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/context/company', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ companyId, societyId: societyId || null }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? 'Unable to switch workspace');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (options.length === 0) {
    return <p className="text-xs text-ink-500">Platform administration</p>;
  }

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor="workspace-switcher">Active workspace</label>
      <select
        id="workspace-switcher"
        value={current}
        disabled={busy}
        onChange={(event) => void change(event.target.value)}
        className={cn('h-9 w-full rounded-lg border border-ink-200 bg-white px-2 text-xs text-ink-700', busy && 'opacity-50')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <Alert className="text-xs">{error}</Alert> : null}
    </div>
  );
}
