import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { authorize } from '@society/authorization';
import { prisma } from '@society/database';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRequestContext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ companyId?: string; action?: string; result?: string; page?: string }>;

const PAGE_SIZE = 50;

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getRequestContext('platform-audit-page');
  if (!context) redirect('/login');
  const allowed = authorize(context, {
    moduleKey: 'audit', resourceKey: 'audit-log', action: 'READ', platform: true,
  }).ok;
  if (!allowed) return <Alert>Platform audit access is required.</Alert>;

  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const companyFilter = query.companyId && /^[0-9a-f-]{36}$/i.test(query.companyId) ? query.companyId : undefined;
  const actionFilter = query.action?.trim().slice(0, 120) || undefined;
  const resultFilter = ['SUCCESS', 'FAILURE', 'DENIED'].includes(query.result ?? '') ? query.result : undefined;

  const where = {
    ...(companyFilter ? { companyId: companyFilter } : {}),
    ...(actionFilter ? { action: { contains: actionFilter } } : {}),
    ...(resultFilter ? { result: resultFilter as 'SUCCESS' | 'FAILURE' | 'DENIED' } : {}),
  };

  const [logs, total, companies] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        result: true,
        reason: true,
        createdAt: true,
        company: { select: { name: true, code: true } },
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.company.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryFor = (nextPage: number) => {
    const params = new URLSearchParams();
    if (companyFilter) params.set('companyId', companyFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (resultFilter) params.set('result', resultFilter);
    params.set('page', String(nextPage));
    return `/admin/audit?${params.toString()}`;
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Platform administration"
        title="Audit logs"
        description="Every sensitive platform and company action is recorded with its actor, outcome and reason."
        icon={ScrollText}
        actions={<span className="section-count">{total} events</span>}
      />

      <section className="create-panel" aria-label="Filter audit logs">
        <div className="create-panel-head">
          <span className="create-panel-icon"><ScrollText className="h-5 w-5" /></span>
          <div>
            <h2 className="section-title">Filter events</h2>
            <p className="section-subtitle">Narrow the log by company, action or outcome.</p>
          </div>
        </div>
        <div className="create-panel-body">
          <form method="get" className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="audit-company">Company</Label>
              <select id="audit-company" name="companyId" defaultValue={companyFilter ?? ''} className="h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm">
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name} ({company.code})</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="audit-action">Action</Label>
              <Input id="audit-action" name="action" defaultValue={actionFilter ?? ''} placeholder="e.g. COMPANY_UPDATED" />
            </div>
            <div>
              <Label htmlFor="audit-result">Result</Label>
              <select id="audit-result" name="result" defaultValue={resultFilter ?? ''} className="h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm">
                <option value="">All results</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
                <option value="DENIED">Denied</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Apply filters</Button>
            </div>
          </form>
        </div>
      </section>

      <section className="data-panel" aria-label="Audit events">
        <div className="data-panel-head">
          <div>
            <h2 className="section-title">Events</h2>
            <p className="section-subtitle">Newest first · page {page} of {totalPages}</p>
          </div>
          <span className="section-count">{logs.length} shown</span>
        </div>

        {logs.length === 0 ? (
          <div className="society-empty">
            <span className="society-empty-icon"><ScrollText className="h-6 w-6" /></span>
            <h3>No audit events found</h3>
            <p>Try changing the filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Result</th>
                  <th className="px-5 py-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-ink-100/80 transition-colors last:border-0 hover:bg-ink-50/70">
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-500">
                      {log.createdAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink-900">{log.action}</p>
                      <p className="text-[11px] text-ink-500">{log.resourceType}{log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ''}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-700">{log.company ? `${log.company.name} (${log.company.code})` : 'Platform'}</td>
                    <td className="px-5 py-3.5 text-ink-700">{log.actor?.name ?? log.actor?.email ?? 'System'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`status-pill ${log.result === 'SUCCESS' ? 'status-pill-success' : log.result === 'DENIED' ? 'status-pill-warning' : 'status-pill-muted'}`}>
                        {log.result.toLowerCase()}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-3.5 text-ink-500">{log.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-5 py-4">
            <Button asChild size="sm" variant="outline" disabled={page <= 1}>
              <Link href={queryFor(page - 1)}>Previous</Link>
            </Button>
            <span className="text-xs text-ink-500">Page {page} of {totalPages}</span>
            <Button asChild size="sm" variant="outline" disabled={page >= totalPages}>
              <Link href={queryFor(page + 1)}>Next</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
