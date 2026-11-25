import {
  MODULES,
  isCoreModule,
  type ModuleKey,
  type PermissionAction,
  type AccessMode,
} from '@society/shared';
import { err, ok, type AuthorizationResult } from '@society/shared';
import type { RequestContext } from './context';

const READ_ACTIONS: ReadonlySet<PermissionAction> = new Set(['READ', 'EXPORT']);

export function moduleAccessMode(context: RequestContext, moduleKey: ModuleKey): AccessMode {
  if (isCoreModule(moduleKey)) return 'FULL';
  return context.entitlements.get(moduleKey)?.accessMode ?? 'DISABLED';
}

/**
 * Navigation filter only. Server-side handlers must still call authorize()
 * for every operation (SRS 7.2, 11.2).
 */
export function canAccessModule(
  context: RequestContext,
  moduleKey: ModuleKey,
  action: PermissionAction = 'READ',
): AuthorizationResult {
  const mode = moduleAccessMode(context, moduleKey);
  if (mode === 'DISABLED') return err({ reason: 'MODULE_DISABLED', message: `Module '${moduleKey}' is disabled` });
  if (mode === 'READ_ONLY' && !READ_ACTIONS.has(action)) {
    return err({ reason: 'MODULE_READ_ONLY', message: `Module '${moduleKey}' is read-only` });
  }
  return ok(undefined);
}

/** Module keys safe to render in the navigation for the active company. */
export function visibleModules(context: RequestContext): readonly ModuleKey[] {
  return MODULES.filter((module) => moduleAccessMode(context, module.key) !== 'DISABLED').map((module) => module.key);
}
