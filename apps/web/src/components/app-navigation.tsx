'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { NavItem } from '@/lib/navigation';

export function AppNavigation({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const allItems = [
    { label: 'Dashboard', href: '/dashboard', moduleKey: 'dashboard' },
    ...items,
  ];
  const filteredItems = allItems.filter((item) =>
    `${item.label} ${item.href}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <div className="app-menu">
      <div className="app-menu-search">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-500" />
        <input
          aria-label="Search menu"
          autoComplete="off"
          className="app-menu-search-input"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search menu"
          type="search"
          value={query}
        />
        {query ? (
          <button aria-label="Clear menu search" className="app-menu-search-clear" onClick={() => setQuery('')} type="button">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <nav aria-label="Main navigation" className="app-navigation">
        {filteredItems.map((item) => (
        <Link
            key={`${item.moduleKey}-${item.href}`}
            href={item.href}
            className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'app-nav-item app-nav-item-active' : 'app-nav-item'}
        >
          {item.label}
        </Link>
        ))}
        {filteredItems.length === 0 ? <p className="app-menu-empty">No menu items match “{query}”.</p> : null}
      </nav>
    </div>
  );
}
