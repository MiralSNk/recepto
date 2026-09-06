import '@/styles/skeletons/skeletons.scss';

function RoomCardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden>
      <div className="skeleton-card__img" />
      <div className="skeleton-card__body">
        <div className="sk-line sk-line--title" />
        <div className="sk-line" style={{ width: '90%' }} />
        <div className="sk-line" style={{ width: '70%' }} />
        <div className="skeleton-card__footer">
          <div className="skeleton-card__price" />
          <div className="skeleton-card__btn" />
        </div>
      </div>
    </div>
  );
}

/** Главная и /[category] */
export default function HomeSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="skeleton-home" role="status" aria-label="Загрузка номеров">
      <div className="skeleton-home__panel">
        <div className="skeleton-home__row">
          <div className="skeleton-home__field" />
          <div className="skeleton-home__field" />
        </div>
        <div className="skeleton-home__chips">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-home__chip" />
          ))}
        </div>
      </div>

      <div className="skeleton-home__grid">
        {Array.from({ length: cards }).map((_, i) => (
          <RoomCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}