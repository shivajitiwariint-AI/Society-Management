'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  Layers3,
  Mail,
  Power,
  Trash2,
} from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface CompanyUserOption {
  id: string;
  name: string;
  email: string;
}

interface CompanyActionsProps {
  companyId: string;
  companyName: string;
  companyCode: string;
  initialStatus: CompanyStatus;
  canUpdate: boolean;
  canDelete: boolean;
  users: readonly CompanyUserOption[];
}

export function CompanyActions({
  companyId,
  companyName,
  companyCode,
  initialStatus,
  canUpdate,
  canDelete,
  users,
}: CompanyActionsProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const passwordDialogRef = useRef<HTMLDialogElement>(null);
  const emailDialogRef = useRef<HTMLDialogElement>(null);

  const [status, setStatus] = useState(initialStatus);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [reason, setReason] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [passwordReason, setPasswordReason] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedEmailUserId, setSelectedEmailUserId] = useState(users[0]?.id ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [emailReason, setEmailReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (deleteOpen && !dialog.open) dialog.showModal();
    if (!deleteOpen && dialog.open) dialog.close();
  }, [deleteOpen]);

  useEffect(() => {
    const dialog = passwordDialogRef.current;
    if (!dialog) return;
    if (passwordOpen && !dialog.open) dialog.showModal();
    if (!passwordOpen && dialog.open) dialog.close();
  }, [passwordOpen]);

  useEffect(() => {
    const dialog = emailDialogRef.current;
    if (!dialog) return;
    if (emailOpen && !dialog.open) dialog.showModal();
    if (!emailOpen && dialog.open) dialog.close();
  }, [emailOpen]);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  function csrfToken(): string {
    return decodeURIComponent(
      document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('society_csrf='))
        ?.split('=')[1] ?? '',
    );
  }

  async function openDashboard() {
    closeMenu();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/context/company', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ companyId, societyId: null }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to open this company');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to open this company' });
      setBusy(false);
    }
  }

  function openModules() {
    closeMenu();
    router.push(`/companies/${companyId}/modules`);
  }

  async function changeStatus() {
    closeMenu();
    const nextStatus = status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const action = nextStatus === 'ACTIVE' ? 'enable' : 'disable';
    if (nextStatus === 'SUSPENDED' && !window.confirm(`Disable ${companyName}? Members will lose access to this workspace.`)) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({
          status: nextStatus,
          reason: `Company ${action}d by a platform administrator`,
        }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? `Unable to ${action} company`);
      setStatus(nextStatus);
      setMessage({ tone: 'success', text: `${companyName} is now ${nextStatus.toLowerCase()}.` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : `Unable to ${action} company` });
    } finally {
      setBusy(false);
    }
  }

  function openPasswordReset() {
    closeMenu();
    setMessage(null);
    setNewPassword('');
    setPasswordReason('');
    setSelectedUserId(users[0]?.id ?? '');
    setPasswordOpen(true);
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUserId) return;
    if (newPassword.length < 8 || passwordReason.trim().length < 5) {
      setMessage({ tone: 'error', text: 'Use a password of at least 8 characters and a reason of at least 5 characters.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/users/${selectedUserId}/password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ newPassword, reason: passwordReason.trim() }),
      });
      const body = (await response.json()) as { error?: { message?: string }; sessionsRevoked?: number };
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to reset the password');
      setMessage({
        tone: 'success',
        text: `Password reset. ${body.sessionsRevoked ?? 0} active session(s) revoked.`,
      });
      setPasswordOpen(false);
      setNewPassword('');
      setPasswordReason('');
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to reset the password' });
    } finally {
      setBusy(false);
    }
  }

  function openEmailChange() {
    closeMenu();
    setMessage(null);
    setNewEmail('');
    setEmailReason('');
    setSelectedEmailUserId(users[0]?.id ?? '');
    setEmailOpen(true);
  }

  async function submitEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmailUserId) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail.trim()) || emailReason.trim().length < 5) {
      setMessage({ tone: 'error', text: 'Enter a valid email address and a reason of at least 5 characters.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/users/${selectedEmailUserId}/email`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ newEmail: newEmail.trim(), reason: emailReason.trim() }),
      });
      const body = (await response.json()) as { error?: { message?: string }; email?: string };
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to change the login email');
      setMessage({ tone: 'success', text: `Login email changed to ${body.email ?? newEmail.trim()}.` });
      setEmailOpen(false);
      setNewEmail('');
      setEmailReason('');
      router.refresh();
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to change the login email' });
    } finally {
      setBusy(false);
    }
  }

  const normalizedConfirmation = confirmationCode.trim().toLowerCase();
  const confirmationMatches =
    Boolean(normalizedConfirmation) &&
    (normalizedConfirmation === companyCode.trim().toLowerCase() ||
      normalizedConfirmation === companyName.trim().toLowerCase());

  async function deleteCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ confirmationCode: confirmationMatches ? companyCode : confirmationCode, reason }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to delete company');
      setDeleteOpen(false);
      setMessage({ tone: 'success', text: `${companyName} was deleted.` });
      router.refresh();
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to delete company' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && !deleteOpen && !passwordOpen && !emailOpen ? (
        <Alert className="mb-2 min-w-48" tone={message.tone}>{message.text}</Alert>
      ) : null}

      <details ref={menuRef} className="action-menu">
        <summary className="btn-modern btn-secondary btn-sm" aria-label={`Actions for ${companyName}`}>
          Actions <ChevronDown className="h-3.5 w-3.5" />
        </summary>
        <div className="action-menu-pop">
          <button type="button" onClick={() => void openDashboard()} disabled={busy}>
            <LayoutDashboard className="h-4 w-4" /> Open dashboard
          </button>
          <button type="button" onClick={openModules} disabled={busy}>
            <Layers3 className="h-4 w-4" /> Configure modules
          </button>
          <button type="button" onClick={openPasswordReset} disabled={busy}>
            <KeyRound className="h-4 w-4" /> Reset password
          </button>
          <button type="button" onClick={openEmailChange} disabled={busy}>
            <Mail className="h-4 w-4" /> Change login email
          </button>
          {canUpdate ? (
            <button type="button" onClick={() => void changeStatus()} disabled={busy}>
              <Power className="h-4 w-4" /> {status === 'ACTIVE' ? 'Disable company' : 'Enable company'}
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="action-menu-danger"
              disabled={busy}
              onClick={() => {
                closeMenu();
                setMessage(null);
                setConfirmationCode('');
                setReason('');
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete company
            </button>
          ) : null}
        </div>
      </details>

      <dialog
        ref={passwordDialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/50"
        aria-labelledby={`reset-password-title-${companyId}`}
        onCancel={(event) => { event.preventDefault(); setPasswordOpen(false); }}
      >
        <form onSubmit={resetPassword} className="space-y-5 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Account access</p>
            <h2 id={`reset-password-title-${companyId}`} className="mt-2 text-xl font-semibold">
              Reset a password for {companyName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Choose a company user and set a new password. All active sessions for that user will be revoked and the change will be audited.
            </p>
          </div>

          {users.length === 0 ? (
            <Alert tone="info">This company has no users yet.</Alert>
          ) : (
            <>
              <div>
                <Label htmlFor={`reset-user-${companyId}`}>Company login</Label>
                <select
                  id={`reset-user-${companyId}`}
                  className="h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  required
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} · {user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`reset-password-${companyId}`}>New password</Label>
                <Input
                  id={`reset-password-${companyId}`}
                  type="password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <Label htmlFor={`reset-reason-${companyId}`}>Audit reason</Label>
                <Input
                  id={`reset-reason-${companyId}`}
                  minLength={5}
                  maxLength={500}
                  required
                  value={passwordReason}
                  onChange={(event) => setPasswordReason(event.target.value)}
                  placeholder="Support ticket or request"
                />
              </div>
              {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setPasswordOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || !selectedUserId}>
                  {busy ? 'Resetting…' : 'Reset password'}
                </Button>
              </div>
            </>
          )}
        </form>
      </dialog>

      <dialog
        ref={emailDialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/50"
        aria-labelledby={`email-title-${companyId}`}
        onCancel={(event) => { event.preventDefault(); setEmailOpen(false); }}
      >
        <form onSubmit={submitEmailChange} className="space-y-5 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Account access</p>
            <h2 id={`email-title-${companyId}`} className="mt-2 text-xl font-semibold">
              Change a login email for {companyName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Choose a company user and set a new login email. The change is checked for duplicates and recorded in the audit trail.
            </p>
          </div>

          {users.length === 0 ? (
            <Alert tone="info">This company has no users yet.</Alert>
          ) : (
            <>
              <div>
                <Label htmlFor={`email-user-${companyId}`}>Company login</Label>
                <select
                  id={`email-user-${companyId}`}
                  className="h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm"
                  value={selectedEmailUserId}
                  onChange={(event) => setSelectedEmailUserId(event.target.value)}
                  required
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} · {user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`new-email-${companyId}`}>New login email</Label>
                <Input
                  id={`new-email-${companyId}`}
                  type="email"
                  maxLength={254}
                  required
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <Label htmlFor={`email-reason-${companyId}`}>Audit reason</Label>
                <Input
                  id={`email-reason-${companyId}`}
                  minLength={5}
                  maxLength={500}
                  required
                  value={emailReason}
                  onChange={(event) => setEmailReason(event.target.value)}
                  placeholder="Support ticket or request"
                />
              </div>
              {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => setEmailOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || !selectedEmailUserId}>
                  {busy ? 'Saving…' : 'Change login email'}
                </Button>
              </div>
            </>
          )}
        </form>
      </dialog>

      {canDelete ? (
        <dialog
          ref={deleteDialogRef}
          className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/50"
          aria-labelledby={`delete-company-title-${companyId}`}
          aria-describedby={`delete-company-description-${companyId}`}
          onCancel={(event) => { event.preventDefault(); setDeleteOpen(false); }}
        >
          <form onSubmit={deleteCompany} className="space-y-5 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-700">Permanent action</p>
              <h2 id={`delete-company-title-${companyId}`} className="mt-2 text-xl font-semibold">
                Delete {companyName}?
              </h2>
              <p id={`delete-company-description-${companyId}`} className="mt-2 text-sm leading-6 text-ink-500">
                This permanently removes the company and its properties, residents, finance records, memberships, sessions, and company audit history.
                A platform audit entry will be retained.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`confirm-company-code-${companyId}`}>Type the company code or name to confirm</Label>
              <p className="text-xs text-ink-500">
                Company code:{' '}
                <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono font-semibold text-ink-900">
                  {companyCode}
                </code>
              </p>
              <Input
                id={`confirm-company-code-${companyId}`}
                autoComplete="off"
                value={confirmationCode}
                onChange={(event) => setConfirmationCode(event.target.value)}
                placeholder={companyCode}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`delete-company-reason-${companyId}`}>Reason for deletion</Label>
              <Input
                id={`delete-company-reason-${companyId}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why this company is being removed"
                minLength={5}
                maxLength={500}
                required
              />
            </div>

            {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={busy || !confirmationMatches || reason.trim().length < 5}>
                {busy ? 'Deleting…' : 'Delete company and data'}
              </Button>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
