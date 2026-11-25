import { z } from 'zod';
import { ACCESS_MODES, DATA_SCOPES, PERMISSION_ACTIONS, ROLE_SCOPES } from '@society/shared';

export const assignRoleSchema = z.object({
  userId: z.uuid(),
  roleId: z.uuid(),
  companyId: z.uuid(),
  societyId: z.uuid().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
}).strict();

export const createRoleSchema = z.object({
  companyId: z.uuid().nullable(),
  societyId: z.uuid().nullable().optional(),
  name: z.string().trim().min(2).max(100),
  key: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(500).optional(),
}).strict();

export const grantPermissionSchema = z.object({
  roleId: z.uuid(),
  permissionKey: z.string().min(3).max(200),
  dataScope: z.enum(DATA_SCOPES),
}).strict();

export const entitlementChangeSchema = z.object({
  moduleKey: z.string().min(2).max(80),
  accessMode: z.enum(ACCESS_MODES),
  reason: z.string().trim().min(5).max(500),
}).strict();

export const permissionQuerySchema = z.object({
  moduleKey: z.string().min(2).max(80).optional(),
  resourceKey: z.string().min(2).max(80).optional(),
  action: z.enum(PERMISSION_ACTIONS).optional(),
}).strict();

export const roleScopeSchema = z.enum(ROLE_SCOPES);

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
export type EntitlementChangeInput = z.infer<typeof entitlementChangeSchema>;
