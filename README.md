# AutoCheck — Telegram AI-сервис проверки и покупки автомобилей (MVP)

## Шаг 1–3: Анализ, стек, архитектура

### Итоговый стек (MVP)
- **Backend API**: Node.js + TypeScript + Express (упрощено вместо полного NestJS для скорости MVP,
  но сохранена слоистая архитектура Controller → Service → Domain → Provider → Repository,
  так что миграция на NestJS в будущем не потребует переписывания бизнес-логики).
- **DB**: PostgreSQL + Prisma ORM.
- **Cache/Queue**: Redis + BullMQ (job queue для асинхронной проверки авто).
- **Bot**: Telegraf (Telegram Bot API).
- **Mini App**: заготовка (React + Vite), рендерит поиск/карточки/отчёты — в этой итерации только skeleton.
- **Object storage**: S3-совместимое (MinIO в docker-compose для локальной разработки).
- **Монорепо**: npm workspaces (проще, чем Nx/Turborepo для MVP, но со свободой роста).

### Почему не полноценный NestJS сразу
Для первой итерации важнее рабочий, читаемый код с явными интерфейсами (DI руками через конструкторы),
чем декораторы фреймворка. Замена на NestJS в будущем — механическая, т.к. Service/Domain/Provider слои
уже разделены и не знают друг о друге напрямую (только через интерфейсы).

### Архитектурная диаграмма (текстовая)

```
Telegram Bot ──┐
               ├──> API (Express) ──> Services ──> Domain (Score Engine, Vehicle logic)
Mini App ──────┘                         │              │
                                          │              └──> Providers (VehicleDataProvider,
                                          │                     AutoHistoryProvider, PaymentProvider)
                                          │                          │
                                          │                          └──> [MOCK now] / [Autoteka API later]
                                          │
                                          └──> Repository (Prisma) ──> PostgreSQL
                                          └──> Queue (BullMQ/Redis) ──> Check Job Pipeline
```

### Конвейер проверки (async job, не держим HTTP открытым)

```
CHECK_REQUESTED
   -> PAYMENT_CONFIRMED
   -> DATA_COLLECTION        (providers.getVehicleData / autoHistory.checkByVin)
   -> DATA_NORMALIZATION     (raw -> normalized Vehicle/Report entities, FOUND/NOT_FOUND/UNKNOWN/ERROR)
   -> SCORE_CALCULATION      (score-engine: car/risk/seller/price/deal)
   -> AI_ANALYSIS            (ai package, работает только с нормализованными данными)
   -> REPORT_READY
   -> TELEGRAM_DELIVERY
```

## Структура проекта

```
/apps
  /api      — REST API (Express+TS), Controller→Service→Domain→Provider→Repository
  /bot      — Telegram bot (Telegraf)
  /miniapp  — Telegram Mini App skeleton (React)
/packages
  /types           — общие типы: Vehicle, VehicleReport, DataStatus (FOUND/NOT_FOUND/UNKNOWN/ERROR), и т.д.
  /score-engine     — Car/Risk/Seller/Price/Deal Score, независим от Telegram и API
  /providers        — AutoHistoryProvider интерфейс + AutotekaProvider (заглушка) + MockAutoHistoryProvider
  /payments         — PaymentProvider интерфейс + MockPaymentProvider (+ TODO для Stars/эквайринга)
  /database         — Prisma schema и клиент
/infrastructure     — docker-compose.yml (Postgres, Redis, MinIO)
/docs               — доп. заметки
.env.example
```

## ВАЖНО: то, что НЕ придумано

Ниже — намеренные заглушки, требующие реальных данных поставщика перед продакшеном:

- `AutotekaProvider` (packages/providers/src/autoteka.provider.ts) — методы бросают
  `NotImplementedError('Требуется официальная документация Автотеки')`. URL, авторизация,
  формат запроса/ответа, webhook, цена запроса — НЕ придуманы.
- `PaymentProvider` реализован только как `MockPaymentProvider`. Реальная интеграция
  (Telegram Stars / эквайринг) — TODO, интерфейс уже абстрактен.
- Скрапинг Автотеки/Авито НЕ реализован и не должен быть реализован — только официальный API.

## Как запустить локально (после `npm install`, недоступного в этой песочнице)

```bash
cp .env.example .env
docker compose -f infrastructure/docker-compose.yml up -d   # postgres, redis, minio
npm install
npm run --workspace packages/database prisma:generate
npm run --workspace packages/database prisma:migrate
npm run --workspace apps/api dev
npm run --workspace apps/bot dev
```

Демонстрация Score Engine на 3 тестовых автомобилях (без БД и сети):

```bash
npx ts-node packages/score-engine/src/demo.ts
```

## Что реализовано в этой итерации

1. Архитектура и структура проекта.
2. Prisma schema — нормализованная модель Vehicle + история + Listing + Score + Seller.
3. `.env.example`, `docker-compose.yml`.
4. `packages/types` — DataStatus, Vehicle, VehicleReport, DTO типы.
5. `packages/providers` — интерфейсы `VehicleDataProvider`, `AutoHistoryProvider`,
   `MockAutoHistoryProvider` (3 тестовых VIN), заглушка `AutotekaProvider`.
6. `packages/score-engine` — Car/Risk/Seller/Price/Deal Score с конфигурируемыми весами
   и hard-stop логикой риска, + `demo.ts` со сравнением 3 авто.
7. `packages/payments` — `PaymentProvider` интерфейс + `MockPaymentProvider`, `payment_status=PAID` gate.
8. `apps/api` — Express-роуты по ТЗ (`/api/checks`, `/api/vehicles/:id`, `/api/payments`, ...),
   in-memory очередь-эмуляция конвейера (замена на BullMQ — следующий шаг), контроллеры не содержат
   бизнес-логики (только вызывают сервисы).
9. `apps/bot` — Telegraf skeleton: главное меню, сценарий "Проверить авто" (VIN/госномер/ссылка →
   предпросмотр → оплата (mock) → фоновая проверка → доставка отчёта в чат).
10. README с инструкциями.

## Следующая итерация (предложение)

- Заменить in-memory очередь на реальную BullMQ + Redis worker process.
- Подключить Prisma repository слой вместо in-memory storage в сервисах.
- AI Analysis модуль (packages/ai) — промпт-шаблон, работающий только с нормализованными данными.
- Telegram Mini App: экраны поиска и карточки авто (React + Tailwind).
- Admin panel (users/vehicles/listings/checks/payments/errors) — отдельное SPA + защищённый API.
- Аналитика событий (user_registered, check_started, ...) — event log таблица + дешборд.
