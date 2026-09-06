import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRoomsByCategory, getVisibleCategories, isValidCategory, getSiteSettings, getPricingRules } from '@/lib/index.server';
import { getAllAmenities } from '@/lib/server/amenities-db';
import { resolveMaxGuests } from '@/lib/shared/guest-limits';
import type { CategoryKey } from '@/types';
import HomeContent from '@/components/HomeContent/HomeContent';
import HomeSkeleton from '@/components/skeletons/HomeSkeleton';

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    guests?: string;
    adults?: string;
    children?: string;
    checkIn?: string;
    checkOut?: string;
    room?: string;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: raw } = await params;
  if (!(await isValidCategory(raw))) {
    return { title: 'Страница не найдена' };
  }

  const [categories, settings] = await Promise.all([getVisibleCategories(), getSiteSettings()]);
  const found = categories.find((c) => c.key === raw);
  const label = found?.label ?? raw;
  const hotelName = settings.hotel_name || 'Название вашего отеля';

  return {
    title: `Номера «${label}»`,
    description: `Номера категории «${label}» в ${hotelName}. Бронирование онлайн.`,
    alternates: { canonical: `/${raw}` },
    openGraph: {
      title: `Номера «${label}» — ${hotelName}`,
      description: `Выберите номер категории «${label}».`,
      url: `/${raw}`,
    },
  };
}

async function CategoryPageInner({ params, searchParams }: PageProps) {
  const { category: raw } = await params;
  if (!(await isValidCategory(raw))) notFound();

  const category = raw as CategoryKey;

  const [filteredRooms, categories, settings, pricingRules, amenityCatalog] = await Promise.all([
    getRoomsByCategory(category, 0),
    getVisibleCategories(),
    getSiteSettings(),
    getPricingRules(),
    getAllAmenities(),
  ]);

  const categoriesProp = categories.map((c) => ({
    key: c.key,
    label: c.label,
  }));

  // Конкретный номер тут ещё не выбран — только лимит категории (если
  // задан) поверх общего сайтового, см. src/lib/shared/guest-limits.ts.
  const currentCategory = categories.find((c) => c.key === category);
  const effectiveMaxGuests = resolveMaxGuests({
    categoryMaxGuests: currentCategory?.max_guests,
    siteMaxGuestsAbsolute: pricingRules.maxGuestsAbsolute,
  });

  return (
    <HomeContent
      category={category}
      initialRooms={filteredRooms}
      searchParamsPromise={searchParams}
      categories={categoriesProp}
      heroBg={settings.hero_bg}
      heroTitle={settings.hero_title}
      heroSubtitle={settings.hero_subtitle}
      maxGuests={effectiveMaxGuests}
      amenityCatalog={amenityCatalog}
    />
  );
}

export default function CategoryPage(props: PageProps) {
  return (
    <Suspense fallback={<HomeSkeleton/>}>
      <CategoryPageInner {...props} />
    </Suspense>
  );
}