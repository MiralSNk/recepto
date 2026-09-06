import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/index.server';
import { redirect } from 'next/navigation';
import PaletteAdmin from '@/components/admin/PaletteAdmin/PaletteAdmin';

export const dynamic = 'force-dynamic';

export default async function PalettePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  return <PaletteAdmin />;
}