# 🌍 World Explorer

Глобус → страна → город → улица. Раскрашивай места, где реально был.

## Запуск
```bash
npm install
npm run dev
```
Открыть http://localhost:5173

Без Supabase работает **локальный режим** (аккаунты и раскраска хранятся в браузере).

## Подключение Supabase (бесплатно, ~3 минуты)
1. Зайди на https://supabase.com → **New project** (регион любой, пароль БД сохрани себе).
2. **SQL Editor** → вставь содержимое `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: скопируй `Project URL` и `anon public` key.
4. Создай файл `.env` в корне проекта:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. (по желанию) **Authentication → Sign In / Providers → Email** → выключи *Confirm email*, чтобы входить сразу без письма.
6. Перезапусти `npm run dev`.

## Инструменты
| Клавиша | Инструмент |
|---|---|
| V | Двигать глобус |
| B | Кисть — толщина привязана к местности (улица остаётся улицей при любом зуме) |
| L | Область — обведи район/остров, он зальётся |
| C | Страна — клик заливает страну целиком |
| E | Ластик |
| Ctrl/⌘+Z | Отмена |

Карта: OpenFreeMap (OpenStreetMap), поиск: Nominatim — всё бесплатно, без ключей.
