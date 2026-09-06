import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import PricingAdminClient from '@/components/admin/PricingAdminClient/PricingAdminClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  return <PricingAdminClient />;
}
