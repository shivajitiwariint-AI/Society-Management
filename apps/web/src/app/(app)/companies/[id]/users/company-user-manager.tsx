'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CompanyUserRow {
  id: string;
  email: string;
  name: string;
  status: string;
  membershipStatus: string;
  lastLoginAt: string | null;
  roleId: string;
  roleName: string | null;
}

export interface RoleOption {
  id: string;
  label: string;
}

type Message = { tone: 'success' | 'error'; text: string };

function csrfToken(): string {
  const raw = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('society_csrf='))
    ?.split('=')[1] ?? '';
  return decodeURIComponent(raw);
}

export function CompanyUserManager({
  companyId,
  rows,
  roles,
}: {
  companyId: string;
  rows: readonly CompanyUserRow[];
  roles: readonly RoleOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function requestJson(url: string, method: string, body: unknown): Promise<{ ok: boolean; body: { error?: { message?: string }; sessionsRevoked?: number } }> {
    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, body: await response.json() };
  }

  function errorText(body: { error?: { message?: string } }, fallback: string): string {
    return body.error?.message ?? fallback;
  }

  async function saveRole(event: FormEvent<HTMLFormElement>, row: CompanyUserRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roleId = String(form.get('roleId') ?? '');
    const reason = String(form.get('reason') ?? '').trim();
    if (!roleId || reason.length < 5) {
      setMessage({ tone: 'error', text: 'Choose a role and enter a reason of at least 5 characters.' });
      return;
    }
    setBusyId(row.id);
    setMessage(null);
    try {
      const result = await requestJson(`/api/v1/companies/${companyId}/users/${row.id}`, 'PATCH', { roleId, reason });
      if (!result.ok) {
        setMessage({ tone: 'error', text: errorText(result.body, 'Unable to assign the role.') });
        return;
      }
      setMessage({ tone: 'success', text: `Role updated for ${row.email}.` });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(row: CompanyUserRow) {
    const reason = window.prompt('Reason for changing this user status (audited):', 'Administrative status change');
    if (!reason || reason.trim().length < 5) return;
    const nextStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusyId(row.id);
    setMessage(null);
    try {
      const result = await requestJson(`/api/v1/companies/${companyId}/users/${row.id}`, 'PATCH', {
        status: nextStatus,
        reason: reason.trim(),
      });
      if (!result.ok) {
        setMessage({ tone: 'error', text: errorText(result.body, 'Unable to change user status.') });
        return;
      }
      setMessage({ tone: 'success', text: `${row.email} is now ${nextStatus.toLowerCase()}.` });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>, row: CompanyUserRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') ?? '');
    const reason = String(form.get('reason') ?? '').trim();
    if (newPassword.length < 8 || reason.length < 5) {
      setMessage({ tone: 'error', text: 'Use a password of at least 8 characters and an audit reason.' });
      return;
    }
    setBusyId(row.id);
    setMessage(null);
    try {
      const result = await requestJson(`/api/v1/users/${row.id}/password`, 'POST', { newPassword, reason });
      if (!result.ok) {
        setMessage({ tone: 'error', text: errorText(result.body, 'Unable to reset the password.') });
        return;
      }
      setMessage({ tone: 'success', text: `Password reset for ${row.email}. ${result.body.sessionsRevoked ?? 0} session(s) revoked.` });
      event.currentTarget.reset();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyId(null);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (String(data.get('reason') ?? '').trim().length < 5) {
      setMessage({ tone: 'error', text: 'Provide an audit reason of at least 5 characters.' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const result = await requestJson(`/api/v1/companies/${companyId}/users`, 'POST', {
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
        roleId: String(data.get('roleId') ?? ''),
        reason: String(data.get('reason') ?? '').trim(),
      });
      if (!result.ok) {
        setMessage({ tone: 'error', text: errorText(result.body, 'Unable to create the user.') });
        return;
      }
      setMessage({ tone: 'success', text: 'Company user created with the selected role.' });
      form.reset();
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-7">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <section className="create-panel" aria-label="Add a company user">
        <div className="create-panel-head">
          <span className="create-panel-icon"><UserPlus className="h-5 w-5" /></span>
          <div>
            <h2 className="section-title">Add a company user</h2>
            <p className="section-subtitle">Creates the account, membership and role assignment together.</p>
          </div>
        </div>
        <div className="create-panel-body">
          <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-user-name">Full name</Label>
              <Input id="new-user-name" name="name" required minLength={2} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="new-user-email">Email address</Label>
              <Input id="new-user-email" name="email" type="email" required maxLength={254} />
            </div>
            <div>
              <Label htmlFor="new-user-password">Initial password</Label>
              <Input id="new-user-password" name="password" type="password" required minLength={8} maxLength={128} />
              <p className="mt-1 text-[11px] text-ink-500">Minimum 8 characters.</p>
            </div>
            <div>
              <Label htmlFor="new-user-role">Role</Label>
              <select id="new-user-role" name="roleId" required className="h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm">
                <option value="">Select a role</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="new-user-reason">Reason for creating this user</Label>
              <Input id="new-user-reason" name="reason" required minLength={5} maxLength={500} placeholder="Support request or onboarding ticket" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating}>
                <UserPlus className="h-4 w-4" /> {creating ? 'Creating…' : 'Create user'}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section aria-label="Company users">
        <div className="section-heading">
          <h2 className="section-title">Users ({rows.length})</h2>
          <span className="section-count">Role &amp; password controls</span>
        </div>

        {rows.length === 0 ? (
          <div className="society-empty">
            <span className="society-empty-icon"><ShieldCheck className="h-6 w-6" /></span>
            <h3>No users yet</h3>
            <p>Create the first user for this company using the form above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="data-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-bold tracking-[-0.015em] text-ink-900">{row.name || row.email}</p>
                    <p className="text-sm text-ink-500">{row.email}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <span className={`status-pill ${row.status === 'ACTIVE' ? 'status-pill-success' : 'status-pill-muted'}`}>
                        {row.status.toLowerCase()}
                      </span>
                      <span>{row.roleName ?? 'No company role'}</span>
                      <span>·</span>
                      <span>{row.lastLoginAt ? `Last sign-in ${new Date(row.lastLoginAt).toLocaleDateString('en-IN')}` : 'Never signed in'}</span>
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={busyId === row.id} onClick={() => void toggleStatus(row)}>
                    {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <form onSubmit={(event) => void saveRole(event, row)} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1">
                      <Label htmlFor={`role-${row.id}`}>Company role</Label>
                      <select
                        id={`role-${row.id}`}
                        name="roleId"
                        defaultValue={row.roleId}
                        className="h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm"
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                      </select>
                    </div>
                    <div className="min-w-40 flex-1">
                      <Label htmlFor={`role-reason-${row.id}`}>Reason</Label>
                      <Input id={`role-reason-${row.id}`} name="reason" minLength={5} maxLength={500} placeholder="Audit reason" />
                    </div>
                    <Button type="submit" size="sm" variant="outline" disabled={busyId === row.id}>
                      Save role
                    </Button>
                  </form>

                  <form onSubmit={(event) => void resetPassword(event, row)} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-44 flex-1">
                      <Label htmlFor={`new-password-${row.id}`}>New password</Label>
                      <Input id={`new-password-${row.id}`} name="newPassword" type="password" minLength={8} maxLength={128} />
                    </div>
                    <div className="min-w-40 flex-1">
                      <Label htmlFor={`password-reason-${row.id}`}>Reason</Label>
                      <Input id={`password-reason-${row.id}`} name="reason" minLength={5} maxLength={500} placeholder="Audit reason" />
                    </div>
                    <Button type="submit" size="sm" variant="outline" disabled={busyId === row.id}>
                      <KeyRound className="h-4 w-4" /> Reset password
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
