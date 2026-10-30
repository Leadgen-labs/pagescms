import { ContentTransfer } from '@/components/webs/content-transfer';
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <ContentTransfer defaultTab={tab} />;
}
