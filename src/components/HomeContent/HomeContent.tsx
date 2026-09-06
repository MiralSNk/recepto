'use client';

import { use } from 'react';
import { Amenity, CategoryKey, Guests, Room } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import BookingPanel from "../BookingPanel/BookingPanel";
import RoomList from "../RoomList/RoomList";
import { parseISO } from 'date-fns';
import Hero from '../Hero/Hero';

function toLocalYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface HomeContentProps {
  category: CategoryKey;
  initialRooms: Room[];
  searchParamsPromise: Promise<{
    adults?: string;
    children?: string;
    childAges?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
  categories: { key: string; label: string }[];
  heroBg?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  maxGuests?: number;
  amenityCatalog?: Amenity[];
}

export default function HomeContent({
  category,
  initialRooms,
  searchParamsPromise,
  categories,
  heroBg,
  heroTitle,
  heroSubtitle,
  maxGuests,
  amenityCatalog,
}: HomeContentProps) {
  const searchParams = use(searchParamsPromise);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const adults = Number(searchParams.adults) || 1;
  const children = Number(searchParams.children) || 0;
  const childAges = useMemo(() => {
    // Number('') === 0, а не NaN — без явной проверки на пустую строку
    // отсутствующий childAges превращался в [0] («до 1 года») вместо [].
    if (!searchParams.childAges) return [];
    return searchParams.childAges
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n >= 0);
  }, [searchParams.childAges]);

  const guests: Guests = useMemo(
    () => ({
      adults: Math.max(1, adults),
      children: Math.max(0, children),
    }),
    [adults, children]
  );

  const minGuest = adults + children;

  const filteredRooms = useMemo(() => {
    if (minGuest === 0) return initialRooms;
    // Вместимость номера — база + платные доп. места, а не только guests.
    return initialRooms.filter(
      (room) => (room.guests ?? 0) + (room.extraGuestCapacity ?? 0) >= minGuest
    );
  }, [initialRooms, minGuest]);

  const checkIn = searchParams.checkIn ? parseISO(searchParams.checkIn) : null;
  const checkOut = searchParams.checkOut ? parseISO(searchParams.checkOut) : null;

  const searchParamsObj = useMemo(() => {
    const params = new URLSearchParams();
    if (searchParams.checkIn) params.set('checkIn', searchParams.checkIn);
    if (searchParams.checkOut) params.set('checkOut', searchParams.checkOut);
    if (searchParams.adults) params.set('adults', searchParams.adults);
    if (searchParams.children) params.set('children', searchParams.children);
    if (searchParams.childAges) params.set('childAges', searchParams.childAges);
    return params;
  }, [searchParams]);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams();
      if (searchParams.checkIn) params.set('checkIn', searchParams.checkIn);
      if (searchParams.checkOut) params.set('checkOut', searchParams.checkOut);
      if (searchParams.adults) params.set('adults', searchParams.adults);
      if (searchParams.children) params.set('children', searchParams.children);
      if (searchParams.childAges) params.set('childAges', searchParams.childAges);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );

  const handleGuestsChange = (newGuests: Guests) => {
    updateSearchParams({
      adults: String(newGuests.adults),
      children: newGuests.children > 0 ? String(newGuests.children) : null,
    });
  };

  const handleChildAgesChange = (ages: number[]) => {
    updateSearchParams({
      children: ages.length > 0 ? String(ages.length) : null,
      childAges: ages.length > 0 ? ages.join(',') : null,
    });
  };

  const handleCategoryChange = (newCategory: string) => {
    const categoryKey = newCategory as CategoryKey;

    const params = new URLSearchParams();
    if (searchParams.checkIn) params.set('checkIn', searchParams.checkIn);
    if (searchParams.checkOut) params.set('checkOut', searchParams.checkOut);
    if (searchParams.adults) params.set('adults', searchParams.adults);
    if (searchParams.children) params.set('children', searchParams.children);
    if (searchParams.childAges) params.set('childAges', searchParams.childAges);

    const query = params.toString();
    const base = categoryKey === 'all' ? '/' : `/${categoryKey}`;
    const href = query ? `${base}?${query}` : base;

    startTransition(() => {
      router.push(href, { scroll: false });
    });

    // Прокручиваем к началу списка номеров (сразу после панели категорий)
    setTimeout(() => {
      const panel = document.getElementById('booking-panel-card');
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  const handleDateChange = ({
    checkIn,
    checkOut,
  }: {
    checkIn: Date;
    checkOut: Date;
  }) => {
    updateSearchParams({
      checkIn: toLocalYMD(checkIn),
      checkOut: toLocalYMD(checkOut),
    });
  };

  return (
    <>
      <Hero heroBg={heroBg} heroTitle={heroTitle} heroSubtitle={heroSubtitle} />
      <BookingPanel
        checkIn={checkIn}
        checkOut={checkOut}
        onDateChange={handleDateChange}
        guests={guests}
        onGuestsChange={handleGuestsChange}
        childAges={childAges}
        onChildAgesChange={handleChildAgesChange}
        activeCategory={category}
        onCategoryChange={handleCategoryChange}
        maxGuests={maxGuests}
        isPending={isPending}
        categories={categories}
      />
      <RoomList rooms={filteredRooms} searchParams={searchParamsObj} amenityCatalog={amenityCatalog} />
    </>
  );
}