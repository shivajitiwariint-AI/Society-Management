import type { ModuleKey } from './modules';

/**
 * Catalog of workflow-style resources backed by OperationalRecord.
 * These keys are stable and are used for entitlements, RBAC and the generic UI.
 */
export interface OperationDefinition {
  moduleKey: ModuleKey;
  resourceKey: string;
  label: string;
  titleLabel: string;
  statusOptions: readonly string[];
  priorityOptions?: readonly string[];
  useCode?: boolean;
  useAmount?: boolean;
  useSchedule?: boolean;
  useAssignee?: boolean;
  useResident?: boolean;
  useFlat?: boolean;
  useFile?: boolean;
  formFields?: ReadonlyArray<{ key: string; label: string; type?: 'text' | 'number' | 'datetime-local' | 'select'; options?: readonly string[] }>;
}

export const OPERATION_DEFINITIONS: readonly OperationDefinition[] = [
  {
    moduleKey: 'visitors', resourceKey: 'visitor', label: 'Visitors', titleLabel: 'Visitor name',
    statusOptions: ['PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED'],
    useCode: true, useSchedule: true, useFlat: true, useResident: true,
    formFields: [{ key: 'visitorPhone', label: 'Visitor phone' }, { key: 'purpose', label: 'Purpose' }],
  },
  {
    moduleKey: 'visitors', resourceKey: 'visitor-approval', label: 'Visitor approvals', titleLabel: 'Approval subject',
    statusOptions: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'], useSchedule: true, useResident: true, useFlat: true,
  },
  {
    moduleKey: 'visitors', resourceKey: 'gate', label: 'Gates', titleLabel: 'Gate name',
    statusOptions: ['ACTIVE', 'INACTIVE'], useCode: true,
  },
  {
    moduleKey: 'visitors', resourceKey: 'visitor-session', label: 'Gate log', titleLabel: 'Visitor / vehicle',
    statusOptions: ['OPEN', 'CLOSED'], useSchedule: true, useFlat: true,
  },
  {
    moduleKey: 'complaints-maintenance', resourceKey: 'complaint', label: 'Complaints', titleLabel: 'Subject',
    statusOptions: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'],
    priorityOptions: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], useCode: true, useAssignee: true, useResident: true, useFlat: true,
    formFields: [{ key: 'category', label: 'Category' }, { key: 'slaHours', label: 'SLA hours', type: 'number' }],
  },
  {
    moduleKey: 'complaints-maintenance', resourceKey: 'complaint-assignment', label: 'Assignments', titleLabel: 'Assignment',
    statusOptions: ['ASSIGNED', 'ACCEPTED', 'REJECTED', 'COMPLETED'], useAssignee: true, useSchedule: true,
  },
  {
    moduleKey: 'complaints-maintenance', resourceKey: 'complaint-comment', label: 'Comments', titleLabel: 'Comment',
    statusOptions: ['ACTIVE', 'HIDDEN'], useAssignee: true,
  },
  {
    moduleKey: 'complaints-maintenance', resourceKey: 'work-order', label: 'Work orders', titleLabel: 'Work order',
    statusOptions: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'],
    priorityOptions: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], useCode: true, useAssignee: true, useFlat: true, useAmount: true,
  },
  {
    moduleKey: 'amenities-bookings', resourceKey: 'amenity', label: 'Amenities', titleLabel: 'Amenity name',
    statusOptions: ['ACTIVE', 'INACTIVE'], useCode: true, useAmount: true,
    formFields: [{ key: 'capacity', label: 'Capacity', type: 'number' }, { key: 'openingHours', label: 'Opening hours' }],
  },
  {
    moduleKey: 'amenities-bookings', resourceKey: 'amenity-slot', label: 'Slots', titleLabel: 'Slot',
    statusOptions: ['ACTIVE', 'FULL', 'INACTIVE'], useCode: true, useSchedule: true, useAmount: true,
  },
  {
    moduleKey: 'amenities-bookings', resourceKey: 'booking', label: 'Bookings', titleLabel: 'Booking title',
    statusOptions: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
    useCode: true, useSchedule: true, useResident: true, useFlat: true, useAmount: true,
  },
  {
    moduleKey: 'parking-vehicles', resourceKey: 'parking-slot', label: 'Parking slots', titleLabel: 'Slot number',
    statusOptions: ['AVAILABLE', 'ALLOCATED', 'BLOCKED'], useCode: true, useAmount: true,
  },
  {
    moduleKey: 'parking-vehicles', resourceKey: 'parking-allocation', label: 'Allocations', titleLabel: 'Allocation',
    statusOptions: ['ACTIVE', 'RELEASED', 'EXPIRED', 'CANCELLED'],
    useSchedule: true, useResident: true, useFlat: true, useAmount: true,
    formFields: [{ key: 'registrationNumber', label: 'Registration number' }],
  },
  {
    moduleKey: 'staff-attendance', resourceKey: 'employee', label: 'Staff', titleLabel: 'Employee name',
    statusOptions: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'], useCode: true, useAssignee: true,
    formFields: [{ key: 'designation', label: 'Designation' }, { key: 'phone', label: 'Phone' }],
  },
  {
    moduleKey: 'staff-attendance', resourceKey: 'attendance', label: 'Attendance', titleLabel: 'Attendance record',
    statusOptions: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'], useSchedule: true, useAssignee: true,
  },
  {
    moduleKey: 'staff-attendance', resourceKey: 'shift', label: 'Shifts', titleLabel: 'Shift name',
    statusOptions: ['ACTIVE', 'INACTIVE'], useCode: true, useSchedule: true, useAssignee: true,
  },
  {
    moduleKey: 'staff-attendance', resourceKey: 'leave-request', label: 'Leave requests', titleLabel: 'Leave request',
    statusOptions: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], useSchedule: true, useAssignee: true,
  },
  {
    moduleKey: 'vendors-contracts', resourceKey: 'vendor', label: 'Vendors', titleLabel: 'Vendor name',
    statusOptions: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], useCode: true, useAmount: true,
    formFields: [{ key: 'contactPerson', label: 'Contact person' }, { key: 'phone', label: 'Phone' }],
  },
  {
    moduleKey: 'vendors-contracts', resourceKey: 'contract', label: 'Contracts', titleLabel: 'Contract title',
    statusOptions: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'], useCode: true, useSchedule: true, useAmount: true,
  },
  {
    moduleKey: 'vendors-contracts', resourceKey: 'vendor-invoice', label: 'Vendor bills', titleLabel: 'Bill reference',
    statusOptions: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'], useCode: true, useSchedule: true, useAmount: true,
  },
  {
    moduleKey: 'notices-communication', resourceKey: 'notice', label: 'Notices', titleLabel: 'Notice title',
    statusOptions: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], useCode: true, useSchedule: true,
    formFields: [{ key: 'audience', label: 'Audience', type: 'select', options: ['ALL', 'SOCIETY', 'BUILDING', 'ROLE'] }],
  },
  {
    moduleKey: 'notices-communication', resourceKey: 'notification', label: 'Notifications', titleLabel: 'Notification',
    statusOptions: ['PENDING', 'SENT', 'DELIVERED', 'FAILED'], useSchedule: true, useResident: true,
  },
  {
    moduleKey: 'notices-communication', resourceKey: 'notification-preference', label: 'Preferences', titleLabel: 'Preference',
    statusOptions: ['ACTIVE', 'INACTIVE'], useResident: true,
  },
  {
    moduleKey: 'documents', resourceKey: 'document', label: 'Documents', titleLabel: 'Document title',
    statusOptions: ['ACTIVE', 'ARCHIVED', 'QUARANTINED'], useCode: true, useFile: true,
    formFields: [{ key: 'category', label: 'Category', type: 'select', options: ['IDENTITY', 'OWNERSHIP', 'CONTRACT', 'INVOICE', 'OTHER'] }],
  },
  {
    moduleKey: 'documents', resourceKey: 'document-permission', label: 'Document access', titleLabel: 'Permission',
    statusOptions: ['ACTIVE', 'REVOKED'], useResident: true, useAssignee: true,
  },
  {
    moduleKey: 'meetings-voting', resourceKey: 'meeting', label: 'Meetings', titleLabel: 'Meeting title',
    statusOptions: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], useCode: true, useSchedule: true, useFlat: true,
  },
  {
    moduleKey: 'meetings-voting', resourceKey: 'meeting-agenda', label: 'Agendas', titleLabel: 'Agenda item',
    statusOptions: ['DRAFT', 'APPROVED', 'DISCUSSED'], useCode: true,
  },
  {
    moduleKey: 'meetings-voting', resourceKey: 'meeting-attendance', label: 'Attendance', titleLabel: 'Attendee',
    statusOptions: ['INVITED', 'ATTENDED', 'ABSENT'], useSchedule: true, useResident: true,
  },
  {
    moduleKey: 'meetings-voting', resourceKey: 'meeting-minutes', label: 'Minutes', titleLabel: 'Minutes title',
    statusOptions: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], useCode: true, useSchedule: true,
  },
  {
    moduleKey: 'meetings-voting', resourceKey: 'voting-session', label: 'Voting sessions', titleLabel: 'Question',
    statusOptions: ['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED'], useCode: true, useSchedule: true,
    formFields: [{ key: 'quorumPercent', label: 'Quorum %', type: 'number' }],
  },
  {
    moduleKey: 'meetings-voting', resourceKey: 'vote', label: 'Votes', titleLabel: 'Ballot reference',
    statusOptions: ['CAST', 'INVALIDATED'], useResident: true, useSchedule: true,
    formFields: [{ key: 'choice', label: 'Choice', type: 'select', options: ['YES', 'NO', 'ABSTAIN'] }],
  },
  {
    moduleKey: 'integrations', resourceKey: 'integration', label: 'Integrations', titleLabel: 'Integration name',
    statusOptions: ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL'], useCode: true,
  },
  {
    moduleKey: 'integrations', resourceKey: 'webhook-endpoint', label: 'Webhook endpoints', titleLabel: 'Endpoint',
    statusOptions: ['ACTIVE', 'INACTIVE'], useCode: true,
  },
];

const definitionKey = (moduleKey: string, resourceKey: string) => `${moduleKey}:${resourceKey}`;

const DEFINITIONS = new Map(OPERATION_DEFINITIONS.map((definition) => [definitionKey(definition.moduleKey, definition.resourceKey), definition]));

export function getOperationDefinition(moduleKey: string, resourceKey: string): OperationDefinition | null {
  return DEFINITIONS.get(definitionKey(moduleKey, resourceKey)) ?? null;
}

export function primaryOperationPath(moduleKey: ModuleKey): string | null {
  const definition = OPERATION_DEFINITIONS.find((item) => item.moduleKey === moduleKey);
  return definition ? `/operations/${definition.moduleKey}/${definition.resourceKey}` : null;
}
