import { CategoryKey } from '../categories';

export interface AdminCategory {
  id: number;
  key: CategoryKey;
  label: string;
  is_visible: boolean;
  // Лимит гостей в пикере для этой категории. null — своего лимита нет,
  // используется общий сайтовый (site_settings.max_guests_absolute) —
  // см. src/lib/shared/guest-limits.ts.
  max_guests: number | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}