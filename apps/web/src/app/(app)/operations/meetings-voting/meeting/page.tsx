import { OperationSection } from '../../operation-section';

export default async function MeetingPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="meetings-voting" resourceKey="meeting" searchParams={searchParams} />;
}
