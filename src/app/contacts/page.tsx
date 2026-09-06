import ContactsPage from '@/components/ContactsPage/ContactsPage';
import { Metadata } from 'next';
import { getSiteSettings } from '@/lib/server/seo';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.seo_contacts_title || 'Об отеле',
    description: settings.seo_contacts_description || '',
    alternates: { canonical: '/contacts' },
    openGraph: {
      title: settings.og_contacts_title || settings.seo_contacts_title || 'Об отеле — Название вашего отеля',
      description: settings.og_contacts_description || settings.seo_contacts_description || '',
      url: '/contacts',
      images: settings.og_contacts_image ? [{ url: settings.og_contacts_image }] : undefined,
    },
  };
}

export default async function ContactsRoute() {
  const settings = await getSiteSettings();
  return <ContactsPage aboutContent={settings.about_page_content} hotelName={settings.hotel_name} />;
}