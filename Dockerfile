# syntax=docker/dockerfile:1

# Собирать этот образ лучше НЕ на самом целевом сервере, если он маленький
# (см. DOCKER.md) — next build сам по себе требует ~1.5–2 ГБ Node heap,
# Docker эту потребность не убирает, а только добавляет свой оверхед поверх.
# Собирайте на своей машине/в CI и доставляйте на сервер уже готовый образ.

FROM node:22-alpine AS base
WORKDIR /app
# pnpm@11.20.0 (зафиксирован в package.json как packageManager) сам требует
# Node 22.13+ — на Node 20 corepack падает на "no such built-in module:
# node:sqlite" при первом запуске pnpm.
#
# corepack prepare --activate качает и кэширует ИМЕННО эту версию pnpm ОДИН
# раз здесь, в общем слое base — deps/builder ниже наследуют его от base, а
# не тянут заново каждый в своём отдельном слое (без этого второе
# скачивание совпало с сетевым сбоем и уронило сборку на стадии builder).
#
# COREPACK_HOME переопределён на путь внутри /app намеренно: по умолчанию
# corepack кэширует скачанный pnpm в $HOME пользователя, от имени которого
# запущен (тут — root, при сборке). runner ниже переключается на непривилегированного
# nextjs командой USER — а у него уже ДРУГОЙ $HOME (/home/nextjs), без этого
# кэша. Из-за этого при первом же старте контейнера (docker-entrypoint.sh →
# pnpm start от nextjs) corepack повторно качал pnpm с npm registry прямо в
# рантайме — что на реальном сервере лишняя точка отказа при рестарте
# контейнера, а в песочнице однажды совпало с сетевым сбоем и уронило
# контейнер. Путь внутри /app наследуется во все стадии от base и позже
# получает права nextjs через общий chown -R в стадии runner.
ENV COREPACK_HOME=/app/.corepack
COPY package.json ./
RUN corepack enable && corepack prepare --activate

# ---- deps: только установка зависимостей (кэшируется отдельным слоем) ----
FROM base AS deps
# pnpm-workspace.yaml обязателен здесь — в нём allowBuilds для пакетов с
# install-скриптами (esbuild и т.д.), без него pnpm их блокирует по
# умолчанию и install падает с ERR_PNPM_IGNORED_BUILDS. package.json уже
# скопирован в base.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: сама сборка Next.js ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Тот же расчётный объём кучи, что и в DEPLOY.md для сборки без Docker —
# без этого next build падает с "JavaScript heap out of memory".
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runner: рантайм-образ ----
# Намеренно НЕ использует .next/standalone: его трассировка учитывает только
# то, что реально импортируют страницы/роуты Next.js, а scripts/migrate-mysql.mjs
# и scripts/bootstrap-admin.mjs — отдельные standalone-скрипты вне рендеринга,
# и pnpm держит node_modules через симлинки в .pnpm/, так что "докопировать"
# туда недостающие пакеты после трассировки не получится просто скопировав
# папку пакета — симлинк без своей цели. Проще и надёжнее поставить полный
# prod node_modules один раз здесь, тем же образом, что и вне Docker
# (см. DEPLOY.md) — next start вместо node server.js.
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Непривилегированный пользователь — не запускаем сервер от root.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/migrations ./migrations
COPY docker-entrypoint.sh ./

RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
