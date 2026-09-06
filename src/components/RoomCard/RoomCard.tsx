'use client';

/**
 * Карточка номера в списке.
 * Галерея — useGalleryTrack (тот же хук, что в RoomDetail).
 */

import type { Amenity, Room } from '@/types';
import PrevBtn from '@/assets/icons/prev-btn.svg';
import Link from 'next/link';
import Image from 'next/image';
import { useBookingForm } from '@/components/BookingForm/BookingFormProvider';
import {
  useGalleryTrack,
  buildClonedSlides,
} from '@/hooks/useGalleryTrack';
import { formatPriceLabel } from '@/lib/shared/price-label';
import { amenityIcons } from '@/lib/index.client';
import InlineSvgIcon from '@/components/InlineSvgIcon/InlineSvgIcon';
import './RoomCard.scss';

interface RoomCardProps {
  room: Room;
  searchParams: URLSearchParams;
  priority?: boolean;
  amenityCatalog?: Amenity[];
}

export default function RoomCard({
  room,
  searchParams,
  priority = false,
  amenityCatalog = [],
}: RoomCardProps) {
  const {
    id,
    name,
    price,
    oldPrice,
    amenities,
    images,
    description,
    category,
    price_label,
  } = room;

  const { openBooking } = useBookingForm();

  const queryString = searchParams.toString();
  const checkIn = searchParams.get('checkIn') || undefined;
  const checkOut = searchParams.get('checkOut') || undefined;
  const adults = searchParams.get('adults') || undefined;
  const children = searchParams.get('children') || undefined;
  const childAgesParam = searchParams.get('childAges');
  const childAges = childAgesParam
    ? childAgesParam.split(',').map(Number).filter((n) => Number.isFinite(n) && n >= 0)
    : undefined;
  const href = `/${category}/${id}${queryString ? '?' + queryString : ''}`;

  const imgs = images?.length ? images : [];
  const cloned = buildClonedSlides(imgs);

  const {
    trackRef,
    containerRef,
    realIndex,
    realCount,
    goReal,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onClickGallery,
  } = useGalleryTrack({
    length: imgs.length,
    loop: true,
  });

  return (
    <article className="room-card">
      <div
        className="room-card__gallery"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onClick={onClickGallery}
      >
        <div className="room-card__track" ref={trackRef}>
          {cloned.map((src, idx) => (
            <div key={`${idx}-${src}`} className="room-card__slide">
              <Image
                className="room-card__img"
                src={src}
                fill
                alt={`${name} — фото`}
                draggable={false}
                sizes="
                  (max-width: 767px) 100vw,
                  (max-width: 1023px) 50vw,
                  (max-width: 1439px) 33vw,
                  400px
                "
                quality={75}
                priority={priority}
              />
            </div>
          ))}
        </div>

        {realCount > 1 && (
          <>
            <div className="room-card__edge room-card__edge--left" aria-hidden />
            <div className="room-card__edge room-card__edge--right" aria-hidden />
          </>
        )}

        {amenities.length > 0 && (
          <div className="room-card__amenities-overlay">
            {amenities.map((key) => {
              const catalogEntry = amenityCatalog.find((a) => a.amenity_key === key);
              if (catalogEntry?.icon_url) {
                return (
                  <InlineSvgIcon
                    key={key}
                    src={catalogEntry.icon_url}
                    className="room-card__amenity-icon"
                  />
                );
              }
              const IconComponent = amenityIcons[key];
              return IconComponent ? (
                <IconComponent key={key} className="room-card__amenity-icon" />
              ) : null;
            })}
          </div>
        )}

        {realCount > 1 && (
          <div className="room-card__gallery-dots">
            {imgs.map((_, idx) => (
              <span
                key={idx}
                className={
                  idx === realIndex
                    ? 'room-card__dot room-card__dot--active'
                    : 'room-card__dot'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  goReal(idx);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="room-card__info">
        <div className="room-card__header">
          <Link href={href} className="room-card__name-btn" scroll={false}>
            <h3 className="room-card__name">{name}</h3>
            <PrevBtn
              className="room-card__expand-icon"
              style={{ transform: 'rotate(-90deg)' }}
            />
          </Link>
        </div>

        {description && (
          <p className="room-card__description-short">{description}</p>
        )}

        <div className="room-card__footer">
          <div className="room-card__price-block">
            {oldPrice && (
              <span className="room-card__price-old">
                {oldPrice.toLocaleString('ru-RU')} ₽
              </span>
            )}
            <span className="room-card__price">
              {formatPriceLabel(price, price_label, `от ${price.toLocaleString('ru-RU')} ₽ / ночь`)}
            </span>
          </div>
          <button
            className="room-card__btn"
            type="button"
            onClick={() =>
              openBooking({
                roomId: room.id,
                roomName: room.name,
                priceDay: room.price_day,
                priceHalfDay: room.price_half_day,
                checkIn,
                checkOut,
                adults,
                children,
                childAges,
              })
            }
          >
            Забронировать
          </button>
        </div>
      </div>
    </article>
  );
}