#!/bin/sh
# Выполняется НА СЕРВЕРЕ при каждом деплое через CI (.github/workflows/ci.yml,
# job "deploy"). Сам git pull делает не этот файл, а сама CI-команда ДО его
# запуска — так на сервере всегда выполняется свежая версия этого скрипта,
# а не та, что была на диске до пуша.
#
# Режим (pm2 или docker) читается из локального файла .deploy-mode рядом с
# этим скриптом (в корне проекта) — заводится один раз вручную при первичной
# настройке сервера по DEPLOY.md либо DOCKER.md, см. инструкции там же.
# Файл не в git (в .gitignore) — это характеристика конкретного сервера, а
# не кода.
set -e

DEPLOY_MODE=$(cat .deploy-mode 2>/dev/null || echo pm2)

if [ "$DEPLOY_MODE" = "docker" ]; then
  echo "[deploy] Режим: docker"
  docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --build
else
  echo "[deploy] Режим: pm2"
  pnpm install --frozen-lockfile
  pnpm build
  pnpm db:migrate
  pm2 restart ecosystem.config.js
fi

echo "[deploy] Готово"
