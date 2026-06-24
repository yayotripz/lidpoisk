#!/bin/sh
# docker-entrypoint.sh — инициализация persistent SQLite перед стартом Next.js
set -e

DB_PATH="/var/data/custom.db"
SEED_PATH="/app/seed.db"

# Render монтирует volume в /var/data. Если БД отсутствует — копируем seed.
if [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] БД не найдена в $DB_PATH — копирую seed.db..."
  mkdir -p /var/data
  if [ -f "$SEED_PATH" ]; then
    cp "$SEED_PATH" "$DB_PATH"
    echo "[entrypoint] Скопировано $(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH") байт."
  else
    echo "[entrypoint] ВНИМАНИЕ: seed.db не найден, БД будет создана Prisma при первом запросе."
  fi
else
  echo "[entrypoint] БД уже существует в $DB_PATH ($(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH") байт)."
fi

# Запускаем основную команду (CMD)
exec "$@"
