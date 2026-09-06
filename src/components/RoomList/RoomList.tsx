'use client';

import RoomCard from '@/components/RoomCard/RoomCard';
import { Amenity, Room } from '@/types';
import './RoomList.scss';

interface RoomListProps {
  rooms: Room[];
  searchParams: URLSearchParams; // получаем объект параметров
  amenityCatalog?: Amenity[];
}

const RoomList = ({ rooms, searchParams, amenityCatalog }: RoomListProps) => {
  if (!rooms || rooms.length === 0) {
    return (
      <section className="room-list">
        <div className="room-list__container">
          <p className="room-list__empty">Нет доступных номеров</p>
        </div>
      </section>
    );
  }

  return (
    <section className="room-list">
      <div className="room-list__container">
        <div className="room-list__grid">
          {rooms.map((room, index) => (
            <RoomCard
              key={room.id}
              room={room}
              searchParams={searchParams}
              priority={index < 3}
              amenityCatalog={amenityCatalog}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoomList;