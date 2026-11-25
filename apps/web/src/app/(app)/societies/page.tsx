import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Building2, MapPin, MapPinned, Plus, Sparkles } from 'lucide-react';
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

      <section className="summary-strip" aria-label="Society summary">
        <div className="summary-item">
          <span className="summary-icon summary-icon-brand"><Building2 className="h-5 w-5" /></span>
          <div>
            <p className="summary-label">Registered societies</p>
            <p className="summary-value">{societies.length}</p>
          </div>
        </div>
        <p className="summary-note">
          <Sparkles className="h-3.5 w-3.5" />
          Add buildings, floors and flats to unlock resident and billing workflows.
        </p>
      </section>

      <section aria-label="Registered societies">
        <div className="section-heading">
          <h2 className="section-title">Registered societies</h2>
          <span className="section-count">{societies.length} total</span>
        </div>

        {societies.length === 0 ? (
          <div className="society-empty">
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
          <div className="society-grid">
            {societies.map((society) => (
              <Link key={society.id} href={`/societies/${society.id}`} className="society-card">
                <span className="society-card-icon"><Building2 className="h-5 w-5" /></span>
                <span className="society-card-copy">
                  <span className="society-card-name">{society.name}</span>
                  <span className="society-card-meta">
                    {society.registrationNumber ?? 'No registration number'}
                  </span>
                  <span className="society-card-location">
                    <MapPin className="h-3.5 w-3.5" />
                    {society.city ?? 'Location not set'}
                  </span>
                </span>
                <span className="society-card-action">
                  Manage property <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
