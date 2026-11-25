import { OperationSection } from '../../operation-section';

export default async function IntegrationPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="integrations" resourceKey="integration" searchParams={searchParams} />;
}
