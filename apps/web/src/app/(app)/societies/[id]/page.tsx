import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authorize } from '@society/authorization';
import { ArrowLeft, Building2, Check, Home, Layers3, MapPin } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRequestContext } from '@/lib/auth/session';
import { getProperty } from '@/lib/services/society-service';
import { BuildingForm, FlatForm, FloorForm } from './property-forms';
import { DeletePropertyButton } from './delete-property-button';
import { FormDialog } from './form-dialog';

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

  const floorCount = buildings.reduce((sum, building) => sum + building.floors.length, 0);
  const flatCount = buildings.reduce(
    (sum, building) => sum + building.floors.reduce((total, floor) => total + floor.flats.length, 0),
    0,
  );
  const steps = [
    { label: 'Society registered', done: true },
    { label: 'Add a building', done: buildings.length > 0 },
    { label: 'Add floors', done: floorCount > 0 },
    { label: 'Add flats / units', done: flatCount > 0 },
  ];
  const completed = steps.filter((step) => step.done).length;

  return (
    <div className="space-y-7">
      <Link href="/societies" className="back-link">
        <ArrowLeft className="h-3.5 w-3.5" /> All societies
      </Link>

      <PageHeader
        eyebrow="Property setup"
        title={society.name}
        description={`${society.city ? `${society.city} · ` : ''}${society.countryCode} · ${society.timezone}`}
        icon={MapPin}
      />

      <Card className="border-brand-100 bg-brand-50/60">
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <span className="font-semibold text-brand-700">Setup progress</span>
          <span className="text-xs text-ink-500">{completed} of {steps.length} steps complete</span>
          <div className="ml-auto flex h-2 w-40 overflow-hidden rounded-full bg-white">
            <div className="bg-brand-600" style={{ width: `${(completed / steps.length) * 100}%` }} />
          </div>
        </CardContent>
        <CardContent className="flex flex-wrap gap-2 pb-5">
          {steps.map((step, index) => (
            <span
              key={step.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                step.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-ink-200 bg-white text-ink-500'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step.done ? 'bg-emerald-600 text-white' : 'bg-ink-100 text-ink-500'
              }`}>
                {step.done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {step.label}
            </span>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-600" /> Buildings
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">{buildings.length}</span>
          </CardTitle>
          {can('building', 'CREATE') ? (
            <FormDialog
              label="Add building"
              title="Add a building"
              description="Define a building in this society to start adding floors and flats."
              icon={Building2}
            >
              <BuildingForm societyId={societyId} />
            </FormDialog>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          {buildings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 px-6 py-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-3 font-semibold text-ink-900">No buildings yet</p>
              <p className="mt-1 text-sm text-ink-500">Add your first building to start defining floors and flats.</p>
            </div>
          ) : null}

          {buildings.map((building) => (
            <section key={building.id} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
                <div>
                  <h2 className="font-bold tracking-tight text-ink-900">{building.name}</h2>
                  <p className="text-xs text-ink-500">
                    Code {building.code} · {building.floors.length} floor{building.floors.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {can('floor', 'CREATE') ? (
                    <FormDialog
                      label="Add floor"
                      title="Add a floor"
                      description={`Add a floor to ${building.name}. You can then add flats to it.`}
                      icon={Layers3}
                      compact
                    >
                      <FloorForm societyId={societyId} buildingId={building.id} />
                    </FormDialog>
                  ) : null}
                  {can('building', 'UPDATE') ? (
                    <DeletePropertyButton
                      endpoint={`/api/v1/buildings/${building.id}`}
                      label={`building ${building.name}`}
                    />
                  ) : null}
                </div>
              </div>

              {building.floors.length === 0 ? (
                <p className="text-sm text-ink-500">No floors yet. Add a floor to organise units.</p>
              ) : null}

              <ul className="space-y-3">
                {building.floors.map((floor) => (
                  <li key={floor.id} className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-900">
                        <Layers3 className="mr-1.5 inline h-4 w-4 text-brand-600" />
                        {floor.name} <span className="text-xs font-normal text-ink-500">(level {floor.floorNumber})</span>
                      </p>
                      <div className="flex items-center gap-2">
                        {can('flat', 'CREATE') ? (
                          <FormDialog
                            label="Add flat"
                            title="Add a flat / unit"
                            description={`Add a unit to ${floor.name}.`}
                            icon={Home}
                            compact
                          >
                            <FlatForm societyId={societyId} buildingId={building.id} floorId={floor.id} />
                          </FormDialog>
                        ) : null}
                        {can('floor', 'UPDATE') ? (
                          <DeletePropertyButton
                            endpoint={`/api/v1/floors/${floor.id}`}
                            label={`floor ${floor.name}`}
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {floor.flats.length === 0 ? (
                        <span className="text-xs text-ink-500">No flats on this floor.</span>
                      ) : floor.flats.map((flat) => (
                        <span key={flat.id} className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs text-ink-700 ring-1 ring-ink-200">
                          <Home className="h-3 w-3 text-brand-600" />
                          {flat.number}
                          {flat.areaSqMt ? ` · ${flat.areaSqMt} sq m` : ''} · {flat.occupancyStatus}
                          {can('flat', 'UPDATE') ? (
                            <DeletePropertyButton
                              endpoint={`/api/v1/flats/${flat.id}`}
                              label={`flat ${flat.number}`}
                              compact
                            />
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
