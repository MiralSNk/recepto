'use client';

import { useEffect, useState } from 'react';
import { AdminCategory, AdminRoom } from '@/types';
import { api } from '@/lib/utils/api';
import RoomsTable from './RoomsTable';
import RoomFormModal from './RoomFormModal';
import BulkPriceModal from './BulkPriceModal';
import './RoomsClient.scss';

interface RoomsClientProps {
  categories: AdminCategory[];
}

export default function RoomsClient({ categories }: RoomsClientProps) {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  // initialLoading — только первая загрузка, гасит собой всю страницу.
  // loading — фоновое обновление (смена фильтра/поиска): показываем лёгкий
  // индикатор, но НЕ снимаем с экрана уже отрисованные поля — иначе строка
  // поиска (и фокус в ней) пересоздавалась бы на каждую букву.
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<AdminRoom | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (searchQuery) params.append('q', searchQuery);
      const data = await api.get<AdminRoom[]>(`/api/admin/rooms?${params.toString()}`);
      setRooms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить номера');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, searchQuery]);

  // Debounce поискового ввода — не долбим API на каждое нажатие клавиши.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleEdit = (room: AdminRoom) => {
    setEditingRoom(room);
    setShowFormModal(true);
  };

  const handleFormClose = () => {
    setShowFormModal(false);
    setEditingRoom(null);
    fetchRooms();
  };

  const handleBulkClose = () => {
    setShowBulkModal(false);
    fetchRooms();
  };

  if (initialLoading) return <div className="admin-loading">Загрузка...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-rooms">
      <div className="admin-rooms__header">
        <h1>Номера{loading && <span className="admin-rooms__header-loading"> · обновление…</span>}</h1>
        <div className="admin-rooms__actions">
          <button
            className="admin-rooms__bulk-btn"
            onClick={() => setShowBulkModal(true)}
          >
            📊 Массовое обновление цен
          </button>
          <button
            className="admin-rooms__add-btn"
            onClick={() => {
              setEditingRoom(null);
              setShowFormModal(true);
            }}
          >
            + Добавить номер
          </button>
        </div>
      </div>

      <div className="admin-rooms__filters">
        <input
          type="text"
          placeholder="Поиск по названию или описанию..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="admin-rooms__search"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="admin-rooms__filter-select"
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.key}>{cat.label}</option>
          ))}
        </select>
      </div>

      <RoomsTable
        rooms={rooms}
        onEdit={handleEdit}
        onRefresh={fetchRooms}
      />

      <RoomFormModal
        isOpen={showFormModal}
        onClose={handleFormClose}
        editingRoom={editingRoom}
        categories={categories}
      />

      <BulkPriceModal
        isOpen={showBulkModal}
        onClose={handleBulkClose}
        categories={categories}
      />
    </div>
  );
}