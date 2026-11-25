import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2, ClipboardList, MapPin, MapPinned, Plus, Search, Sparkles } from 'lucide-react';
import { ModuleRecordsPanel, ModuleSearchPanel } from '@/components/module-panels';
import { DeleteSocietyButton } from './delete-society-button';
import { authorize } from '@society/authorization';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';

export default async function SocietiesPage() {
  const context = await getRequestContext('societies-page');
  if (!context) redirect('/login');

  const canRead = authorize(context, { moduleKey: 'company', resourceKey: 'society', action: 'READ' }).ok;
  if (!canRead || !context.activeCompanyId || !context.identity) {
    return (
      <Alert>
        Select an active company workspace from the selector in the top bar before managing societies.
      </Alert>
    );
  }

  const companyId = context.activeCompanyId;
  const service = {
    context,
    actorUserId: context.identity.userId,
    requestId: 'societies-page',
  };
  const result = await listSocieties(service, companyId);
  if (!result.ok) return <Alert>{result.message}</Alert>;
  const canCreate = authorize(context, { moduleKey: 'company', resourceKey: 'society', action: 'CREATE' }).ok;
  const canEdit = authorize(context, { moduleKey: 'company', resourceKey: 'society', action: 'UPDATE' }).ok;
  const societies = result.value;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Property foundation"
        title="Societies"
        description="Every building, floor and flat starts here. Manage the properties inside your active company workspace."
        icon={MapPinned}
        actions={
          canCreate ? (
            <Link href="/societies/create" className="btn-modern btn-primary">
              <Plus className="h-4 w-4" />
              Register a society
            </Link>
          ) : null
        }
      />

      <ModuleSearchPanel
        icon={Search}
        title="Search societies"
        subtitle="Filters apply automatically as you type or choose an option."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="summary-item">
            <span className="summary-icon summary-icon-brand"><Building2 className="h-5 w-5" /></span>
            <div>
              <p className="summary-label">Registered societies</p>
              <p className="summary-value">{societies.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-brand-50/70 p-4 text-sm text-ink-600">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-600" />
            Add buildings, floors and flats to unlock resident and billing workflows.
          </div>
        </div>
      </ModuleSearchPanel>

      <ModuleRecordsPanel
        icon={ClipboardList}
        title={`Societies · ${societies.length} records`}
        subtitle="Tenant-scoped properties with buildings, floors, flats and a complete audit trail."
        action={canCreate ? (
          <Link href="/societies/create" className="btn-modern btn-primary shadow-[0_10px_24px_-12px_rgba(79,70,229,0.9)]">
            <Plus className="h-4 w-4" /> Register a society
          </Link>
        ) : undefined}
      >
        {societies.length === 0 ? (
          <div className="op-empty">
            <span className="society-empty-icon"><MapPinned className="h-6 w-6" /></span>
            <h3>No societies yet</h3>
            <p>Create your first society to start organising buildings, floors and flats.</p>
            {canCreate ? (
              <Link href="/societies/create" className="btn-modern btn-primary">
                <Plus className="h-4 w-4" /> Register a society
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full min-w-[640px] text-left text-sm" data-table-no-tools="true">
              <thead className="text-xs uppercase tracking-wide text-ink-500">
                <tr className="border-b border-ink-200 bg-ink-50/70">
                  <th className="py-3 pl-4 pr-3">Society</th>
                  <th className="py-3 pr-3">Registration no.</th>
                  <th className="py-3 pr-3">Location</th>
                  <th className="py-3 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {societies.map((society) => (
                  <tr key={society.id} className="transition-colors hover:bg-ink-50/60">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="society-card-icon"><Building2 className="h-5 w-5" /></span>
                        <span className="font-semibold text-ink-900">{society.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-ink-600">
                      {society.registrationNumber ?? '—'}
                    </td>
                    <td className="py-3 pr-3 text-xs text-ink-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-brand-600" />
                        {society.city ?? 'Location not set'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/societies/${society.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                          Manage property <ArrowRight className="h-4 w-4" />
                        </Link>
                        {canEdit ? <DeleteSocietyButton societyId={society.id} name={society.name} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModuleRecordsPanel>
    </div>
  );
}
