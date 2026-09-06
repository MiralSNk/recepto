'use client';

import { type PublicRoom } from '@/hooks';

interface RoomSelectorProps {
  rooms: PublicRoom[];
  selectedRoomId: number | '';
  onChange: (roomId: number | '') => void;
}

/**
 * Выпадающий список номеров и отображение информации о выбранном номере.
 */
export default function RoomSelector({
  rooms,
  selectedRoomId,
  onChange,
}: RoomSelectorProps) {
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;

  return (
    <>
      <div className="booking-form__room-select">
        <label>
          <span>Номер</span>
          <select
            value={selectedRoomId}
            onChange={(e) =>
              onChange(e.target.value === '' ? '' : Number(e.target.value))
            }
            required
          >
            <option value="">Выберите номер</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedRoom && (
        <div className="booking-form__room-block">
          <p className="booking-form__room">{selectedRoom.name}</p>
          {selectedRoom.price_day != null && (
            <p className="booking-form__price">
              от{' '}
              {selectedRoom.price_day.toLocaleString('ru-RU')}{' '}
              ₽ / сутки
              {selectedRoom.price_half_day != null && (
                <span className="booking-form__price-half">
                  {' '}
                  · 12 ч —{' '}
                  {selectedRoom.price_half_day.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </>
  );
}