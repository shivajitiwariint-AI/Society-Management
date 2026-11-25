import { redirect } from 'next/navigation';

/** The maintenance expense module is organised into dedicated section pages. */
export default function MaintenanceExpensesIndex() {
  redirect('/maintenance-expenses/dashboard');
}
