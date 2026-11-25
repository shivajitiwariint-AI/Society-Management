'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface SystemSettingRow {
  key: string;
  displayValue: string;
  isSecret: boolean;
  updatedAt: string | null;
}

export function SystemSettingEditor({ settings }: { settings: readonly SystemSettingRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>, setting: SystemSettingRow) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const rawValue = String(data.get('value') ?? '').trim();
    const reason = String(data.get('reason') ?? '').trim();
    if (reason.length < 5) {
      setMessage({ tone: 'error', text: 'Provide an audit reason of at least 5 characters.' });
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(rawValue);
    } catch {
      setMessage({ tone: 'error', text: 'Value must be valid JSON (for example "IN", 10 or {"key": true}).' });
      return;
    }
    setBusyKey(setting.key);
    setMessage(null);
    const csrfToken = decodeURIComponent(
      document.cookie.split('; ').find((entry) => entry.startsWith('society_csrf='))?.split('=')[1] ?? '',
    );
    try {
      const response = await fetch('/api/v1/system-settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ key: setting.key, value, reason }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage({ tone: 'error', text: body.error?.message ?? 'Unable to update the setting.' });
        return;
      }
      setMessage({ tone: 'success', text: `${setting.key} updated and audited.` });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyKey(null);
    }
  }

  if (settings.length === 0) {
    return <Alert tone="info">No platform settings have been seeded yet.</Alert>;
  }

  return (
    <div className="space-y-4">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {settings.map((setting) => (
        <div key={setting.key} className="data-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold tracking-[-0.015em] text-ink-900">{setting.key}</p>
              <p className="mt-1 text-xs text-ink-500">
                {setting.isSecret
                  ? 'Secret value hidden · cannot be edited here'
                  : `Last updated ${setting.updatedAt ? new Date(setting.updatedAt).toLocaleString('en-IN') : 'never'}`}
              </p>
            </div>
            {setting.isSecret ? <span className="status-pill status-pill-warning">Secret</span> : null}
          </div>
          {setting.isSecret ? null : (
            <form onSubmit={(event) => void save(event, setting)} className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <Label htmlFor={`value-${setting.key}`}>JSON value</Label>
                <Input id={`value-${setting.key}`} name="value" defaultValue={setting.displayValue} />
              </div>
              <div className="min-w-48 flex-1">
                <Label htmlFor={`reason-${setting.key}`}>Reason for change</Label>
                <Input id={`reason-${setting.key}`} name="reason" minLength={5} maxLength={500} placeholder="Audited reason" />
              </div>
              <Button type="submit" size="sm" disabled={busyKey === setting.key}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
