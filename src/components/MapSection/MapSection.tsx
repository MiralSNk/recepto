import './MapSection.scss';
import AddressIcon from '@/assets/icons/map.svg';
import PhoneIcon from '@/assets/icons/phone.svg';
import EmailIcon from '@/assets/icons/email.svg';
import BookingButton from '@/components/BookingForm/BookingButton';
import { phoneToTelHref } from '@/lib/utils/phone';

type MapSectionProps = {
  hotelAddress?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  hotelLat?: string;
  hotelLon?: string;
};

const MapSection = ({
  hotelAddress = '',
  hotelPhone = '',
  hotelEmail = '',
  hotelLat = '',
  hotelLon = '',
}: MapSectionProps) => {
  // Без дефолтных координат: раньше незаполненные hotelLat/hotelLon
  // подменялись реальными координатами конкретного отеля — на новом
  // развёртывании карта показывала бы чужой город с меткой не там, где
  // реально находится гостиница. Если координаты ещё не заданы в админке,
  // просто не показываем виджет карты (контакты и кнопка брони — по-прежнему
  // видны).
  const hasCoords = Boolean(hotelLat && hotelLon);
  // Виджет без привязки к конкретной org-карточке: точка (ll/pt) строится из
  // координат отеля в админке, а не хранится как захардкоженная ссылка с oid.
  const mapUrl = hasCoords
    ? `https://yandex.ru/map-widget/v1/?ll=${hotelLon}%2C${hotelLat}&z=17&pt=${hotelLon},${hotelLat},pm2rdm`
    : '';

  const contacts = [
    hotelAddress && { icon: AddressIcon, text: hotelAddress },
    hotelPhone && { icon: PhoneIcon, text: hotelPhone, href: phoneToTelHref(hotelPhone) },
    hotelEmail && { icon: EmailIcon, text: hotelEmail, href: `mailto:${hotelEmail}` },
  ].filter((c): c is { icon: React.FC<{ className?: string }>; text: string; href?: string } => Boolean(c));

  return (
    <section className="map-section">
      {hasCoords && (
        <div className="map-section__map">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            title="Карта расположения отеля"
            loading="lazy"
          />
        </div>
      )}

      <div className="map-section__contacts-bar">
        <div className="map-section__contacts-container">
          {contacts.map(({ icon: Icon, text, href }, index) => (
            <div key={index} className="map-section__contact">
              <Icon className="map-section__icon" />
              {href ? (
                <a href={href} className="map-section__link">
                  {text}
                </a>
              ) : (
                <span className="map-section__text">{text}</span>
              )}
            </div>
          ))}
        </div>

        <BookingButton className="map-section__book-btn">
          Забронировать
        </BookingButton>
      </div>
    </section>
  );
};

export default MapSection;