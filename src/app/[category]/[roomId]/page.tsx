import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRoomById } from '@/lib/server/rooms-db';
import { isValidCategory } from '@/lib/server/categories-db';
import { getAllAmenities } from '@/lib/server/amenities-db';
import { getSiteSettings } from '@/lib/server/seo';
import RoomDetailFull from '@/components/RoomDetail/RoomDetailFull';
import RoomDetailSkeleton from '@/components/skeletons/RoomDetailSkeleton';

interface RoomPageProps {
  params: Promise<{ category: string; roomId: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    childAges?: string;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; roomId: string }>;
}): Promise<Metadata> {
  const { category, roomId } = await params;

  // Проверяем, что roomId является числом
  const numericRoomId = Number(roomId);
  if (!Number.isFinite(numericRoomId)) {
    return { title: 'Номер не найден' };
  }

  const [room, settings] = await Promise.all([getRoomById(numericRoomId), getSiteSettings()]);

  if (!room || (category !== 'all' && room.category !== category)) {
    return { title: 'Номер не найден' };
  }

  const cover = room.images?.[0];
  const hotelName = settings.hotel_name || 'Название вашего отеля';

  return {
    title: room.name,
    description: room.description?.slice(0, 160) || room.name,
    alternates: { canonical: `/${room.category}/${room.id}` },
    openGraph: {
      title: `${room.name} — ${hotelName}`,
      description: room.description,
      url: `/${room.category}/${room.id}`,
      images: cover
        ? [{ url: cover, width: 1200, height: 800, alt: room.name }]
        : undefined,
    },
  };
}

async function RoomFullPageInner({ params, searchParams }: RoomPageProps) {
  const { category, roomId } = await params;
  const sp = await searchParams;

  if (category !== 'all' && !(await isValidCategory(category))) {
    notFound();
  }

  const numericRoomId = Number(roomId);
  if (!Number.isFinite(numericRoomId)) {
    notFound();
  }

  const [room, amenityCatalog, settings] = await Promise.all([
    getRoomById(numericRoomId),
    getAllAmenities(),
    getSiteSettings(),
  ]);
  if (!room || (category !== 'all' && room.category !== category)) {
    notFound();
  }

  return (
    <RoomDetailFull
      room={room}
      checkIn={sp.checkIn}
      checkOut={sp.checkOut}
      adults={sp.adults}
      children={sp.children}
      childAges={
        sp.childAges
          ? sp.childAges.split(',').map(Number).filter((n) => Number.isFinite(n) && n >= 0)
          : undefined
      }
      amenityCatalog={amenityCatalog}
      capacityHeading={settings.room_capacity_heading || undefined}
      priceNote={settings.room_price_note || undefined}
    />
  );
}

export default function RoomFullPage(props: RoomPageProps) {
  return (
    <Suspense fallback={<RoomDetailSkeleton />}>
      <RoomFullPageInner {...props} />
    </Suspense>
  );
}