# Разворачивание на новом сервере (включая HTTPS с нуля)

Полный пошаговый гайд для чистого Ubuntu/Debian-сервера с новым доменом. Если сервер уже частично настроен (Node/MySQL/nginx уже стоят) — пропускайте соответствующие шаги. Всё, что нужно поменять под свой случай, помечено `<...>`.

Предполагается: у вас уже есть домен и доступ к его DNS-настройкам, и root/sudo-доступ на сервер по SSH.

---

## 0. DNS (сделать заранее — распространяется от минут до суток)

У регистратора/DNS-провайдера домена добавьте A-запись:

```
<ваш-домен>       A     <IP-адрес-сервера>
www.<ваш-домен>   A     <IP-адрес-сервера>   (если нужен www)
```

Проверить, что распространилось, до похода дальше:

```bash
dig +short <ваш-домен>
# должен вернуть IP вашего сервера
```

Certbot (шаг 9) не выпустит сертификат, пока домен не резолвится на этот сервер.

## 1. Системные пакеты

```bash
sudo apt update
sudo apt install -y curl git nginx mysql-server

# Node.js 20+ (через nvm — не обязательно, но удобнее системного apt-пакета)
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
corepack enable   # даёт pnpm без отдельной установки

# pm2 — держит процесс живым и поднимает после ребута сервера
npm install -g pm2
```

## 2. MySQL: база и пользователь

```bash
sudo mysql
```

В консоли MySQL:

```sql
CREATE DATABASE recepto_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'recepto'@'localhost' IDENTIFIED BY '<надёжный-пароль-БД>';
GRANT ALL PRIVILEGES ON recepto_db.* TO 'recepto'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Код приложения

```bash
sudo mkdir -p /var/www/app && sudo chown $USER:$USER /var/www/app
git clone <ssh-или-https-url-репозитория> /var/www/app
cd /var/www/app
pnpm install
```

## 4. Переменные окружения

```bash
cp .env.example .env.production
nano .env.production   # или любой другой редактор
```

Минимум, что нужно заполнить прямо сейчас (остальное — на шаге 10, когда появится HTTPS):

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=recepto
DB_PASSWORD=<пароль из шага 2>
DB_NAME=recepto_db

NEXTAUTH_SECRET=<случайная строка, например: openssl rand -base64 32>
NEXTAUTH_URL=http://<ваш-домен>          # временно http — поправим на шаге 10

BOOTSTRAP_ADMIN_EMAIL=<email админа>
BOOTSTRAP_ADMIN_PASSWORD=<надёжный пароль>

MAIL_TO=<куда слать заявки с сайта>
# SMTP_*, YANDEX_*, NEXT_PUBLIC_YANDEX_CAPTCHA_SITEKEY — по своим ключам,
# см. пояснения в самом .env.example

NEXT_PUBLIC_SITE_URL=http://<ваш-домен>  # временно http — поправим на шаге 10
```

Полный список переменных с описанием каждой — в [`.env.example`](./.env.example). Где взять `YANDEX_FOLDER_ID`/`YANDEX_API_KEY`/`YANDEX_CAPTCHA_SERVERKEY`/`NEXT_PUBLIC_YANDEX_CAPTCHA_SITEKEY` в консоли Yandex Cloud — пошагово в [`YANDEX_SETUP.md`](./YANDEX_SETUP.md), включая нюанс про обязательный список доменов для капчи.

## 5. Миграции БД

```bash
pnpm db:migrate
```

Применяет все `migrations/mysql/*.sql` по порядку. После этого в SEO/Главной админке будут generic-плейсхолдеры («Название вашего отеля» и т.п.) — это ожидаемо, реальные данные вносятся на шаге 12.

## 6. Первый администратор

Таблица `users` после миграций пустая — залогиниться в `/admin` пока некому:

```bash
pnpm admin:bootstrap
```

(Значения берутся из `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` в `.env.production`, загруженных на шаге 4.) Безопасно перезапускать — если админ уже есть, скрипт ничего не делает.

## 7. Сборка

```bash
NODE_OPTIONS="--max-old-space-size=2048" pnpm build
```

**Важно про память:** сборке нужен Node heap ~1.5–2 ГБ, иначе она падает с `JavaScript heap out of memory`. Если у сервера меньше 2 ГБ RAM свободно — либо соберите на другой машине и скопируйте на сервер готовую папку `.next` целиком (плюс `node_modules`, `public`, `package.json`, `ecosystem.config.js`), либо временно добавьте своп:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
# после сборки своп можно оставить или отключить: sudo swapoff /swapfile
```

## 8. Запуск через pm2

```bash
pm2 start ecosystem.config.js
pm2 save                 # запоминает текущий список процессов
pm2 startup              # выведет команду — скопируйте и выполните её,
                          # чтобы pm2 поднимал приложение после перезагрузки сервера
