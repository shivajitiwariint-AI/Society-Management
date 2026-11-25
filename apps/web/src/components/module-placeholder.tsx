import type { LucideIcon } from 'lucide-react';
import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ModulePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ModulePlaceholder({ icon: Icon, title, description }: ModulePlaceholderProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="relative flex flex-col items-center px-6 py-14 text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgba(224, 231, 255, 0.55), transparent 70%)',
          }}
        />
        <span className="page-title-icon relative h-14 w-14 rounded-2xl">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="relative mt-5 text-lg font-bold tracking-[-0.02em] text-ink-900">{title}</h2>
        <p className="relative mt-2 max-w-md text-sm leading-6 text-ink-500">{description}</p>
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> Permission gated
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
            <LockKeyhole className="h-3.5 w-3.5 text-brand-600" /> Tenant isolated
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Audit ready
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
