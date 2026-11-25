import { OperationSection } from '../../operation-section';

export default async function NoticePage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="notices-communication" resourceKey="notice" searchParams={searchParams} />;
}
