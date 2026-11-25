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
  canSwitchCompany: boolean;
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

export function Topbar({ companies, activeCompanyId, canSwitchCompany, userName, csrfToken, onOpenMenu }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);
  const [switchError, setSwitchError] = React.useState<string | null>(null);
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

  async function handleCompanyChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const companyId = event.target.value;
    if (!companyId) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      const response = await fetch('/api/v1/context/company', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ companyId, societyId: null }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setSwitchError(body.error?.message ?? 'Unable to switch company');
        return;
      }
      router.refresh();
    } catch {
      setSwitchError('Network error. Please try again.');
    } finally {
      setSwitching(false);
    }
  }

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
        {canSwitchCompany && companies.length > 0 ? (
          <span className="app-company-chip">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            <select
              className="app-company-select"
              aria-label="Active company workspace"
              value={activeCompanyId ?? ''}
              disabled={switching}
              onChange={handleCompanyChange}
            >
              <option value="" disabled>Select a company…</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </span>
        ) : (
          <span className="app-company-chip" title={activeCompanyName}>
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{activeCompanyName}</span>
          </span>
        )}
        {switchError ? <span className="app-company-error">{switchError}</span> : null}

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
