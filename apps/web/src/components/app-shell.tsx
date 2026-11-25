'use client';

import * as React from 'react';
import { Sidebar, type SidebarItem } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { TableTools } from '@/components/table-tools';

interface CompanyOption {
  id: string;
  name: string;
}

interface AppShellProps {
  children: React.ReactNode;
  items: SidebarItem[];
  companies: CompanyOption[];
  activeCompanyId: string | null;
  userName: string;
  csrfToken: string;
}

export function AppShell({ children, items, companies, activeCompanyId, userName, csrfToken }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className={`app-shell${mobileOpen ? ' nav-open' : ''}`}>
      <Sidebar
        items={items}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onClose={() => setMobileOpen(false)}
      />
      <div className="app-sidebar-scrim" aria-hidden="true" onClick={() => setMobileOpen(false)} />
      <div className="app-main-area">
        <Topbar
          companies={companies}
          activeCompanyId={activeCompanyId}
          userName={userName}
          csrfToken={csrfToken}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <main className="app-content">{children}</main>
        <TableTools />
      </div>
    </div>
  );
}
