'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';

export function OpenCompanyButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    const csrfToken = decodeURIComponent(
      document.cookie.split('; ').find((entry) => entry.startsWith('society_csrf='))?.split('=')[1] ?? '',
    );
    try {
      const response = await fetch('/api/v1/context/company', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ companyId, societyId: null }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to open this company');
      router.push('/dashboard');
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to open this company');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" className="btn-modern btn-primary" onClick={() => void open()} disabled={busy}>
        <LayoutDashboard className="h-4 w-4" /> {busy ? 'Opening…' : 'Open dashboard'}
      </button>
      {error ? <span className="max-w-48 text-right text-[11px] text-red-600">{error}</span> : null}
    </div>
  );
}
