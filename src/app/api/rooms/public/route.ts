import { NextResponse } from 'next/server';
import { getAllRooms } from '@/lib/server/rooms-db';

export async function GET() {
  try {
    const rooms = await getAllRooms();
    const publicRooms = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      price_day: room.price_day,
      price_half_day: room.price_half_day,
      guests: room.guests,
      extraGuestCapacity: room.extraGuestCapacity,
      categoryMaxGuests: room.categoryMaxGuests,
    }));
    return NextResponse.json(publicRooms);
  } catch (error) {
    console.error('GET public rooms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}