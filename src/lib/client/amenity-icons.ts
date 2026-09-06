import WifiIcon from '@/assets/icons/wifi.svg';
import ConditionerIcon from '@/assets/icons/snow.svg';
import TvIcon from '@/assets/icons/tv.svg';

/**
 * Дефолтные встроенные иконки для трёх «стандартных» удобств. Для любого
 * другого amenity_key (включая новые, добавленные в админке) компоненты
 * берут icon_url из каталога удобств (см. RoomCard/RoomDetailContent) — этот
 * словарь используется только как fallback, если icon_url не задан.
 */
export const amenityIcons: Record<string, React.FC<{ className?: string }>> = {
  wifi: WifiIcon,
  conditioner: ConditionerIcon,
  tv: TvIcon,
};