'use client';

/**
 * Контент карточки номера: галерея, удобства, цены, бронь.
 * Логика слайдера — useGalleryTrack.
 */

import { useState } from 'react';
import Image from 'next/image';
import { Amenity, Room } from '@/types';
import { amenityIcons } from '@/lib/index.client';
import InlineSvgIcon from '@/components/InlineSvgIcon/InlineSvgIcon';
import { useBookingForm } from '@/components/BookingForm/BookingFormProvider';
import {
  useGalleryTrack,
  buildClonedSlides,
} from '@/hooks/useGalleryTrack';
import FullscreenGallery from './FullscreenGallery';
import './RoomDetail.scss';

export interface RoomDetailContentProps {
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

const DEFAULT_CAPACITY_HEADING = 'Допустимое размещение';
const DEFAULT_PRICE_NOTE = 'Цена указана за проживание без доп. мест.';

function guestsLabel(n: number): string {
  if (n === 1) return 'гость';
  if (n < 5) return 'гостя';
  return 'гостей';
}

export default function RoomDetailContent({
  room,
  checkIn,
  checkOut,
  adults,
  children,
  childAges,
  amenityCatalog = [],
  capacityHeading,
  priceNote,
}: RoomDetailContentProps) {
  // Не просто дефолтный параметр — getSiteSettings() отдаёт '' для ещё не
  // заполненного ключа, а не undefined, так что дефолт-параметр его не ловит.
  const resolvedCapacityHeading = capacityHeading || DEFAULT_CAPACITY_HEADING;
  const resolvedPriceNote = priceNote || DEFAULT_PRICE_NOTE;
  const {
    name,
    description,
    fullDescription,
    price_day,
    price_half_day,
    area,
    guests: maxGuests,
    extraGuestCapacity,
    amenities,
    images,
    extras,
    roomTariffs,
    price_day_label,
    price_half_day_label,
  } = room;

  const amenityByKey = new Map(amenityCatalog.map((a) => [a.amenity_key, a]));

  const detailDescription = fullDescription || description;
  const { openBooking } = useBookingForm();

  const imgs = images?.length ? images : [];
  const cloned = buildClonedSlides(imgs);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

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
    onCenterClick: (idx) => {
      setFullscreenIndex(idx);
      setIsFullscreen(true);
    },
  });

  const handleBooking = () => {
    openBooking({
      roomId: room.id,
      roomName: room.name,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      adults: adults || undefined,
      children: children || undefined,
      childAges,
      priceDay: room.price_day,
      priceHalfDay: room.price_half_day,
    });
  };

  return (
    <>
      {realCount > 0 && (
        <div
          className="room-detail__gallery"
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onClick={onClickGallery}
        >
          <div className="room-detail__track" ref={trackRef}>
            {cloned.map((src, idx) => (
              <div key={`${src}-${idx}`} className="room-detail__slide">
                <Image
                  src={src}
                  fill
                  alt={`${name} – фото ${idx + 1}`}
                  className="room-detail__img"
                  priority={idx <= 1}
                  draggable={false}
                  sizes="(max-width: 767px) 100vw, 840px"
                />
              </div>
            ))}
          </div>

          {realCount > 1 && (
            <>
              <div className="room-detail__edge room-detail__edge--left" aria-hidden />
              <div className="room-detail__edge room-detail__edge--right" aria-hidden />
              <div className="room-detail__dots">
                {imgs.map((_, idx) => (
                  <span
                    key={idx}
                    className={
                      idx === realIndex
                        ? 'room-detail__dot room-detail__dot--active'
                        : 'room-detail__dot'
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      goReal(idx);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="room-detail__info">
        <h2 className="room-detail__name">{name}</h2>

        {maxGuests != null && (
          <p className="room-detail__capacity-heading">{resolvedCapacityHeading}</p>
        )}
        {(area != null || maxGuests != null) && (
          <div className="room-detail__details">
            {area != null && <span>{area} м²</span>}
            {maxGuests != null && (
              <span>
                • {maxGuests} {guestsLabel(maxGuests)}
                {extraGuestCapacity > 0 && ` + ${extraGuestCapacity} доп. место`}
              </span>
            )}
          </div>
        )}
        {amenities?.length > 0 && (
          <div className="room-detail__amenities">
            {amenities.map((key) => {
              const catalogEntry = amenityByKey.get(key);
              const Icon = amenityIcons[key];
              return (
                <div key={key} className="room-detail__amenity">
                  {catalogEntry?.icon_url ? (
                    <InlineSvgIcon src={catalogEntry.icon_url} className="room-detail__amenity-icon" />
                  ) : (
                    Icon && <Icon className="room-detail__amenity-icon" />
                  )}
                  <span>{catalogEntry?.label ?? key}</span>
                </div>
              );
            })}
          </div>
        )}

        {detailDescription && (
          <p className="room-detail__description">{detailDescription}</p>
        )}

        <div className="room-detail__pricing">
          <div className="room-detail__price-item">
            <span className="room-detail__price-label">
              {price_day_label || 'За сутки'}
            </span>
            <span className="room-detail__price-value">
              {price_day.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          {price_half_day != null && (
            <div className="room-detail__price-item">
              <span className="room-detail__price-label">
                {price_half_day_label || '12 часов'}
              </span>
              <span className="room-detail__price-value">
                {price_half_day.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          )}
        </div>
        {maxGuests != null && (
          <p className="room-detail__price-note">{resolvedPriceNote}</p>
        )}

        {/* Тарифы (фиксированная цена из «Тарифы») и свободный текст «Доп.
            услуги» — единый список в одном визуальном стиле: название и
            цена в одной строке, без отдельного бокса с ценой, отличного
            от остального перечисления. */}
        {((roomTariffs && roomTariffs.length > 0) || (extras && extras.length > 0)) && (
          <div className="room-detail__extras">
            <h4>Дополнительно</h4>
            <ul>
              {roomTariffs?.map((rt) => (
                <li key={`tariff-${rt.tariff_id}`}>
                  {rt.custom_label || rt.label} {rt.price.toLocaleString('ru-RU')} ₽
                </li>
              ))}
              {extras?.map((item, idx) => (
                <li key={`extra-${idx}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="room-detail__book-btn"
          type="button"
          onClick={handleBooking}
        >
          Забронировать
        </button>
      </div>

      {isFullscreen && (
        <FullscreenGallery
          images={imgs}
          initialIndex={fullscreenIndex}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}