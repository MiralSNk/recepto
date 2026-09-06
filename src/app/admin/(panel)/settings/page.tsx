import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import SettingsAdminClient from '@/components/admin/SettingsAdminClient/SettingsAdminClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  return <SettingsAdminClient />;
}