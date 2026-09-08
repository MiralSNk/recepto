#!/bin/sh
# Полная автоматизация DOCKER.md — выполняется НА СВЕЖЕМ сервере через
# .github/workflows/provision.yml (запускается вручную, workflow_dispatch).
#
# Требует уже записанный .env.docker рядом с этим скриптом (пишет вызывающий
# workflow из секрета ENV_DOCKER ДО запуска этого скрипта, включая DOMAIN —
# им пользуется Caddy для получения сертификата, отдельно передавать не нужно).
#
# Миграции и создание первого администратора делает сам docker-entrypoint.sh
# при старте контейнера приложения — этому скрипту дополнительно ничего
# делать не нужно, в отличие от pm2-режима.
set -e

if [ ! -f .env.docker ]; then
  echo "[provision] .env.docker не найден рядом со скриптом — прервано" >&2
  exit 1
fi

echo "[provision] 1/2: Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "[provision] 2/2: запуск стека (mysql + app + caddy)"
sudo docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --build

echo "[provision] Готово — логи приложения:"
sudo docker compose -f docker-compose.prod.yml logs --tail 50 app
echo "[provision] Дальше вручную: зайти в /admin/login и заполнить реальные данные — см. README.md"
