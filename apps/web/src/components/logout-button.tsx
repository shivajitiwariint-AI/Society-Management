'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('society_csrf='))
        ?.split('=')[1] ?? '';
      const response = await fetch('/api/v1/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken } });
      if (!response.ok) throw new Error('Sign-out failed');
      router.push('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <Button variant="ghost" size="sm" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</Button>;
}
