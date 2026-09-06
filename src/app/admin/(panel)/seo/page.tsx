import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import SeoAdminClient from '@/components/admin/SeoAdminClient/SeoAdminClient';

export const dynamic = 'force-dynamic';

export default async function SeoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  return <SeoAdminClient />;
}