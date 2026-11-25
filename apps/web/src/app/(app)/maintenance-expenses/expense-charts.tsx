'use client';

import { ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartRow {
  label: string;
  value: number;
}

function maxValue(rows: readonly ChartRow[]): number {
  return Math.max(1, ...rows.map((row) => row.value));
}

function BarChart({ rows, format }: { rows: readonly ChartRow[]; format: (value: number) => string }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-ink-500">No data for this chart.</p>;
  const max = maxValue(rows);
  return (
    <div className="flex h-44 items-end gap-1 overflow-x-auto pb-2">
      {rows.map((row) => (
        <div key={row.label} className="group flex min-w-[26px] flex-1 flex-col items-center justify-end gap-1" title={`${row.label}: ${format(row.value)}`}>
          <span className="text-[9px] font-semibold tabular-nums text-ink-600 opacity-0 transition group-hover:opacity-100">
            {Math.round((row.value / max) * 100)}%
          </span>
          <div
            className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-300 transition-all group-hover:from-brand-700"
            style={{ height: `${Math.max(3, (row.value / max) * 130)}px` }}
          />
          <span className="max-w-[52px] truncate text-[9px] text-ink-500">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ rows, format }: { rows: readonly ChartRow[]; format: (value: number) => string }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-ink-500">No data for this chart.</p>;
  const max = maxValue(rows);
  return (
    <ul className="space-y-2">
      {rows.slice(0, 12).map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-ink-700">{row.label}</span>
              <span className="font-semibold tabular-nums text-ink-600">{format(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ExpenseCharts({
  monthly,
  yearly,
  byCategory,
  byVendor,
  format,
}: {
  monthly: Array<{ month: string; total: string }>;
  yearly: Array<{ year: string; total: string }>;
  byCategory: Array<{ category: string; total: string }>;
  byVendor: Array<{ vendor: string; total: string }>;
  format: (value: string) => string;
}) {
  const toRows = (items: Array<{ label: string; total: string }>): ChartRow[] =>
    items.map((item) => ({ label: item.label, value: Number(item.total) || 0 }));

  return (
    <section className="space-y-4" id="charts">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Month-wise expense trend</CardTitle>
            <a href="#entries" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              View records <ArrowDownRight className="h-3.5 w-3.5" />
            </a>
          </CardHeader>
          <CardContent>
            <BarChart rows={toRows(monthly.map((m) => ({ label: m.month, total: m.total })))} format={(v) => format(v.toFixed(2))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Financial year comparison</CardTitle></CardHeader>
          <CardContent>
            <BarChart rows={toRows(yearly.map((y) => ({ label: y.year, total: y.total })))} format={(v) => format(v.toFixed(2))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category-wise distribution</CardTitle>
            <a href="#entries" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              View records <ArrowDownRight className="h-3.5 w-3.5" />
            </a>
          </CardHeader>
          <CardContent>
            <HorizontalBars rows={toRows(byCategory.map((c) => ({ label: c.category, total: c.total })))} format={(v) => format(v.toFixed(2))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Vendor-wise expense summary</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBars rows={toRows(byVendor.map((v) => ({ label: v.vendor, total: v.total })))} format={(v) => format(v.toFixed(2))} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
