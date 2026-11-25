import { z } from 'zod';
import { passwordSchema } from './auth';

export const companyStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']);

export const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  countryCode: z.string().length(2).toUpperCase().default('IN'),
  currencyCode: z.string().length(3).toUpperCase().default('INR'),
  timezone: z.string().trim().min(3).max(64).default('Asia/Kolkata'),
}).strict();

export const updateCompanySchema = createCompanySchema.partial().extend({
  status: companyStatusSchema.optional(),
}).strict();

/** Platform edit of company profile with an audited reason. */
export const updateCompanyProfileSchema = createCompanySchema.extend({
  reason: z.string().trim().min(5).max(500),
}).strict();

export const companyStatusChangeSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().min(5).max(500),
}).strict();

export const deleteCompanySchema = z.object({
  confirmationCode: z.string().trim().min(2).max(40),
  reason: z.string().trim().min(5).max(500),
}).strict();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;

/** Platform administration of users inside one company workspace. */
export const createCompanyUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254).toLowerCase(),
  password: passwordSchema,
  roleId: z.uuid(),
  reason: z.string().trim().min(5).max(500),
}).strict();

export const updateCompanyUserSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  roleId: z.uuid().optional(),
  reason: z.string().trim().min(5).max(500),
}).strict().refine((value) => value.status !== undefined || value.roleId !== undefined, {
  message: 'Provide a status or a role to change',
});

export type CreateCompanyUserInput = z.infer<typeof createCompanyUserSchema>;
export type UpdateCompanyUserInput = z.infer<typeof updateCompanyUserSchema>;
