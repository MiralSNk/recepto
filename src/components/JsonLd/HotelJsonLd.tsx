import 'server-only';
import { getSiteSettings } from '@/lib/server/seo';

export default async function HotelJsonLd() {
  const settings = await getSiteSettings();
  // Раньше пустые hotel_address/hotel_phone/hotel_email на ещё не
  // настроенном (например, только что развёрнутом на новом сервере) сайте
  // молча подставляли РЕАЛЬНЫЕ контакты предыдущего клиента, для которого
  // изначально писался этот код, — поисковики показали бы в результатах
  // поиска чужой телефон/адрес/email. Ненастроенные поля теперь просто не
  // попадают в разметку вовсе (schema.org не требует их обязательного
  // наличия), а не подменяются захардкоженным чужим значением.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: settings.hotel_name || 'Название вашего отеля',
    description: settings.seo_home_description || '',
    ...(settings.hotel_address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: settings.hotel_address,
            addressCountry: 'RU',
          },
        }
      : {}),
    ...(settings.hotel_phone
      ? { telephone: settings.hotel_phone.replace(/[^\d+]/g, '') }
      : {}),
    ...(settings.hotel_email ? { email: settings.hotel_email } : {}),
    url: process.env.NEXT_PUBLIC_SITE_URL,
    starRating: {
      '@type': 'Rating',
      ratingValue: settings.hotel_rating || '4',
    },
    ...(settings.hotel_lat && settings.hotel_lon
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: settings.hotel_lat,
            longitude: settings.hotel_lon,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}