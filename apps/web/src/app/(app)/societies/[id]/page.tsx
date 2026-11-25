import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authorize } from '@society/authorization';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRequestContext } from '@/lib/auth/session';
import { getProperty } from '@/lib/services/society-service';
import { BuildingForm, FlatForm, FloorForm } from './property-forms';

type PageProps = { params: Promise<{ id: string }> };

export default async function SocietyPropertyPage({ params }: PageProps) {
  const context = await getRequestContext('property-page');
  if (!context) redirect('/login');
  const societyId = (await params).id;
  if (!z.uuid().safeParse(societyId).success || !context.activeCompanyId || !context.identity) {
    return <Alert>Invalid society id or no active company workspace.</Alert>;
  }

  const service = {
    context,
    actorUserId: context.identity.userId,
    requestId: 'property-page',
  };
  const result = await getProperty(service, context.activeCompanyId, societyId);
  if (!result.ok) return <Alert>{result.message}</Alert>;
  const { society, buildings } = result.value;

  const can = (resourceKey: string, action: 'CREATE' | 'READ' | 'UPDATE') =>
    authorize(context, { moduleKey: 'society-foundation', resourceKey, action, societyId }).ok;

  return (
    <div className="space-y-7">
      <Link href="/societies" className="back-link">
        <ArrowLeft className="h-3.5 w-3.5" /> All societies
      </Link>
      <PageHeader
        eyebrow="Property structure"
        title={society.name}
        description={`${society.city ? `${society.city} · ` : ''}${society.countryCode} · ${society.timezone}`}
        icon={Building2}
      />

      <Card>
        <CardHeader><CardTitle>Buildings ({buildings.length})</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {can('building', 'CREATE') ? <BuildingForm societyId={societyId} /> : null}
          {buildings.length === 0 ? <p className="text-sm text-ink-500">No buildings registered yet.</p> : null}
          {buildings.map((building) => (
            <section key={building.id} className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-bold tracking-[-0.015em] text-ink-900">{building.name}</h2>
                <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">Code {building.code}</span>
              </div>
              <h3 className="mb-2 text-sm font-semibold text-ink-700">Floors</h3>
              {building.floors.length === 0 ? <p className="text-sm text-ink-500">No floors registered yet.</p> : null}
              <ul className="space-y-3">
                {building.floors.map((floor) => (
                  <li key={floor.id} className="rounded-xl border border-ink-100 bg-ink-50/70 p-4">
                    <p className="text-sm font-semibold text-ink-900">{floor.name} <span className="text-xs font-normal text-ink-500">(level {floor.floorNumber})</span></p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {floor.flats.length === 0 ? (
                        <span className="text-xs text-ink-500">No flats yet.</span>
                      ) : (
                        floor.flats.map((flat) => (
                          <span key={flat.id} className="rounded-full bg-white px-2 py-1 text-xs text-ink-700 ring-1 ring-ink-200">
                            {flat.number}
                            {flat.areaSqMt ? ` · ${flat.areaSqMt} sq m` : ''} · {flat.occupancyStatus}
                          </span>
                        ))
                      )}
                    </div>
                    {can('flat', 'CREATE') ? (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-medium text-brand-700">Add flat</summary>
                        <div className="mt-3"><FlatForm societyId={societyId} buildingId={building.id} floorId={floor.id} /></div>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
              {can('building', 'CREATE') && can('floor', 'CREATE') ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-brand-700">Add floor</summary>
                  <div className="mt-3"><FloorForm societyId={societyId} buildingId={building.id} /></div>
                </details>
              ) : null}
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
