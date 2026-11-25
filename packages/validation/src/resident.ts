import { z } from 'zod';
import {
  DOCUMENT_VERIFICATION_STATUSES,
  FAMILY_RELATIONSHIPS,
  OWNERSHIP_STATUSES,
  RESIDENT_STATUSES,
  RESIDENT_TYPES,
  TENANCY_STATUSES,
  VEHICLE_TYPES,
} from '@society/shared';

const phoneSchema = z.string().trim().regex(/^[0-9+\-() ]{6,20}$/, 'Enter a valid phone number');
const emailSchema = z.email().max(254);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** HTML forms submit empty strings for untouched optional fields. */
function optionalFormValue<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

export const createResidentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: phoneSchema,
  email: optionalFormValue(emailSchema),
  residentType: z.enum(RESIDENT_TYPES),
  documentType: optionalFormValue(z.string().trim().max(50)),
  documentNumber: optionalFormValue(z.string().trim().max(80)),
  documentStatus: z.enum(DOCUMENT_VERIFICATION_STATUSES).default('PENDING'),
  notes: optionalFormValue(z.string().trim().max(500)),
}).strict();

export const updateResidentSchema = createResidentSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const residentQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  residentType: z.enum(RESIDENT_TYPES).optional(),
  status: z.enum(RESIDENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const createOwnershipSchema = z.object({
  flatId: z.uuid(),
  residentId: z.uuid(),
  fromDate: dateSchema,
  toDate: optionalFormValue(dateSchema),
  ownershipShare: z.number().min(0.01).max(100).optional(),
  isPrimary: z.boolean().default(false),
  status: z.enum(OWNERSHIP_STATUSES).default('ACTIVE'),
}).strict().refine(
  (value) => !value.toDate || value.toDate >= value.fromDate,
  { message: 'toDate must not precede fromDate', path: ['toDate'] },
);

export const updateOwnershipSchema = z.object({
  fromDate: dateSchema.optional(),
  toDate: dateSchema.nullable().optional(),
  ownershipShare: z.number().min(0.01).max(100).nullable().optional(),
  isPrimary: z.boolean().optional(),
  status: z.enum(OWNERSHIP_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createTenancySchema = z.object({
  flatId: z.uuid(),
  residentId: z.uuid(),
  startDate: dateSchema,
  endDate: optionalFormValue(dateSchema),
  monthlyRent: z.number().positive().max(100_000_000).optional(),
  status: z.enum(TENANCY_STATUSES).default('ACTIVE'),
}).strict().refine(
  (value) => !value.endDate || value.endDate >= value.startDate,
  { message: 'endDate must not precede startDate', path: ['endDate'] },
);

export const updateTenancySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.nullable().optional(),
  monthlyRent: z.number().positive().max(100_000_000).nullable().optional(),
  status: z.enum(TENANCY_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createFamilyMemberSchema = z.object({
  name: z.string().trim().min(1).max(200),
  relationship: z.enum(FAMILY_RELATIONSHIPS),
  phone: optionalFormValue(phoneSchema),
  dateOfBirth: optionalFormValue(dateSchema),
  documentStatus: z.enum(DOCUMENT_VERIFICATION_STATUSES).default('PENDING'),
}).strict();

export const updateFamilyMemberSchema = createFamilyMemberSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const createVehicleSchema = z.object({
  registrationNumber: z.string().trim().min(3).max(30).transform((value) => value.toUpperCase()),
  vehicleType: z.enum(VEHICLE_TYPES),
  make: optionalFormValue(z.string().trim().max(80)),
  model: optionalFormValue(z.string().trim().max(80)),
}).strict();

export const updateVehicleSchema = createVehicleSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type UpdateResidentInput = z.infer<typeof updateResidentSchema>;
export type ResidentQuery = z.infer<typeof residentQuerySchema>;
export type CreateOwnershipInput = z.infer<typeof createOwnershipSchema>;
export type UpdateOwnershipInput = z.infer<typeof updateOwnershipSchema>;
export type CreateTenancyInput = z.infer<typeof createTenancySchema>;
export type UpdateTenancyInput = z.infer<typeof updateTenancySchema>;
export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberSchema>;
export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
