'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, KeyRound, Layers3, Power, PowerOff } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ModuleManagerRow {
  moduleKey: string;
  name: string;
  isCore: boolean;
  isEnabled: boolean;
  accessMode: string;
  requires: Array<{ key: string; name: string }>;
}

type Filter = 'all' | 'enabled' | 'disabled';
type Mode = 'FULL' | 'READ_ONLY' | 'DISABLED';

export function ModuleManager({ companyId, modules }: { companyId: string; modules: readonly ModuleManagerRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const enabledCount = modules.filter((module) => module.isEnabled).length;
  const disabledCount = modules.length - enabledCount;
  const visible = modules.filter((module) =>
    filter === 'all' ? true : filter === 'enabled' ? module.isEnabled : !module.isEnabled,
  );
  const enabledKeys = new Set(modules.filter((module) => module.isEnabled).map((module) => module.moduleKey));

  async function changeMode(module: ModuleManagerRow, mode: Mode) {
    const reason =
      (reasons[module.moduleKey] ?? '').trim() ||
      `${mode === 'DISABLED' ? 'Disabled' : mode === 'READ_ONLY' ? 'Set to read only' : 'Enabled'} by platform administrator`;
    if (mode === 'DISABLED' && !window.confirm(`Disable ${module.name} for this company? If other enabled modules depend on it, you will be shown the exact steps to disable them first (or you can override as platform administrator).`)) {
      return;
    }

    setBusyKey(module.moduleKey);
    setMessage(null);
    const csrfToken = decodeURIComponent(
      document.cookie.split('; ').find((entry) => entry.startsWith('society_csrf='))?.split('=')[1] ?? '',
    );
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/modules`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ moduleKey: module.moduleKey, accessMode: mode, reason }),
      });
      const body = (await response.json()) as { error?: { message?: string }; warning?: string };
      if (!response.ok) {
        setMessage({ tone: 'error', text: body.error?.message ?? `Unable to update ${module.name}.` });
        return;
      }
      setMessage({
        tone: 'success',
        text: `${module.name} is now ${mode === 'DISABLED' ? 'disabled' : mode === 'READ_ONLY' ? 'read only' : 'enabled'}.${body.warning ? ` ${body.warning}` : ''}`,
      });
      setReasons((current) => ({ ...current, [module.moduleKey]: '' }));
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="module-manager">
      <div className="module-message">
        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      </div>

      <div className="module-manager-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`module-filter${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
            All <span>{modules.length}</span>
          </button>
          <button type="button" className={`module-filter${filter === 'enabled' ? ' active' : ''}`} onClick={() => setFilter('enabled')}>
            Enabled <span>{enabledCount}</span>
          </button>
          <button type="button" className={`module-filter${filter === 'disabled' ? ' active' : ''}`} onClick={() => setFilter('disabled')}>
            Disabled <span>{disabledCount}</span>
          </button>
        </div>
        <p className="module-manager-hint">
          <Check className="h-3.5 w-3.5" /> Changes are permission-checked, dependency-checked and audited.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="society-empty">
          <span className="society-empty-icon"><Layers3 className="h-6 w-6" /></span>
          <h3>No modules in this view</h3>
          <p>Choose another filter to see more modules.</p>
        </div>
      ) : (
        <div className="module-list">
          {visible.map((module) => {
            const busy = busyKey === module.moduleKey;
            const mode: Mode = module.accessMode === 'FULL' || module.accessMode === 'READ_ONLY'
              ? module.accessMode
              : 'DISABLED';
            return (
              <div key={module.moduleKey} className="module-row">
                <div className="module-row-main">
                  <span className={`module-row-icon${module.isEnabled ? ' enabled' : ''}`}>
                    <Layers3 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="module-row-name">{module.name}</p>
                      {!module.isCore ? (
                        <span className={`status-pill ${module.isEnabled ? (mode === 'READ_ONLY' ? 'status-pill-warning' : 'status-pill-success') : 'status-pill-muted'}`}>
                          {module.isEnabled ? (mode === 'READ_ONLY' ? 'Read only' : 'Enabled') : 'Disabled'}
                        </span>
                      ) : null}
                    </div>
                    <p className="module-row-key">{module.moduleKey}</p>
                    {module.requires.length > 0 ? (
                      <div className="module-deps">
                        <span>Requires</span>
                        {module.requires.map((dependency) => (
                          <span key={dependency.key} className={`module-dep-chip${enabledKeys.has(dependency.key) ? ' ready' : ''}`}>
                            {dependency.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="module-row-actions">
                  {module.isCore ? (
                    <span className="status-pill status-pill-brand">Always enabled</span>
                  ) : (
                    <>
                      <div className="min-w-40 flex-1">
                        <Input
                          aria-label={`Reason for changing ${module.name}`}
                          placeholder="Reason (optional)"
                          maxLength={500}
                          value={reasons[module.moduleKey] ?? ''}
                          onChange={(event) => setReasons((current) => ({ ...current, [module.moduleKey]: event.target.value }))}
                        />
                      </div>
                      {module.isEnabled ? (
                        <>
                          {mode === 'READ_ONLY' ? (
                            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void changeMode(module, 'FULL')}>
                              <KeyRound className="h-3.5 w-3.5" /> Full access
                            </Button>
                          ) : (
                            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void changeMode(module, 'READ_ONLY')}>
                              <KeyRound className="h-3.5 w-3.5" /> Read only
                            </Button>
                          )}
                          <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void changeMode(module, 'DISABLED')}>
                            <PowerOff className="h-3.5 w-3.5" /> Disable
                          </Button>
                        </>
                      ) : (
                        <Button type="button" size="sm" disabled={busy} onClick={() => void changeMode(module, 'FULL')}>
                          <Power className="h-3.5 w-3.5" /> Enable
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
