import { z } from 'zod';

/** Password policy baseline; MFA is required for privileged users (SRS 15.1). */
export const passwordSchema = z.string().min(8).max(128);

/** Intent selects the sign-in shell only; authority always comes from server-side roles. */
export const loginIntentSchema = z.enum(['PLATFORM', 'COMPANY']);

export const loginSchema = z.object({
  email: z.email().max(254).toLowerCase(),
  password: z.string().min(1).max(128),
  loginIntent: loginIntentSchema.optional(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.email().max(254).toLowerCase(),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  newPassword: passwordSchema,
}).strict();

/**
 * Public company registration. Creates the tenant, its deny-by-default module
 * entitlements, and the first company administrator in one transaction.
 */
export const companyRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/),
  countryCode: z.string().length(2).toUpperCase().default('IN'),
  currencyCode: z.string().length(3).toUpperCase().default('INR'),
  timezone: z.string().trim().min(3).max(64).default('Asia/Kolkata'),
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.email().max(254).toLowerCase(),
  adminPassword: passwordSchema,
}).strict();

/** Platform/company administrator resets a tenant user's password (audited). */
export const adminResetPasswordSchema = z.object({
  newPassword: passwordSchema,
  reason: z.string().trim().min(5).max(500),
}).strict();

/** Platform/company administrator changes a tenant user's login email (audited). */
export const adminUpdateUserEmailSchema = z.object({
  newEmail: z.email().max(254).toLowerCase(),
  reason: z.string().trim().min(5).max(500),
}).strict();

export const switchCompanySchema = z.object({
  companyId: z.uuid(),
  societyId: z.uuid().nullable().optional(),
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginIntent = z.infer<typeof loginIntentSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SwitchCompanyInput = z.infer<typeof switchCompanySchema>;
export type CompanyRegistrationInput = z.infer<typeof companyRegistrationSchema>;
export type CompanyRegistrationFormInput = z.input<typeof companyRegistrationSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
