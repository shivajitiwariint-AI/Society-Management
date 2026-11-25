'use client';

import { useState, type ReactNode } from 'react';
import { Building2, Home, Layers3, Plus, X, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  building: Building2,
  floor: Layers3,
  flat: Home,
};

export function FormDialog({
  label,
  title,
  description,
  iconName,
  compact = false,
  children,
}: {
  label: string;
  title: string;
  description: string;
  iconName?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const Icon = iconName ? ICONS[iconName] : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? 'inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50'
          : 'btn-modern btn-primary inline-flex items-center gap-2 shadow-[0_10px_24px_-12px_rgba(79,70,229,0.9)]'}
      >
        <Plus className="h-4 w-4" /> {label}
      </button>

      {open ? (
        <div
          className="app-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div className="app-modal-card">
            <div className="app-modal-header">
              <div className="flex items-center gap-3">
                {Icon ? (
                  <span className="op-section-icon op-section-search"><Icon className="h-5 w-5" /></span>
                ) : null}
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
                  <p className="section-subtitle">{description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="app-modal-body">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
