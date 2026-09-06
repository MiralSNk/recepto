# Развёртывание через Docker

Альтернатива ручной установке из [`DEPLOY.md`](./DEPLOY.md) — вместо Node/MySQL/nginx/certbot по отдельности всё поднимается тремя контейнерами (приложение, MySQL, Caddy — реверс-прокси с автоматическим HTTPS) одной командой.

**Если разворачиваете вручную по DEPLOY.md — этот файл не нужен, используйте только один из двух вариантов.**

## 0. Что понадобится на сервере

- Docker и Docker Compose (`docker --version`, `docker compose version`).
- Домен, чья DNS A-запись уже указывает на IP этого сервера — без этого Caddy не получит сертификат Let's Encrypt.
- **Важно про память:** сборка образа (`docker build`) — это тот же `next build` внутри контейнера, ей так же нужно ~1.5–2 ГБ Node heap (уже выставлено в `Dockerfile`), Docker эту потребность не убирает. На маленьком сервере (как текущий тестовый — 823 МБ RAM) **не собирайте образ на нём самом** — см. раздел «Маленький сервер» ниже.

## 1. Первый запуск (сервер с достаточным объёмом RAM, от ~2 ГБ)

```bash
git clone <url-репозитория> /var/www/app
cd /var/www/app
cp .env.docker.example .env.docker
nano .env.docker   # заполнить реальными значениями — см. комментарии в файле

docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --build
```

Это одной командой: соберёт образ приложения, поднимет MySQL с постоянным volume, применит миграции и создаст первого администратора (автоматически, при первом старте — см. `docker-entrypoint.sh`), поднимет Caddy, который сам получит сертификат Let's Encrypt для домена из `DOMAIN` в `.env.docker`.

Проверить, что всё поднялось:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

## 2. Маленький сервер (RAM < ~2 ГБ) — собираем образ не на нём

```bash
# На своей машине/в CI:
docker build -t recepto-app:latest .
docker save recepto-app:latest | gzip > recepto-app.tar.gz
scp recepto-app.tar.gz user@сервер:/var/www/app/

# На сервере:
cd /var/www/app
docker load < recepto-app.tar.gz
```

Затем в `docker-compose.prod.yml` замените у сервиса `app` блок `build: ...` на `image: recepto-app:latest` и запустите без `--build`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d
```

## 3. HTTPS

Ничего отдельно настраивать не нужно — Caddy при первом старте сам обращается в Let's Encrypt за сертификатом для домена из `DOMAIN` и сам его продлевает. Единственное условие — DNS домена должен УЖЕ указывать на этот сервер к моменту запуска (см. шаг 0).

## 4. Первый вход и заполнение данных

Как и при обычной установке — `/admin/login` под учёткой из `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD`, затем сразу заполнить реальные название/адрес/телефон отеля, SEO-поля и секретное слово восстановления пароля (Настройки) — подробности в [`DEPLOY.md`](./DEPLOY.md), раздел «Первый вход и заполнение данных отеля», там же и почему до этого шага на сайте видны generic-плейсхолдеры.

## 5. Обновление после изменений в коде

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --build
```

Миграции применятся автоматически при старте нового контейнера (`docker-entrypoint.sh` идемпотентен — безопасно гонять при каждом запуске). На маленьком сервере — тот же манёвр со сборкой в другом месте (шаг 2), просто с новым образом.

## 6. Бэкап MySQL

Данные MySQL живут в именованном volume `mysql-data`, переживают `docker compose down`/пересоздание контейнеров (но не `docker compose down -v` — это удаляет volume'ы). Сделать дамп:

```bash
docker compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" > backup.sql
```

## Чем это отличается от ручной установки (DEPLOY.md)

| | Docker | Вручную |
|---|---|---|
| Что ставить на сервер | Docker + Compose | Node, MySQL, nginx, certbot |
| HTTPS | Caddy сам получает сертификат | certbot вручную (см. DEPLOY.md, шаг 9) |
| MySQL | Отдельный контейнер, свой volume | Системный MySQL, отдельная настройка |
| Обновление кода | `git pull` + пересборка образа | `git pull` + `pnpm build` + `pm2 restart` |
| pm2 | Не нужен — перезапуском занимается сам Docker (`restart: unless-stopped`) | Нужен, конфиг уже есть (`ecosystem.config.js`) |
