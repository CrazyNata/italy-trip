# Правила репозитория

## Приложение

- Это React-приложение на TypeScript, Vite и Tailwind CSS. Точка входа —
  `index.html` → `src/main.tsx` → `src/app/App.tsx`. Статический legacy-runtime
  переехал; его снимок лежит в `legacy/` и в сборке не участвует.
- Локальная разработка: `npm install`, затем `npm run dev`. Production-сборка —
  `npm run build` (`tsc -b && vite build`), предпросмотр — `npm run preview`.
  Нужен Node.js 22+. Автотестов в репозитории пока нет.
- Vite публикует приложение с базовым путём `/italy-trip/` (см. `vite.config.ts`),
  совпадающим с адресом проекта на GitHub Pages.
- Структура `src/`: `app/` — корень React; `auth/` — вход, роль и меню аккаунта;
  `appearance/` — темы; `components/` — оболочка и общие компоненты; `trip/` —
  загрузка/кэш/синхронизация единственной поездки; `features/` — разделы;
  `lib/supabase/` — клиент Supabase; `styles/` — глобальные стили и дизайн-токены;
  `types/` — общие типы.

## Доступ и данные

- Вышедшие из аккаунта пользователи видят гейт входа; любой зарегистрированный
  пользователь получает доступ на чтение, редактировать может только владелец
  (email в `public.admins`). Роль вычисляется в `src/auth/AuthContext.tsx`
  (`isOwner`), а режим просмотра пробрасывается через `useTripData().isReadOnly` —
  прежних глобалов `window.__tripReadOnly/__isOwner/__authed` больше нет.
- Поездка хранится в строке `public.trip_state` с `id='main'`; логика чтения,
  локального кэша (`localStorage.italy_trip`) и записи — в
  `src/trip/TripDataContext.tsx`. Изменения владельца сохраняются с задержкой,
  Realtime и опрос обновляют план у читателей.
- Токен Mapbox получает `AuthContext` из строки `app_config` (`key='mapbox_token'`)
  после входа, а не из Git. Карта в `src/features/maps/RouteMap.tsx` ждёт токен.
- Секреты в Git и в переменные `VITE_*` добавлять нельзя: `VITE_*` попадают в
  клиентскую сборку.

## Деплой

- Push в `main` запускает `.github/workflows/deploy.yml`: Node 22, `npm ci`,
  `npm run build` и публикация только `dist/` в GitHub Pages.
- Vite добавляет content hash к ресурсам, поэтому прежняя подстановка `__BUILD__`
  и ручной cache-busting `?v=__BUILD__` больше не нужны.

## Процесс работы

- `README.md` является источником истины. Прежний проект Claude Design устарел,
  синхронизировать его не нужно.
- Все изменения сразу коммитятся и отправляются напрямую в `main` («мастер»);
  отдельные feature-ветки не используются.
