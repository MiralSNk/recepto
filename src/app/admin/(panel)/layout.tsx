import AdminLayout from '@/components/admin/AdminLayout/AdminLayout';
import { getSiteSettings } from '@/lib/index.server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  return <AdminLayout hotelName={settings.hotel_name}>{children}</AdminLayout>;
}
