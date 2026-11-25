import { OperationSection } from '../../operation-section';

export default async function EmployeePage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="staff-attendance" resourceKey="employee" searchParams={searchParams} />;
}
