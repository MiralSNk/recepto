import RoomDetailModal from '@/components/RoomDetail/RoomDetailModal';
import { isValidCategory, getRoomById, getSiteSettings } from '@/lib/index.server';
import { getAllAmenities } from '@/lib/server/amenities-db';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

interface ModalPageProps {
  params: Promise<{ category: string; roomId: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    adults?: string;
    children?: string;
    childAges?: string;
  }>;
}

export default function RoomModalPage({ params, searchParams }: ModalPageProps) {
  return (
    <Suspense fallback={<></>}>
      <RoomModalInner params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RoomModalInner({ params, searchParams }: ModalPageProps) {
  const { category, roomId } = await params;
  const sp = await searchParams;

  // isValidCategory возвращает Promise, поэтому добавляем await
  if (!(await isValidCategory(category))) {
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
    <RoomDetailModal
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
      hotelName={settings.hotel_name || undefined}
    />
  );
}