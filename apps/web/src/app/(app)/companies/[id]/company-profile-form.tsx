'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CompanyProfileValues {
  name: string;
  code: string;
  countryCode: string;
  currencyCode: string;
  timezone: string;
}

export function CompanyProfileForm({ companyId, initial }: { companyId: string; initial: CompanyProfileValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  function set<K extends keyof CompanyProfileValues>(key: K, value: CompanyProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const csrfToken = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('society_csrf='))
      ?.split('=')[1] ?? '';
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/profile`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-csrf-token': decodeURIComponent(csrfToken) },
        body: JSON.stringify({ ...values, reason }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage({ tone: 'error', text: body.error?.message ?? 'Unable to update the company profile.' });
        return;
      }
      setMessage({ tone: 'success', text: 'Company profile updated and recorded in the audit log.' });
      setReason('');
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-name">Company name</Label>
          <Input id="profile-name" required minLength={2} maxLength={200} value={values.name} onChange={(event) => set('name', event.target.value)} />
        </div>
        <div>
          <Label htmlFor="profile-code">Company code</Label>
          <Input id="profile-code" required minLength={2} maxLength={40} value={values.code} onChange={(event) => set('code', event.target.value.toLowerCase())} />
        </div>
        <div>
          <Label htmlFor="profile-country">Country code</Label>
          <Input id="profile-country" required minLength={2} maxLength={2} value={values.countryCode} onChange={(event) => set('countryCode', event.target.value.toUpperCase())} />
        </div>
        <div>
          <Label htmlFor="profile-currency">Currency code</Label>
          <Input id="profile-currency" required minLength={3} maxLength={3} value={values.currencyCode} onChange={(event) => set('currencyCode', event.target.value.toUpperCase())} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="profile-timezone">Timezone</Label>
          <Input id="profile-timezone" required minLength={3} maxLength={64} value={values.timezone} onChange={(event) => set('timezone', event.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="profile-reason">Reason for change</Label>
        <Input id="profile-reason" required minLength={5} maxLength={500} placeholder="Why is this profile being updated?" value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="min-w-44">
        {busy ? 'Saving…' : <><CheckCircle2 className="h-4 w-4" /> Save company profile</>}
      </Button>
    </form>
  );
}
