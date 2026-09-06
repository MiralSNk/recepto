import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import { getDB } from '@/db';
import RoomsClient from '@/components/admin/RoomsClient/RoomsClient';

export const dynamic = 'force-dynamic';

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  const db = getDB();
  const categories = await db.categories.getAllCategories();

  return <RoomsClient categories={categories} />;
}