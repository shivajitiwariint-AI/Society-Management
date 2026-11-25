'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { csrfToken } from '@/lib/client/csrf';
import type { ResidentDetailView, ResidentListView } from '@/lib/services/resident-service';

interface SocietyOption { id: string; name: string; city: string | null }
interface CategoryOptions {
  residentTypes: readonly string[];
  residentStatuses: readonly string[];
  documentStatuses: readonly string[];
  relationships: readonly string[];
  vehicleTypes: readonly string[];
}
interface ResidentWorkspaceProps {
  societies: readonly SocietyOption[];
  societyId: string;
  categories: CategoryOptions;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  initial: ResidentListView;
}
interface Filters { search: string; residentType: string; status: string }
type Message = { tone: 'error' | 'success'; text: string };

const selectClass = 'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 disabled:opacity-50';
const EMPTY_FILTERS: Filters = { search: '', residentType: '', status: '' };
const EMPTY_RESIDENT = {
  name: '', phone: '', email: '', residentType: 'OWNER', documentType: '', documentNumber: '', documentStatus: 'PENDING', notes: '',
};
const EMPTY_LINK = {
  kind: 'OWNERSHIP', flatId: '', residentId: '', fromDate: '', toDate: '', ownershipShare: '', monthlyRent: '', isPrimary: false,
};
const EMPTY_FAMILY = { name: '', relationship: 'SPOUSE', phone: '', dateOfBirth: '' };
const EMPTY_VEHICLE = { registrationNumber: '', vehicleType: 'CAR', make: '', model: '' };

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function errorText(body: unknown, fallback: string): string {
  const candidate = body as { error?: { message?: string } };
  return candidate.error?.message ?? fallback;
}