```

Приложение теперь слушает `http://127.0.0.1:3000` (порт по умолчанию у `next start`) — наружу пока не смотрит, это нормально, следующий шаг открывает к нему доступ снаружи через nginx.

## 9. nginx: реверс-прокси + HTTPS через Let's Encrypt

Сначала — обычный HTTP-конфиг (без него certbot не сможет пройти проверку домена):

```bash
sudo nano /etc/nginx/sites-available/<ваш-домен>
```

```nginx
server {
    listen 80;
    server_name <ваш-домен> www.<ваш-домен>;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/<ваш-домен> /etc/nginx/sites-enabled/
sudo nginx -t             # проверка синтаксиса
sudo systemctl reload nginx
```

Проверьте, что сайт уже открывается по `http://<ваш-домен>` (пока без замка) — если нет, дальше идти рано, разбирайтесь с этим шагом.

Теперь получаем сертификат — certbot сам допишет `listen 443 ssl` и редирект с http на https в этот же файл:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <ваш-домен> -d www.<ваш-домен>
```

Certbot спросит email (для уведомлений об истечении) и предложит редирект http→https — соглашайтесь. Автопродление сертификата (раз в 90 дней) уже настроено systemd-таймером — проверить можно так:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run   # тестовый прогон продления, без реальной замены
```

## 10. Переключаем приложение на HTTPS

Теперь, когда домен реально отвечает по `https://`, обновите в `.env.production`:

```bash
nano /var/www/app/.env.production
```

```bash
NEXTAUTH_URL=https://<ваш-домен>
NEXT_PUBLIC_SITE_URL=https://<ваш-домен>
```

`NEXTAUTH_URL` определяет, ставить ли cookie сессии с флагом `secure` (только `https://` в её значении об этом узнаёт — сам код нигде протокол не проверяет). `NEXT_PUBLIC_SITE_URL` используется в canonical/OG-ссылках, sitemap.xml и в проверке «безопасных» ссылок чат-виджета.

**`NEXT_PUBLIC_SITE_URL` вшивается в клиентский JS-бандл на этапе сборки** — простого рестарта недостаточно, нужна пересборка:

```bash
cd /var/www/app
NODE_OPTIONS="--max-old-space-size=2048" pnpm build
pm2 restart recepto
```

## 11. Проверка после переключения

- `https://<ваш-домен>` открывается с замком, `http://<ваш-домен>` сам редиректит на https (сделал certbot).
- В консоли браузера (F12) на любой странице нет предупреждений про mixed content / заблокированные ресурсы.
- `/admin/login` — вход под учёткой из шага 6 работает, сессия сохраняется после обновления страницы (значит cookie реально ставится, а не отбрасывается браузером из-за флага `secure` без реального https — если бы `NEXTAUTH_URL` остался http, а сайт уже https, именно так бы и проявилось: логин "проходит", но тут же разлогинивает).
- Чат-виджет открывается и отвечает (проверяет, что `NEXT_PUBLIC_SITE_URL` и капча настроены верно).

## 12. Первый вход и заполнение данных отеля

Зайдите в `/admin/login` и сразу заполните (до этого момента сайт технически работает, но показывает generic-плейсхолдеры вместо реальных данных):

- **Главная** — название/адрес/телефон/email отеля, логотип, hero-изображение.
- **SEO** — заголовки/описания страниц, соцсети, координаты на карте, подтверждение и счётчик Яндекса (свои, не от предыдущего сайта).
- **Настройки** → секретное слово для восстановления пароля (без него `/admin-recovery` не работает вообще — честная ошибка вместо иллюзии защиты).
- Тарифы/лимиты гостей, если отличаются от дефолтов.

## Шпаргалка на будущее (что делать при обычных изменениях)

| Что поменялось | Нужна пересборка? | Команда |
|---|---|---|
| Контент через админку (SEO, цены, номера и т.д.) | Нет | ничего — сразу видно на сайте |
| Код (`git pull` новых коммитов) | Да | `pnpm install && pnpm build && pm2 restart recepto` |
| `NEXT_PUBLIC_*` переменная в `.env.production` | Да (см. шаг 10) | `pnpm build && pm2 restart recepto` |
| Остальные переменные в `.env.production` (БД, SMTP, ключи) | Нет, но нужен рестарт | `pm2 restart recepto` |
| Новая миграция появилась в `migrations/mysql/` | Нет | `pnpm db:migrate` |
