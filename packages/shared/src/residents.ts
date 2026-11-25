/** Stable resident-domain values used by validation, storage and the UI. */

export const RESIDENT_TYPES = ['OWNER', 'TENANT', 'FAMILY'] as const;
export type ResidentType = (typeof RESIDENT_TYPES)[number];

export const RESIDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ResidentStatus = (typeof RESIDENT_STATUSES)[number];

export const DOCUMENT_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type DocumentVerificationStatus = (typeof DOCUMENT_VERIFICATION_STATUSES)[number];

export const OWNERSHIP_STATUSES = ['ACTIVE', 'TRANSFERRED', 'ENDED'] as const;
export type OwnershipStatus = (typeof OWNERSHIP_STATUSES)[number];

export const TENANCY_STATUSES = ['ACTIVE', 'ENDED', 'CANCELLED'] as const;
export type TenancyStatus = (typeof TENANCY_STATUSES)[number];

export const FAMILY_RELATIONSHIPS = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'] as const;
export type FamilyRelationship = (typeof FAMILY_RELATIONSHIPS)[number];

export const VEHICLE_TYPES = ['CAR', 'TWO_WHEELER', 'COMMERCIAL', 'OTHER'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
