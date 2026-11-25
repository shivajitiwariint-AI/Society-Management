import * as React from 'react';
import { cn } from '@/lib/utils';

export function Alert({ className, tone = 'error', ...props }: React.HTMLAttributes<HTMLDivElement> & { tone?: 'error' | 'success' | 'info' }) {
  const tones = {
    error: 'border-red-200 border-l-red-500 bg-red-50/80 text-red-900',
    success: 'border-emerald-200 border-l-emerald-500 bg-emerald-50/80 text-emerald-900',
    info: 'border-blue-200 border-l-blue-500 bg-blue-50/80 text-blue-900',
  } as const;
  return (
    <div
      role="alert"
      className={cn('rounded-r-lg rounded-l-sm border border-l-4 px-3.5 py-2.5 text-sm leading-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]', tones[tone], className)}
      {...props}
    />
  );
}
