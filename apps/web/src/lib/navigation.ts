import type { ModuleKey } from '@society/shared';

export interface NavItem {
  moduleKey: ModuleKey;
  label: string;
  href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { moduleKey: 'company', label: 'Companies', href: '/companies' },
  { moduleKey: 'society-foundation', label: 'Society Setup', href: '/societies' },
  { moduleKey: 'residents', label: 'Residents', href: '/residents' },
  { moduleKey: 'finance-billing', label: 'Billing & Dues', href: '/finance' },
  { moduleKey: 'finance-billing', label: 'Maintenance Expenses', href: '/maintenance-expenses' },
  { moduleKey: 'payments-receipts', label: 'Payments & Receipts', href: '/payments' },
  { moduleKey: 'accounting', label: 'Accounting', href: '/accounting' },
  { moduleKey: 'visitors', label: 'Visitors', href: '/operations/visitors/visitor' },
  { moduleKey: 'complaints-maintenance', label: 'Complaints', href: '/operations/complaints-maintenance/complaint' },
  { moduleKey: 'amenities-bookings', label: 'Amenities', href: '/operations/amenities-bookings/amenity' },
  { moduleKey: 'parking-vehicles', label: 'Parking', href: '/operations/parking-vehicles/parking-slot' },
  { moduleKey: 'staff-attendance', label: 'Staff', href: '/operations/staff-attendance/employee' },
  { moduleKey: 'vendors-contracts', label: 'Vendors', href: '/operations/vendors-contracts/vendor' },
  { moduleKey: 'notices-communication', label: 'Notices', href: '/operations/notices-communication/notice' },
  { moduleKey: 'documents', label: 'Documents', href: '/operations/documents/document' },
  { moduleKey: 'meetings-voting', label: 'Meetings & Voting', href: '/operations/meetings-voting/meeting' },
  { moduleKey: 'advanced-reports', label: 'Reports', href: '/reports' },
  { moduleKey: 'integrations', label: 'Integrations', href: '/operations/integrations/integration' },
];
