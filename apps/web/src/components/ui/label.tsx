'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('mb-1.5 block text-[13px] font-semibold tracking-[0.005em] text-ink-700', className)}
      {...props}
    />
  );
}
