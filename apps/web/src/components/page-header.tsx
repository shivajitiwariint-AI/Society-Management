import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <div className="page-title-wrap">
          {Icon ? (
            <span className="page-title-icon">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <h1 className="page-title">{title}</h1>
        </div>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
