import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function ModuleSearchPanel({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Card className="op-search-panel">
      <CardHeader className="flex items-center gap-3">
        <span className="op-section-icon op-section-search"><Icon className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink-900">{title}</h2>
          <p className="section-subtitle">{subtitle}</p>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ModuleRecordsPanel({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="op-list-panel">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="op-section-icon op-section-list"><Icon className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-ink-900">{title}</h2>
            <p className="section-subtitle">{subtitle}</p>
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function ModuleEmpty({ icon: Icon, title, description, action }: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="op-empty">
      <span className="society-empty-icon"><Icon className="h-6 w-6" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
