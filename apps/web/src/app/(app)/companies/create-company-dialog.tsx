'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateCompanyForm } from './create-company-form';

export function CreateCompanyDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add company
      </Button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/50"
        aria-labelledby="create-company-title"
        onCancel={(event) => { event.preventDefault(); setOpen(false); }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">New workspace</p>
            <h2 id="create-company-title" className="mt-1 text-xl font-semibold">Add a company</h2>
            <p className="mt-1 text-xs text-ink-500">Core modules are enabled; business modules stay off until configured.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            onClick={() => setOpen(false)}
            aria-label="Close add company dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <CreateCompanyForm onSuccess={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
