import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getRoomsByCategory, getVisibleCategories, getSiteSettings, getPricingRules } from '@/lib/index.server';
import { getAllAmenities } from '@/lib/server/amenities-db';
import type { CategoryKey } from '@/types';
import HomeContent from '@/components/HomeContent/HomeContent';
import HomeSkeleton from '@/components/skeletons/HomeSkeleton';

interface HomePageProps {
  searchParams: Promise<{
    guests?: string;
    adults?: string;
    children?: string;
    checkIn?: string;
    checkOut?: string;
    room?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.seo_home_title || 'Название вашего отеля — уютный отель в центре города';

  return {
    title: { absolute: title },
    description: settings.seo_home_description || '',
    alternates: { canonical: '/' },
    openGraph: {
      title: settings.og_home_title || title,
      description: settings.og_home_description || settings.seo_home_description || '',
      url: '/',
      images: settings.og_home_image ? [{ url: settings.og_home_image }] : undefined,
    },
  };
}

async function HomePageInner({ searchParams }: HomePageProps) {
  const category: CategoryKey = 'all';
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

  return (
    <HomeContent
      category={category}
      initialRooms={filteredRooms}
      searchParamsPromise={searchParams}
      categories={categoriesProp}
      heroBg={settings.hero_bg}
      heroTitle={settings.hero_title}
      heroSubtitle={settings.hero_subtitle}
      maxGuests={pricingRules.maxGuestsAbsolute}
      amenityCatalog={amenityCatalog}
    />
  );
}

export default function HomePage(props: HomePageProps) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomePageInner {...props} />
    </Suspense>
  );
}