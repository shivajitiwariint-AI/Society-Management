import { z } from 'zod';

export const createSocietySchema = z.object({
  name: z.string().trim().min(2).max(200),
  registrationNumber: z.string().trim().max(100).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  countryCode: z.string().length(2).toUpperCase().default('IN'),
  timezone: z.string().trim().min(3).max(64).default('Asia/Kolkata'),
}).strict();

export const createBuildingSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(40),
  floorCount: z.number().int().min(0).max(200).default(0),
}).strict();

export const createFloorSchema = z.object({
  buildingId: z.uuid(),
  name: z.string().trim().min(1).max(40),
  floorNumber: z.number().int().min(-10).max(300),
}).strict();

export const createFlatSchema = z.object({
  floorId: z.uuid(),
  buildingId: z.uuid(),
  number: z.string().trim().min(1).max(40),
  areaSqMt: z.number().positive().max(100000).optional(),
}).strict();

export type CreateSocietyInput = z.infer<typeof createSocietySchema>;
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type CreateFlatInput = z.infer<typeof createFlatSchema>;
