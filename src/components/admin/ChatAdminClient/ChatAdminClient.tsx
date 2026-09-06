'use client';

/**
 * Главный компонент управления чат-ботом.
 * Координирует тексты, быстрые кнопки, места и неотвеченные запросы.
 */

import { useEffect, useState } from 'react';
import './ChatAdminClient.scss';
import TextsSection from './TextsSection';
import QuickRepliesSection from './QuickRepliesSection';
import PlacesSection from './PlacesSection';
import PlaceModal from './PlaceModal';
import UnansweredQueriesSection from './UnansweredQueriesSection';
import { api } from '@/lib/utils/api';

interface QuickReply {
  id: number;
  label: string;
  action: string;
  sort_order: number;
}

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

interface PlaceCategory {
  key: string;
  label: string;
}

interface UnansweredQuery {
  id: number;
  query_text: string;
  answer: string | null;
  answered_at: string | null;
  count: number;
  last_asked_at: string;
  created_at: string;
}

interface ChatSettingsResponse {
  settings?: {
    capabilities?: string;
    cancelBooking?: string;
  };
  quickReplies?: QuickReply[];
}

export default function ChatAdminClient() {
  const [settings, setSettings] = useState({
    capabilities: '',
    cancelBooking: '',
  });
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeCategories, setPlaceCategories] = useState<PlaceCategory[]>([]);
  const [unansweredQueries, setUnansweredQueries] = useState<UnansweredQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<ChatSettingsResponse>('/api/admin/chat'),
      api.get<Place[]>('/api/admin/places'),
      api.get<PlaceCategory[]>('/api/admin/place-categories'),
      api.get<UnansweredQuery[]>('/api/admin/unanswered-queries'),
    ])
      .then(([chatData, placesData, categoriesData, unansweredData]) => {
        setSettings({
          capabilities: chatData.settings?.capabilities || '',
          cancelBooking: chatData.settings?.cancelBooking || '',
        });
        setQuickReplies(chatData.quickReplies || []);
        setPlaces(placesData);
        setPlaceCategories(categoriesData);
        setUnansweredQueries(unansweredData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaveTexts = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/chat', {
        setting_key: 'capabilities_text',
        value: settings.capabilities,
      });
      await api.put('/api/admin/chat', {
        setting_key: 'cancel_booking_text',
        value: settings.cancelBooking,
      });
      alert('Настройки сохранены');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUnansweredAnswer = async (
    id: number,
    answer: string | null
  ) => {
    await api.put(`/api/admin/unanswered-queries/${id}`, { answer });
    setUnansweredQueries((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              answer,
              answered_at: answer ? new Date().toISOString() : null,
            }
          : q
      )
    );
  };

  const handleAddQuickReply = async () => {
    const label = prompt('Введите текст кнопки');
    const action = prompt('Введите действие (например, "__BOOK__" или текст)');
    if (!label || !action) return;

    try {
      const newReply = await api.post<QuickReply>('/api/admin/chat', {
        label,
        action,
        sort_order: quickReplies.length * 10,
      });
      setQuickReplies((prev) => [...prev, newReply]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка добавления');
    }
  };

  const handleDeleteQuickReply = async (id: number) => {
    try {
      await api.delete(`/api/admin/chat/${id}`);
      setQuickReplies((prev) => prev.filter((qr) => qr.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleOpenPlaceModal = (place?: Place) => {
    setEditingPlace(place || null);
    setShowPlaceModal(true);
  };

  const handleClosePlaceModal = () => {
    setShowPlaceModal(false);
    setEditingPlace(null);
  };

  const handlePlaceSubmit = async (data: Omit<Place, 'id'>) => {
    try {
      if (editingPlace) {
        await api.put(`/api/admin/places/${editingPlace.id}`, data);
      } else {
        await api.post('/api/admin/places', data);
      }
      const updatedPlaces = await api.get<Place[]>('/api/admin/places');
      setPlaces(updatedPlaces);
      handleClosePlaceModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения места');
    }
  };

  const handleDeletePlace = async (id: number) => {
    if (!confirm('Удалить место?')) return;
    try {
      await api.delete(`/api/admin/places/${id}`);
      setPlaces((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleDeleteUnansweredQuery = async (id: number) => {
    if (!confirm('Удалить запрос?')) return;
    try {
      await api.delete(`/api/admin/unanswered-queries/${id}`);
      setUnansweredQueries((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleSaveAnswer = async (id: number, answer: string) => {
    await api.put(`/api/admin/unanswered-queries/${id}`, { answer });
    setUnansweredQueries((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, answer, answered_at: new Date().toISOString() }
          : q
      )
    );
  };

  if (loading) return <div className="admin-chat__loading">Загрузка...</div>;

  return (
    <div className="admin-chat">
      <h1 className="admin-chat__title">Управление чат-ботом</h1>

      <TextsSection
        capabilities={settings.capabilities}
        cancelBooking={settings.cancelBooking}
        onChangeCapabilities={(value) =>
          setSettings((prev) => ({ ...prev, capabilities: value }))
        }
        onChangeCancelBooking={(value) =>
          setSettings((prev) => ({ ...prev, cancelBooking: value }))
        }
        onSave={handleSaveTexts}
        saving={saving}
      />

      <QuickRepliesSection
        quickReplies={quickReplies}
        onAdd={handleAddQuickReply}
        onDelete={handleDeleteQuickReply}
      />

      <PlacesSection
        places={places}
        categories={placeCategories}
        onEdit={handleOpenPlaceModal}
        onDelete={handleDeletePlace}
        onAdd={() => handleOpenPlaceModal()}
      />

      <UnansweredQueriesSection
        queries={unansweredQueries}
        onDelete={handleDeleteUnansweredQuery}
        onSaveAnswer={handleSaveUnansweredAnswer}
      />

      {showPlaceModal && (
        <PlaceModal
          isOpen={showPlaceModal}
          editingPlace={editingPlace}
          categories={placeCategories}
          onClose={handleClosePlaceModal}
          onSubmit={handlePlaceSubmit}
        />
      )}
    </div>
  );
}