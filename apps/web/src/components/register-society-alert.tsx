import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

/** Friendly empty state when a company has no society yet. */
export function RegisterSocietyAlert({ action }: { action: string }) {
  return (
    <Alert tone="info">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Register a society before {action}.</span>
        <Link href="/societies/create" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700">
          <Plus className="h-3.5 w-3.5" /> Register a society
        </Link>
      </div>
    </Alert>
  );
}
