import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm text-ink-900 shadow-[inset_0_1px_1px_rgba(15,23,42,0.02)] transition placeholder:text-ink-400 hover:border-ink-300 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-60 aria-[invalid=true]:border-red-300 aria-[invalid=true]:ring-red-500/10',
        className,
      )}
      {...props}
    />
  );
}
