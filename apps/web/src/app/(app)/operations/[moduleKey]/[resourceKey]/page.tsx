import { OperationSection } from '../../operation-section';

type PageProps = {
  params: Promise<{ moduleKey: string; resourceKey: string }>;
  searchParams: Promise<{ societyId?: string | string[] }>;
};

export default async function OperationPage({ params, searchParams }: PageProps) {
  const { moduleKey, resourceKey } = await params;
  return <OperationSection moduleKey={moduleKey} resourceKey={resourceKey} searchParams={searchParams} />;
}
