import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import HomeAdminClient from '@/components/admin/HomeAdminClient/HomeAdminClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  return <HomeAdminClient />;
}