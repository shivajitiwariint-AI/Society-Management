'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Search,
} from 'lucide-react';

interface CompanyOption {
  id: string;
  name: string;
}

interface TopbarProps {
  companies: CompanyOption[];
  activeCompanyId: string | null;
  userName: string;
  csrfToken: string;
  onOpenMenu: () => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function labelOf(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments.at(-1) ?? 'dashboard';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Topbar({ companies, activeCompanyId, userName, csrfToken, onOpenMenu }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  const currentLabel = labelOf(pathname);
  const initials = initialsOf(userName);
  const activeCompanyName =
    companies.find((company) => company.id === activeCompanyId)?.name ??
    companies[0]?.name ??
    'Platform Administration';

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setMenuOpen(false);
        searchRef.current?.blur();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        <button className="app-menu-btn" type="button" onClick={onOpenMenu} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <span className="app-company-chip" title={activeCompanyName}>
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{activeCompanyName}</span>
        </span>

        <nav className="app-breadcrumb" aria-label="Breadcrumb">
          <Link href="/dashboard" className="app-breadcrumb-home">
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Home
          </Link>
          <span className="app-breadcrumb-sep" aria-hidden="true">/</span>
          <span className="app-breadcrumb-current">{currentLabel}</span>
        </nav>
      </div>

      <div className="app-topbar-actions">
        <div className="app-search">
          <Search className="app-search-icon h-4 w-4" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            className="app-search-input"
            placeholder="Search workspace…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search workspace"
          />
          <span className="app-search-kbd" aria-hidden="true">⌘K</span>
        </div>

        <button type="button" className="app-icon-btn" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="app-icon-badge" aria-hidden="true" />
        </button>

        <div className="app-profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="app-user"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label="Open user menu"
          >
            <span className="app-avatar" aria-hidden="true">{initials}</span>
            <span className="app-user-meta">
              <span className="app-user-name">{userName}</span>
              <span className="app-user-role">Signed in</span>
            </span>
            <ChevronDown className="h-4 w-4 text-ink-400" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="app-profile-menu">
              <div className="app-profile-menu-label">{userName}</div>
              <Link href="/accounting" className="app-profile-menu-item" onClick={() => setMenuOpen(false)}>
                <BookOpen className="h-4 w-4" aria-hidden="true" /> Accounting
              </Link>
              <button type="button" className="app-profile-menu-item" onClick={handleLogout}>
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
