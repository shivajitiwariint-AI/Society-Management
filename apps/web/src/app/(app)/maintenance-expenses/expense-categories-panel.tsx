'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { csrfToken } from '@/lib/client/csrf';

interface Category {
  id: string;
  name: string;
  monthlyBase: string | null;
  isActive: boolean;
}

export function ExpenseCategoriesPanel({ societyId, canManage }: { societyId: string; canManage: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`/api/v1/societies/${societyId}/expense-categories`, {
          headers: { 'x-csrf-token': csrfToken() },
        });
        if (response.ok) {
          const body = (await response.json()) as { items: Category[] };
          setItems(body.items ?? []);
        }
      } catch { /* ignore */ }
    })();
  }, [societyId]);

  async function seed() {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/societies/${societyId}/expense-categories`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (response.ok) {
        const body = (await response.json()) as { items: Category[] };
        setItems(body.items ?? items);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="categories" className="scroll-mt-24">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Expense categories</CardTitle>
        {canManage && items.length === 0 ? <Button size="sm" disabled={busy} onClick={() => void seed()}><Plus className="h-4 w-4" /> Add 12 defaults</Button> : null}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-ink-500">No category master for this society yet. Add the 12 standard heads to get started.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                <span className={category.isActive ? 'text-ink-800' : 'text-ink-400 line-through'}>{category.name}</span>
                <span className="text-xs font-semibold tabular-nums text-ink-600">{category.monthlyBase ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
