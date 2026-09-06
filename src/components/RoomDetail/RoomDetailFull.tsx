/**
 * Полноэкранная страница номера (без модалки).
 * Обёртка над RoomDetailContent + кнопка «Назад» к категории.
 */

import Link from 'next/link';
import RoomDetailContent from './RoomDetailContent';
import type { Amenity, Room } from '@/types';

export interface RoomDetailFullProps {
  room: Room;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  childAges?: number[];
  amenityCatalog?: Amenity[];
  capacityHeading?: string;
  priceNote?: string;
}

export default function RoomDetailFull({
  room,
  checkIn,
  checkOut,
  adults,
  children,
  childAges,
  amenityCatalog,
  capacityHeading,
  priceNote,
}: RoomDetailFullProps) {
  const backHref =
    room.category === 'all' || !room.category ? '/' : `/${room.category}`;

  return (
    <div className="room-detail room-detail--full">
      <div className="room-detail__container">
        <div className="room-detail__back-wrapper">
          <Link
            href={backHref}
            className="room-detail__back"
            aria-label="Назад к списку"
          />
        </div>
        <RoomDetailContent
          room={room}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={children}
          childAges={childAges}
          amenityCatalog={amenityCatalog}
          capacityHeading={capacityHeading}
          priceNote={priceNote}
        />
      </div>
    </div>
  );
}