export function ResidentWorkspace({
  societies,
  societyId,
  categories,
  canCreate,
  canUpdate,
  canDelete,
  initial,
}: ResidentWorkspaceProps) {
  const router = useRouter();
  const [selectedSocietyId, setSelectedSocietyId] = useState(societyId);
  const [data, setData] = useState<ResidentListView>(initial);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ResidentDetailView | null>(null);
  const [residentForm, setResidentForm] = useState(EMPTY_RESIDENT);
  const [linkForm, setLinkForm] = useState(EMPTY_LINK);
  const [familyForm, setFamilyForm] = useState(EMPTY_FAMILY);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const buildQuery = (nextFilters: Filters, nextPage: number): string => {
    const params = new URLSearchParams();
    if (nextFilters.search) params.set('search', nextFilters.search);
    if (nextFilters.residentType) params.set('residentType', nextFilters.residentType);
    if (nextFilters.status) params.set('status', nextFilters.status);
    params.set('page', String(nextPage));
    params.set('pageSize', '20');
    return params.toString();
  };

  const loadList = async (nextFilters = filters, nextPage = page, nextSocietyId = selectedSocietyId): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/societies/${nextSocietyId}/residents?${buildQuery(nextFilters, nextPage)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error(errorText(await readJson(response), 'Unable to load residents'));
      setData(await readJson<ResidentListView>(response));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load residents');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (residentId: string, nextSocietyId = selectedSocietyId): Promise<void> => {
    setError(null);
    try {
      const response = await fetch(`/api/v1/residents/${residentId}?societyId=${nextSocietyId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(errorText(await readJson(response), 'Unable to load resident'));
      const value = await readJson<ResidentDetailView>(response);
      setDetail(value);
      setLinkForm((current) => ({ ...current, residentId: value.id }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load resident');
    }
  };

  const mutate = async (url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<boolean> => {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken(),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        setMessage({ tone: 'error', text: errorText(await readJson(response), 'Request failed') });
        return false;
      }
      return true;
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
      return false;
    }
  };

  const refresh = async () => {
    await loadList(filters, 1, selectedSocietyId);
    if (detail) await loadDetail(detail.id, selectedSocietyId);
  };

  const applyFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    void loadList(next, 1, selectedSocietyId);
  };

  const changeSociety = (nextSocietyId: string) => {
    setSelectedSocietyId(nextSocietyId);
    setDetail(null);
    setPage(1);
    void loadList(filters, 1, nextSocietyId);
    router.replace(`/residents?societyId=${nextSocietyId}`, { scroll: false });
  };

  const submitResident = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await mutate(`/api/v1/societies/${selectedSocietyId}/residents`, 'POST', residentForm);
    if (!ok) return;
    setResidentForm(EMPTY_RESIDENT);
    setMessage({ tone: 'success', text: 'Resident added.' });
    await loadList(filters, 1, selectedSocietyId);
  };

  const submitLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = linkForm.kind === 'OWNERSHIP'
      ? {
          flatId: linkForm.flatId,
          residentId: linkForm.residentId,
          fromDate: linkForm.fromDate,
          toDate: linkForm.toDate || undefined,
          ownershipShare: linkForm.ownershipShare ? Number(linkForm.ownershipShare) : undefined,
          isPrimary: linkForm.isPrimary,
        }
      : {
          flatId: linkForm.flatId,
          residentId: linkForm.residentId,
          startDate: linkForm.fromDate,
          endDate: linkForm.toDate || undefined,
          monthlyRent: linkForm.monthlyRent ? Number(linkForm.monthlyRent) : undefined,
        };
    const resource = linkForm.kind === 'OWNERSHIP' ? 'ownerships' : 'tenancies';
    const ok = await mutate(`/api/v1/societies/${selectedSocietyId}/${resource}`, 'POST', body);
    if (!ok) return;
    setLinkForm({ ...EMPTY_LINK, residentId: linkForm.residentId });
    setMessage({ tone: 'success', text: `${linkForm.kind} record added.` });
    await refresh();
  };

  const submitFamily = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    const ok = await mutate(`/api/v1/residents/${detail.id}/family-members?societyId=${selectedSocietyId}`, 'POST', familyForm);
    if (!ok) return;
    setFamilyForm(EMPTY_FAMILY);
    setMessage({ tone: 'success', text: 'Family member added.' });
    await loadDetail(detail.id);
  };

  const submitVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    const ok = await mutate(`/api/v1/residents/${detail.id}/vehicles?societyId=${selectedSocietyId}`, 'POST', vehicleForm);
    if (!ok) return;
    setVehicleForm(EMPTY_VEHICLE);
    setMessage({ tone: 'success', text: 'Vehicle registered.' });
    await loadDetail(detail.id);
  };

  const updateVerification = async (residentId: string, documentStatus: string) => {
    const ok = await mutate(`/api/v1/residents/${residentId}?societyId=${selectedSocietyId}`, 'PATCH', { documentStatus });
    if (!ok) return;
    setMessage({ tone: 'success', text: 'Verification status updated.' });
    await refresh();
  };

  const archiveResident = async (residentId: string) => {
    if (!window.confirm('Archive this resident? History is preserved.')) return;
    const ok = await mutate(`/api/v1/residents/${residentId}?societyId=${selectedSocietyId}`, 'DELETE');
    if (!ok) return;
    if (detail?.id === residentId) setDetail(null);
    setMessage({ tone: 'success', text: 'Resident archived.' });
    await loadList(filters, 1, selectedSocietyId);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Society</CardTitle>
          <div className="w-full sm:w-80">
            <select aria-label="Society" className={selectClass} value={selectedSocietyId} onChange={(event) => changeSociety(event.target.value)}>
              {societies.map((society) => (
                <option key={society.id} value={society.id}>
                  {society.name}{society.city ? ` — ${society.city}` : ''}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="resident-search">Search</Label>
            <Input id="resident-search" placeholder="Name, phone, email, document" value={filters.search} onChange={(event) => applyFilter('search', event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="resident-type-filter">Filter by type</Label>
            <select id="resident-type-filter" className={selectClass} value={filters.residentType} onChange={(event) => applyFilter('residentType', event.target.value)}>
              <option value="">All types</option>
              {categories.residentTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="resident-status-filter">Filter by status</Label>
            <select id="resident-status-filter" className={selectClass} value={filters.status} onChange={(event) => applyFilter('status', event.target.value)}>
              <option value="">All statuses</option>
              {categories.residentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 sm:col-span-3">
            <Button variant="outline" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); void loadList(EMPTY_FILTERS, 1, selectedSocietyId); }}>Clear filters</Button>
            <span className="text-xs text-ink-500">{loading ? 'Loading…' : `${data.total} resident${data.total === 1 ? '' : 's'}`}</span>
          </div>
        </CardContent>
      </Card>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}

      {canCreate ? (
        <Card>
          <CardHeader><CardTitle>Add resident</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(event) => void submitResident(event)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1"><Label htmlFor="resident-name">Name</Label><Input id="resident-name" required value={residentForm.name} onChange={(event) => setResidentForm({ ...residentForm, name: event.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="resident-phone">Phone</Label><Input id="resident-phone" required value={residentForm.phone} onChange={(event) => setResidentForm({ ...residentForm, phone: event.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="resident-email">Email</Label><Input id="resident-email" type="email" value={residentForm.email} onChange={(event) => setResidentForm({ ...residentForm, email: event.target.value })} /></div>
              <div className="space-y-1">
                <Label htmlFor="resident-type">Resident type</Label>
                <select id="resident-type" className={selectClass} value={residentForm.residentType} onChange={(event) => setResidentForm({ ...residentForm, residentType: event.target.value })}>
                  {categories.residentTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label htmlFor="document-type">Document type</Label><Input id="document-type" value={residentForm.documentType} onChange={(event) => setResidentForm({ ...residentForm, documentType: event.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="document-number">Document number</Label><Input id="document-number" value={residentForm.documentNumber} onChange={(event) => setResidentForm({ ...residentForm, documentNumber: event.target.value })} /></div>
              <div className="space-y-1">
                <Label htmlFor="document-status">Verification</Label>
                <select id="document-status" className={selectClass} value={residentForm.documentStatus} onChange={(event) => setResidentForm({ ...residentForm, documentStatus: event.target.value })}>
                  {categories.documentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label htmlFor="resident-notes">Notes</Label><Input id="resident-notes" value={residentForm.notes} onChange={(event) => setResidentForm({ ...residentForm, notes: event.target.value })} /></div>
              <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Add resident</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle>Resident directory</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-ink-500">
                <tr><th className="py-2">Name</th><th className="py-2">Type</th><th className="py-2">Flat(s)</th><th className="py-2">Verification</th><th className="py-2" /></tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id} className="border-t border-ink-100 align-top">
                    <td className="py-2"><button type="button" className="text-left font-medium text-brand-700 hover:underline" onClick={() => void loadDetail(row.id)}>{row.name}</button><div className="text-xs text-ink-500">{row.phone}</div></td>
                    <td className="py-2">{row.residentType}</td>
                    <td className="py-2">{row.flats.length > 0 ? row.flats.join(', ') : '—'}</td>
                    <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${row.documentStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{row.documentStatus}</span></td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => void loadDetail(row.id)}>View</Button>
                        {canDelete ? <Button variant="ghost" size="sm" onClick={() => void archiveResident(row.id)}>Archive</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-ink-500">No residents found.</td></tr> : null}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-ink-500">Page {data.page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => { setPage(Math.max(1, page - 1)); void loadList(filters, Math.max(1, page - 1)); }}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => { setPage(Math.min(totalPages, page + 1)); void loadList(filters, Math.min(totalPages, page + 1)); }}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {detail ? (
            <Card>
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{detail.name}</CardTitle>
                {canUpdate ? (
                  <select
                    aria-label="Document verification"
                    className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-sm"
                    value={detail.documentStatus}
                    onChange={(event) => void updateVerification(detail.id, event.target.value)}
                  >
                    {categories.documentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-ink-600">{detail.residentType} · {detail.phone} · {detail.email ?? 'No email'}</p>
                <div>
                  <h3 className="font-medium">Ownership history</h3>
                  {detail.ownerships.length === 0 ? <p className="text-xs text-ink-500">No ownership records.</p> : (
                    <ul className="mt-1 space-y-1 text-xs">
                      {detail.ownerships.map((row) => <li key={row.id} className="flex justify-between gap-2"><span>{row.flat} · {row.fromDate}{row.toDate ? ` → ${row.toDate}` : ''}{row.isPrimary ? ' · primary' : ''}</span><span>{row.status}</span></li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">Tenancies</h3>
                  {detail.tenancies.length === 0 ? <p className="text-xs text-ink-500">No tenancy records.</p> : (
                    <ul className="mt-1 space-y-1 text-xs">
                      {detail.tenancies.map((row) => <li key={row.id} className="flex justify-between gap-2"><span>{row.flat} · {row.startDate}{row.endDate ? ` → ${row.endDate}` : ''}</span><span>{row.status}</span></li>)}
                    </ul>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="font-medium">Family</h3>
                    {detail.familyMembers.length === 0 ? <p className="text-xs text-ink-500">No family members.</p> : (
                      <ul className="mt-1 space-y-1 text-xs">{detail.familyMembers.map((row) => <li key={row.id}>{row.name} · {row.relationship}</li>)}</ul>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">Vehicles</h3>
                    {detail.vehicles.length === 0 ? <p className="text-xs text-ink-500">No vehicles.</p> : (
                      <ul className="mt-1 space-y-1 text-xs">{detail.vehicles.map((row) => <li key={row.id}>{row.registrationNumber} · {row.vehicleType}</li>)}</ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-10 text-center text-sm text-ink-500">Select a resident to view relationships and history.</CardContent></Card>
          )}

          {canCreate ? (
            <>
              <Card>
                <CardHeader><CardTitle>Link flat</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={(event) => void submitLink(event)} className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label htmlFor="link-kind">Record type</Label><select id="link-kind" className={selectClass} value={linkForm.kind} onChange={(event) => setLinkForm({ ...linkForm, kind: event.target.value })}><option value="OWNERSHIP">Ownership</option><option value="TENANCY">Tenancy</option></select></div>
                    <div className="space-y-1"><Label htmlFor="link-flat">Flat</Label><select id="link-flat" className={selectClass} required value={linkForm.flatId} onChange={(event) => setLinkForm({ ...linkForm, flatId: event.target.value })}><option value="">Select flat</option>{data.flats.map((flat) => <option key={flat.id} value={flat.id}>{flat.label}</option>)}</select></div>
                    <div className="space-y-1"><Label htmlFor="link-resident">Resident</Label><select id="link-resident" className={selectClass} required value={linkForm.residentId} onChange={(event) => setLinkForm({ ...linkForm, residentId: event.target.value })}><option value="">Select resident</option>{data.items.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></div>
                    <div className="space-y-1"><Label htmlFor="link-from">{linkForm.kind === 'OWNERSHIP' ? 'From date' : 'Start date'}</Label><Input id="link-from" type="date" required value={linkForm.fromDate} onChange={(event) => setLinkForm({ ...linkForm, fromDate: event.target.value })} /></div>
                    <div className="space-y-1"><Label htmlFor="link-to">{linkForm.kind === 'OWNERSHIP' ? 'To date' : 'End date'}</Label><Input id="link-to" type="date" value={linkForm.toDate} onChange={(event) => setLinkForm({ ...linkForm, toDate: event.target.value })} /></div>
                    {linkForm.kind === 'OWNERSHIP' ? (
                      <>
                        <div className="space-y-1"><Label htmlFor="link-share">Ownership share %</Label><Input id="link-share" type="number" min="0.01" max="100" step="0.01" value={linkForm.ownershipShare} onChange={(event) => setLinkForm({ ...linkForm, ownershipShare: event.target.value })} /></div>
                        <label className="flex items-center gap-2 pt-8 text-sm"><input type="checkbox" checked={linkForm.isPrimary} onChange={(event) => setLinkForm({ ...linkForm, isPrimary: event.target.checked })} /> Primary owner</label>
                      </>
                    ) : (
                      <div className="space-y-1"><Label htmlFor="link-rent">Monthly rent</Label><Input id="link-rent" type="number" min="0.01" step="0.01" value={linkForm.monthlyRent} onChange={(event) => setLinkForm({ ...linkForm, monthlyRent: event.target.value })} /></div>
                    )}
                    <div className="sm:col-span-2"><Button type="submit">Add {linkForm.kind.toLowerCase()} record</Button></div>
                  </form>
                </CardContent>
              </Card>

              {detail ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>Add family member</CardTitle></CardHeader>
                    <CardContent>
                      <form onSubmit={(event) => void submitFamily(event)} className="space-y-2">
                        <Input aria-label="Family name" placeholder="Name" required value={familyForm.name} onChange={(event) => setFamilyForm({ ...familyForm, name: event.target.value })} />
                        <select aria-label="Relationship" className={selectClass} value={familyForm.relationship} onChange={(event) => setFamilyForm({ ...familyForm, relationship: event.target.value })}>{categories.relationships.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                        <Input aria-label="Family phone" placeholder="Phone" value={familyForm.phone} onChange={(event) => setFamilyForm({ ...familyForm, phone: event.target.value })} />
                        <Input aria-label="Date of birth" type="date" value={familyForm.dateOfBirth} onChange={(event) => setFamilyForm({ ...familyForm, dateOfBirth: event.target.value })} />
                        <Button type="submit" size="sm">Add family member</Button>
                      </form>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Register vehicle</CardTitle></CardHeader>
                    <CardContent>
                      <form onSubmit={(event) => void submitVehicle(event)} className="space-y-2">
                        <Input aria-label="Registration number" placeholder="Registration number" required value={vehicleForm.registrationNumber} onChange={(event) => setVehicleForm({ ...vehicleForm, registrationNumber: event.target.value })} />
                        <select aria-label="Vehicle type" className={selectClass} value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm({ ...vehicleForm, vehicleType: event.target.value })}>{categories.vehicleTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                        <Input aria-label="Make" placeholder="Make" value={vehicleForm.make} onChange={(event) => setVehicleForm({ ...vehicleForm, make: event.target.value })} />
                        <Input aria-label="Model" placeholder="Model" value={vehicleForm.model} onChange={(event) => setVehicleForm({ ...vehicleForm, model: event.target.value })} />
                        <Button type="submit" size="sm">Register vehicle</Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
