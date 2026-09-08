#!/bin/sh
# Полная автоматизация DEPLOY.md (pm2-режим) — выполняется НА СВЕЖЕМ сервере
# через .github/workflows/provision.yml (запускается вручную, workflow_dispatch).
# Каждый шаг соответствует одноимённому шагу в DEPLOY.md — при любом
# расхождении поведения ориентир правильности — DEPLOY.md, этот скрипт лишь
# его автоматизирует.
#
# Требует:
#   - уже записанный .env.production рядом с этим скриптом (пишет вызывающий
#     workflow из секрета ENV_PRODUCTION ДО запуска этого скрипта);
#   - переменные окружения DOMAIN и CERTBOT_EMAIL (см. PROVISION.md).
#
# Идемпотентен настолько, насколько позволяют используемые команды (apt install
# уже установленного — no-op, CREATE DATABASE/USER IF NOT EXISTS, миграции и
# admin:bootstrap идемпотентны сами по себе, ln -sf перезаписывает симлинк) —
# безопасно перезапустить при сбое на середине, но рассчитан на первый запуск
# на пустом сервере, а не на регулярные повторные прогоны.
set -e

: "${DOMAIN:?DOMAIN не задан}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL не задан}"

if [ ! -f .env.production ]; then
  echo "[provision] .env.production не найден рядом со скриптом — прервано" >&2
  exit 1
fi

echo "[provision] 1/9: системные пакеты"
sudo apt-get update -y
sudo apt-get install -y curl git nginx mysql-server

if [ ! -d "$HOME/.nvm" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"
nvm install 20
corepack enable
sudo npm install -g pm2

echo "[provision] 2/9: MySQL — база и пользователь"
DB_NAME=$(grep -E '^DB_NAME=' .env.production | head -1 | cut -d= -f2-)
DB_USER=$(grep -E '^DB_USER=' .env.production | head -1 | cut -d= -f2-)
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' .env.production | head -1 | cut -d= -f2-)
: "${DB_NAME:?DB_NAME не найден в .env.production}"
: "${DB_USER:?DB_USER не найден в .env.production}"
: "${DB_PASSWORD:?DB_PASSWORD не найден в .env.production}"
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "[provision] 3/9: зависимости"
pnpm install --frozen-lockfile

echo "[provision] 4/9: миграции БД"
pnpm db:migrate

echo "[provision] 5/9: первый администратор"
pnpm admin:bootstrap

echo "[provision] 6/9: сборка"
NODE_OPTIONS="--max-old-space-size=2048" pnpm build

echo "[provision] 7/9: запуск через pm2"
pm2 start ecosystem.config.js
pm2 save
STARTUP_CMD=$(pm2 startup 2>&1 | grep '^sudo ' || true)
if [ -n "$STARTUP_CMD" ]; then
  eval "$STARTUP_CMD"
fi

echo "[provision] 8/9: nginx (HTTP, до получения сертификата)"
sudo tee "/etc/nginx/sites-available/$DOMAIN" > /dev/null <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "[provision] 9/9: HTTPS через certbot"
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
  --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect

echo "[provision] Готово: https://$DOMAIN"
echo "[provision] Дальше вручную: зайти в /admin/login и заполнить реальные данные — см. README.md"
