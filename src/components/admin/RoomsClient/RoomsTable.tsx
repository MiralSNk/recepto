'use client';

import { AdminRoom } from '@/types';
import { api } from '@/lib/utils/api';

interface RoomsTableProps {
  rooms: AdminRoom[];
  onEdit: (room: AdminRoom) => void;
  onRefresh: () => void;
}

export default function RoomsTable({ rooms, onEdit, onRefresh }: RoomsTableProps) {
  const togglePublish = async (room: AdminRoom) => {
    try {
      await api.put(`/api/admin/rooms/${room.id}`, {
        is_published: !room.is_published,
      });
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить номер?')) return;
    try {
      await api.delete(`/api/admin/rooms/${id}`);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <div className="admin-rooms__table-wrap">
      <table className="admin-rooms__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Категория</th>
            <th>Цена (осн.)</th>
            <th>Цена (сутки)</th>
            <th>Цена (12ч)</th>
            <th>Гостей</th>
            <th>Площадь</th>
            <th>Публикация</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id}>
              <td>{room.id}</td>
              <td>{room.name}</td>
              <td>{room.category_label || room.category_key}</td>
              <td>{room.price}</td>
              <td>{room.price_day}</td>
              <td>{room.price_half_day ?? '—'}</td>
              <td>{room.guests ?? '—'}</td>
              <td>{room.area ?? '—'}</td>
              <td>
                <button
                  className={`admin-rooms__toggle ${room.is_published ? 'admin-rooms__toggle--published' : 'admin-rooms__toggle--draft'}`}
                  onClick={() => togglePublish(room)}
                >
                  {room.is_published ? '✅ Опубликован' : '⏳ Черновик'}
                </button>
              </td>
              <td>
                <button className="admin-rooms__edit" onClick={() => onEdit(room)}>✏️</button>
                <button className="admin-rooms__delete" onClick={() => handleDelete(room.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}