import type { ServiceContext } from './company-service';
import {
  getDues,
  getTrialBalance,
  listAccounts,
  listCharges,
  listInvoices,
  listJournals,
  listPayments,
  listPeriods,
  listRefunds,
} from './finance-service';

export type FinanceSection = 'billing' | 'payments' | 'accounting' | 'reports';
export type FinanceRows = Record<string, Record<string, unknown>[]>;

/** Server-rendered first load so finance pages never call setState from an effect. */
export async function loadFinanceSection(
  service: ServiceContext,
  companyId: string,
  societyId: string,
  section: FinanceSection,
): Promise<FinanceRows> {
  const rows = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

  if (section === 'billing') {
    const [charges, invoices, dues] = await Promise.all([
      listCharges(service, companyId, societyId),
      listInvoices(service, companyId, societyId),
      getDues(service, companyId, societyId),
    ]);
    return {
      charges: charges.ok ? rows(charges.value) : [],
      invoices: invoices.ok ? rows(invoices.value) : [],
      dues: dues.ok ? rows((dues.value as { rows: unknown[] }).rows) : [],
    };
  }

  if (section === 'payments') {
    const [payments, refunds] = await Promise.all([
      listPayments(service, companyId, societyId),
      listRefunds(service, companyId, societyId),
    ]);
    return { payments: payments.ok ? rows(payments.value) : [], refunds: refunds.ok ? rows(refunds.value) : [] };
  }

  if (section === 'accounting') {
    const [accounts, journals, periods, trialBalance] = await Promise.all([
      listAccounts(service, companyId, societyId),
      listJournals(service, companyId, societyId),
      listPeriods(service, companyId, societyId),
      getTrialBalance(service, companyId, societyId),
    ]);
    return {
      accounts: accounts.ok ? rows(accounts.value) : [],
      journals: journals.ok ? rows(journals.value) : [],
      periods: periods.ok ? rows(periods.value) : [],
      'trial-balance': trialBalance.ok ? rows((trialBalance.value as { rows: unknown[] }).rows) : [],
    };
  }

  const [dues, trialBalance, invoices] = await Promise.all([
    getDues(service, companyId, societyId),
    getTrialBalance(service, companyId, societyId),
    listInvoices(service, companyId, societyId),
  ]);
  return {
    dues: dues.ok ? rows((dues.value as { rows: unknown[] }).rows) : [],
    'trial-balance': trialBalance.ok ? rows((trialBalance.value as { rows: unknown[] }).rows) : [],
    invoices: invoices.ok ? rows(invoices.value) : [],
  };
}
