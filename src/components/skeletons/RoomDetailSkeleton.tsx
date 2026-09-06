import '@/styles/skeletons/skeletons.scss';

type Props = {
  /** modal — затемнение + sheet; full — на всю страницу */
  variant?: 'modal' | 'full';
};

export default function RoomDetailSkeleton({ variant = 'full' }: Props) {
  const inner = (
    <>
      <div className="skeleton-room__back" />
      <div className="skeleton-room__gallery" />
      <div className="skeleton-room__info">
        <div className="sk-line sk-line--title" style={{ width: '55%' }} />
        <div className="sk-line sk-line--sm" />
        <div className="skeleton-room__amenities">
          <div className="skeleton-room__amenity" />
          <div className="skeleton-room__amenity" />
          <div className="skeleton-room__amenity" />
        </div>
        <div className="sk-line" style={{ width: '100%' }} />
        <div className="sk-line" style={{ width: '95%' }} />
        <div className="sk-line" style={{ width: '80%' }} />
        <div className="skeleton-room__pricing" />
        <div className="skeleton-room__cta" />
      </div>
    </>
  );

  if (variant === 'modal') {
    return (
      <div
        className="skeleton-room skeleton-room--modal"
        role="status"
        aria-label="Загрузка номера"
      >
        <div className="skeleton-room__sheet">{inner}</div>
      </div>
    );
  }

  return (
    <div
      className="skeleton-room room-detail room-detail--full"
      role="status"
      aria-label="Загрузка номера"
    >
      <div className="room-detail__container skeleton-room__sheet">{inner}</div>
    </div>
  );
}