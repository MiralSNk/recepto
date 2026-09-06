'use client';

/**
 * Секция отображения списка мест рядом с отелем.
 * Получает места и колбэки для редактирования/удаления.
 */
interface Place {
  id: number;
  name: string;
  category_key: string;
  lat: number;
  lon: number;
  description: string;
  sort_order: number;
  is_visible: boolean;
}

interface PlacesSectionProps {
  places: Place[];
  categories: { key: string; label: string }[];
  onEdit: (place: Place) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

export default function PlacesSection({
  places,
  categories,
  onEdit,
  onDelete,
  onAdd,
}: PlacesSectionProps) {
  return (
    <section className="admin-chat__section">
      <div className="admin-chat__section-header">
        <h2>Места рядом</h2>
        <button className="admin-chat__add-btn" onClick={onAdd}>
          + Добавить место
        </button>
      </div>
      <ul className="admin-chat__list">
        {places.map((place) => {
          const categoryLabel =
            categories.find((c) => c.key === place.category_key)?.label ||
            place.category_key;
          return (
            <li key={place.id} className="admin-chat__list-item">
              <div className="admin-chat__list-info">
                <strong>{place.name}</strong>
                <span>
                  {categoryLabel} · {place.description}
                </span>
                {!place.is_visible && (
                  <span className="admin-chat__hidden-badge">Скрыто</span>
                )}
              </div>
              <div className="admin-chat__list-actions">
                <button
                  className="admin-chat__edit-btn"
                  onClick={() => onEdit(place)}
                >
                  ✏️
                </button>
                <button
                  className="admin-chat__delete-btn"
                  onClick={() => onDelete(place.id)}
                >
                  🗑️
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}