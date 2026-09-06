import { NextResponse } from 'next/server';
import { getVisibleCategories } from '@/lib/server/categories-db';

export async function GET() {
  try {
    const categories = await getVisibleCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET public categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}