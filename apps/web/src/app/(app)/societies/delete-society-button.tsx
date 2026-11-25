'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { csrfToken } from '@/lib/client/csrf';

export function DeleteSocietyButton({ societyId, name }: { societyId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete "${name}" and all its buildings, flats, residents and financial records? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/societies/${societyId}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        window.alert(body.error?.message ?? 'Unable to delete society');
        return;
      }
      router.refresh();
    } catch {
      window.alert('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title={`Delete ${name}`}
      aria-label={`Delete ${name}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </button>
  );
}
