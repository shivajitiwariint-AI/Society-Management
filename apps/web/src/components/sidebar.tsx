'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type LucideIcon,
  LayoutDashboard,
  Building2,
  MapPinned,
  Users,
  CreditCard,
  Receipt,
  BookOpen,
  BarChart3,
  Plug,
  Car,
  ClipboardList,
  Calendar,
  Briefcase,
  FileText,
  Megaphone,
  ChevronLeft,
  PanelLeftOpen,
  LifeBuoy,
  Search,
  X,
  Sparkles,
  KeyRound,
  ScrollText,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { BrandMark } from '@/components/brand-logo';

export interface SidebarItem {
  key: string;
  label: string;
  href: string;
  icon: string;
}

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  help: LifeBuoy,
  auth: KeyRound,
  rbac: ShieldCheck,
  audit: ScrollText,
  'security-settings': Settings2,
  company: Building2,
  'society-foundation': MapPinned,
  residents: Users,
  'finance-billing': CreditCard,
  'payments-receipts': Receipt,
  accounting: BookOpen,
  visitors: Users,
  'complaints-maintenance': ClipboardList,
  'amenities-bookings': Calendar,
  'parking-vehicles': Car,
  'staff-attendance': Briefcase,
  'vendors-contracts': Briefcase,
  'notices-communication': Megaphone,
  documents: FileText,
  'meetings-voting': FileText,
  'advanced-reports': BarChart3,
  integrations: Plug,
};

interface SidebarProps {
  items: SidebarItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
}

export function Sidebar({ items, collapsed, onToggleCollapse, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [query, setQuery] = React.useState('');

  const footerItems: SidebarItem[] = [
    { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { key: 'help', label: 'Help & support', href: '/help', icon: 'help' },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const matches = normalizedQuery
    ? [...items, ...footerItems].filter(
        (item) =>
          item.label.toLowerCase().includes(normalizedQuery) ||
          item.key.toLowerCase().includes(normalizedQuery) ||
          item.href.toLowerCase().includes(normalizedQuery),
      )
    : [];

  const renderLink = (item: SidebarItem) => {
    const Icon = ICONS[item.icon] ?? LayoutDashboard;
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.key}
        href={item.href}
        className={`app-sidebar-link${active ? ' active' : ''}`}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => { setQuery(''); onClose(); }}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        <span className="app-sidebar-link-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Main sidebar">
      <div className="app-sidebar-brand">
        <BrandMark className="app-sidebar-logo" />
        <span className="app-sidebar-brand-copy">
          <span className="app-sidebar-title">Society Management</span>
          <span className="app-sidebar-subtitle">Community OS</span>
        </span>
        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button type="button" className="app-sidebar-close" onClick={onClose} aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!collapsed ? (
        <div className="app-sidebar-search">
          <Search className="app-sidebar-search-icon h-4 w-4" aria-hidden="true" />
          <input
            type="search"
            className="app-sidebar-search-input"
            placeholder="Search menu…"
            aria-label="Search menu items"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="app-sidebar-search-clear" aria-label="Clear menu search" onClick={() => setQuery('')}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <nav className="app-sidebar-nav" aria-label="Workspace navigation">
        {normalizedQuery ? (
          <>
            <span className="app-sidebar-section-label">Results ({matches.length})</span>
            {matches.length > 0 ? matches.map(renderLink) : (
              <p className="app-sidebar-no-results">No menu items match “{query.trim()}”.</p>
            )}
          </>
        ) : (
          <>
            <span className="app-sidebar-section-label">Workspace</span>
            {items.map(renderLink)}
          </>
        )}
      </nav>

      {!normalizedQuery && <div className="app-sidebar-footer">
        <Link
          href="/dashboard"
          className={`app-sidebar-link${pathname === '/dashboard' ? ' active' : ''}`}
          title={collapsed ? 'Dashboard' : undefined}
          aria-current={pathname === '/dashboard' ? 'page' : undefined}
          onClick={onClose}
        >
          <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="app-sidebar-link-label">Dashboard</span>
        </Link>
        <Link
          href="/help"
          className={`app-sidebar-link${pathname === '/help' ? ' active' : ''}`}
          title={collapsed ? 'Help & support' : undefined}
          aria-current={pathname === '/help' ? 'page' : undefined}
        >
          <LifeBuoy className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="app-sidebar-link-label">Help &amp; support</span>
        </Link>

        <div className="app-sidebar-support">
          <p className="app-sidebar-support-title"><Sparkles className="h-3.5 w-3.5" /> Workspace tip</p>
          <p className="app-sidebar-support-text">
            Enable only the modules each company needs. You can expand at any time.
          </p>
        </div>
      </div>}
    </aside>
  );
}
