'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Adds search and header sorting to every table rendered inside the app shell.
 * Works with server-rendered tables without changing their data or behaviour.
 */
export function TableTools() {
  const pathname = usePathname();

  useEffect(() => {
    const container = document.querySelector<HTMLElement>('.app-content');
    if (!container) return;

    function enhanceTable(table: HTMLTableElement) {
      if (table.dataset.tableEnhanced === 'true') return;
      if (table.dataset.tableNoTools === 'true') return;
      table.dataset.tableEnhanced = 'true';

      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const originalRows = Array.from(tbody.rows);
      const wrapper = table.parentElement ?? table;

      if (table.dataset.tableNoTools !== 'true') {
        const toolbar = document.createElement('div');
        toolbar.className = 'table-tools';
        const search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'Search records…';
        search.className = 'table-tools-search';
        search.setAttribute('aria-label', 'Search table records');
        const hint = document.createElement('span');
        hint.className = 'table-tools-hint';
        hint.textContent = 'Click a heading to sort';
        toolbar.append(search, hint);
        wrapper.insertBefore(toolbar, table);

        search.addEventListener('input', () => {
          const term = search.value.trim().toLowerCase();
          originalRows.forEach((row) => {
            const text = row.textContent?.toLowerCase() ?? '';
            row.style.display = !term || text.includes(term) ? '' : 'none';
          });
        });
      }

      const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
      headers.forEach((header, columnIndex) => {
        header.classList.add('sortable-th');
        header.setAttribute('role', 'button');
        header.tabIndex = 0;
        header.setAttribute('aria-label', `Sort by ${header.textContent?.trim() ?? 'column'}`);
        let direction = 1;

        const sort = () => {
          direction = direction === 1 ? -1 : 1;
          const rows = Array.from(tbody.rows);
          rows.sort((left, right) => {
            const leftText = left.cells[columnIndex]?.textContent?.trim() ?? '';
            const rightText = right.cells[columnIndex]?.textContent?.trim() ?? '';
            const leftNumber = Number(leftText.replace(/[^0-9.-]/g, ''));
            const rightNumber = Number(rightText.replace(/[^0-9.-]/g, ''));
            const numeric = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber);
            const comparison = numeric
              ? leftNumber - rightNumber
              : leftText.localeCompare(rightText);
            return comparison * direction;
          });
          rows.forEach((row) => tbody.appendChild(row));
          headers.forEach((other) => other.removeAttribute('data-sort-dir'));
          header.setAttribute('data-sort-dir', direction === 1 ? 'asc' : 'desc');
        };

        header.addEventListener('click', sort);
        header.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            sort();
          }
        });
      });
    }

    function enhanceAll() {
      if (!container) return;
      container.querySelectorAll('table').forEach((table) => enhanceTable(table as HTMLTableElement));
    }

    enhanceAll();
    const observer = new MutationObserver(enhanceAll);
    observer.observe(container!, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
