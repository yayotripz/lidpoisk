# ЛидПоиск — поиск лидов для веб-агентства

Next.js 16 + Tailwind 4 + shadcn/ui + Prisma + SQLite.
В базе — 3265 лидов по 14 нишам и 11 странам СНГ.

## Деплой на Render.com (free tier)

### Что подготовлено
- `Dockerfile` — multi-stage build (bun → next build → standalone runtime)
- `docker-entrypoint.sh` — автоматически копирует seed.db в persistent volume при первом запуске
- `render.yaml` — Render Blueprint ( Frankfurt region, 1GB disk )
- `db/seed.db` — SQLite с 3265 лидами (копируется в volume при первом старте)
- `.env` — `DATABASE_URL=file:/var/data/custom.db`

### Шаги

1. Залейте этот проект в новый **публичный** GitHub-репозиторий:
   ```bash
   git init
   git add .
   git commit -m "init: ЛидПоиск"
   git branch -M main
   git remote add origin https://github.com/<ВАШ_ЛОГИН>/lidpoisk.git
   git push -u origin main
   ```

2. На [render.com](https://render.com) зарегистрируйтесь (free tier).

3. **New → Web Service** → выберите GitHub-репозиторий.
   - Render сам подхватит `render.yaml` и создаст сервис с disk.
   - Либо вручную:
     - **Runtime**: Docker
     - **Region**: Frankfurt
     - **Branch**: main
     - **Plan**: Free
     - **Environment variables**:
       - `DATABASE_URL` = `file:/var/data/custom.db`
       - `NODE_ENV` = `production`
       - `NEXT_TELEMETRY_DISABLED` = `1`
     - **Disk**: 1 GB, mount path `/var/data`

4. Render автоматически соберёт Docker-образ (5–8 минут) и запустит сервер.
   URL будет вида `https://lidpoisk.onrender.com`.

5. После первого деплоя откройте сайт — данные уже внутри (3265 лидов).

### Local dev

```bash
npm install
npm run db:generate
npm run dev
# http://localhost:3000
```

## Структура

```
src/
  app/                 # Next.js App Router
    api/               # REST endpoints (search-leads, stats, export, generate-message, ...)
    page.tsx           # главная — фильтры + список лидов + дашборд
    layout.tsx
  components/
    leads/             # 30 доменных компонентов (lead-card, filters-panel, dashboard-view, ...)
    ui/                # 48 shadcn/ui компонентов
  lib/                 # constants, leads (типы + скоринг), db, federal-districts
  store/               # zustand стор
  hooks/
prisma/
  schema.prisma        # Lead, Search, SavedLead, LeadNote
  seed.ts              # детерминированный генератор 180+ лидов
db/
  seed.db              # готовая БД на 3265 лидов (для production-seed)
```

## Функции

- Поиск лидов по 14 нишам, 11 странам СНГ, городу
- Фильтры по проблемам (нет сайта / нет telegram / нет whatsapp / и т.д.)
- Скоринг лидов по правилам ТЗ
- Сохранение в «Мои лиды», теги, заметки
- Экспорт в CSV и XLSX (UTF-8 BOM)
- Дашборд со статистикой (графики по нишам/странам/проблемам)
- История поиска, шаблоны фильтров, сравнение лидов
- AI-генерация сообщения для лида (z-ai-web-dev-sdk)
- Тёмная/светлая тема, мобильный bottom-nav, keyboard shortcuts
