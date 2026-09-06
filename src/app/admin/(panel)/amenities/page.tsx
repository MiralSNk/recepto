import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import { getDB } from '@/db';
import AmenitiesClient from '@/components/admin/AmenitiesClient/AmenitiesClient';

export const dynamic = 'force-dynamic';

export default async function AmenitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  const db = getDB();
  const amenities = await db.amenities.getAllAmenities();

  return <AmenitiesClient initialAmenities={amenities} />;
}
