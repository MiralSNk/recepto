import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import ChatAdminClient from '@/components/admin/ChatAdminClient/ChatAdminClient';

export const dynamic = 'force-dynamic';

export default async function ChatAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  return <ChatAdminClient />;
}