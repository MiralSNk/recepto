/**
 * GET /api/amenities/public — labels из БД для RoomDetail / форм
 */

import { NextResponse } from 'next/server';
import { getAllAmenities } from '@/lib/server/amenities-db';

export async function GET() {
  try {
    const list = await getAllAmenities();
    // { wifi: 'Wi‑Fi', ... }
    const labels: Record<string, string> = {};
    for (const a of list) {
      labels[a.amenity_key] = a.label;
    }
    return NextResponse.json({ amenities: list, labels });
  } catch (error) {
    console.error('GET public amenities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}