'use client';

/**
 * Горизонтальная панель категорий номеров.
 * Используется в BookingPanel для фильтрации.
 */
interface CategoryChip {
  key: string;
  label: string;
}

interface CategoryChipsProps {
  categories: CategoryChip[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryChips({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryChipsProps) {
  return (
    <div className="booking-panel__categories">
      <div className="booking-panel__categories-scroll">
        {/* Кнопка "Все номера" */}
        <button
          type="button"
          className={`booking-panel__category-chip ${
            activeCategory === 'all'
              ? 'booking-panel__category-chip--active'
              : ''
          }`}
          onClick={() => onCategoryChange('all')}
        >
          Все номера
        </button>

        {/* Категории из БД */}
        {categories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={`booking-panel__category-chip ${
              activeCategory === category.key
                ? 'booking-panel__category-chip--active'
                : ''
            }`}
            onClick={() => onCategoryChange(category.key)}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}