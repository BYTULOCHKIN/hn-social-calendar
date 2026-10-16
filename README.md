# Календар публікацій

React-застосунок для щоденного обліку публікацій у місцевих групах, керування сталим реєстром груп і перегляду аналітики. Інтерфейс українською, дані розраховані на період 2026–2035 років.

## Можливості

- одна група в рядку, дні місяця у стовпцях;
- до двох тематик у клітинці, кожна рахується як окрема публікація;
- максимум 20 активних груп у підрозділі;
- редагування й деактивація груп без втрати історії;
- історичний знімок відповідального у кожній публікації;
- аналітика за темами, відповідальними, підрозділами й місяцями;
- публічний доступ за посиланням без реєстрації та авторизації;
- RLS, аудит і атомарне збереження через Supabase;
- локальний demo-режим для перегляду без налаштованої бази.

## Локальний запуск

Потрібні Node.js 22.12+ і npm 10.9+.

```bash
cp .env.local.example .env.local
npm ci
npm run dev:vite
```

За замовчуванням `VITE_DATA_MODE=demo`: зміни зберігаються в `localStorage`, а кнопку «Відновити демо» можна використати для повернення початкових даних.

## Supabase

1. Застосуйте міграції з каталогу [`supabase/migrations`](supabase/migrations) до проєкту Supabase.
2. За потреби застосуйте [`supabase/seed.sql`](supabase/seed.sql) лише в тестовому середовищі.
3. Розгорніть Edge Function з `supabase/functions/calendar`.
4. У `.env.local` встановіть `VITE_DATA_MODE=supabase`, URL, publishable key і UUID стартового підрозділу.

Для Vercel потрібні саме клієнтські змінні `VITE_SUPABASE_URL` і `VITE_SUPABASE_PUBLISHABLE_KEY`. Значення без префікса `VITE_` недоступні frontend-коду Vite. Після зміни змінних середовища запустіть новий deployment.

Авторизація користувача не потрібна: кожен, хто має посилання на застосунок, може переглядати й змінювати календар. Edge Function використовує `@supabase/server` з режимом `auth: 'publishable'`, а публічні операції явно дозволені RLS-політиками для ролі `anon`.

`SUPABASE_SECRET_KEY` є виключно серверною змінною. Не додавайте префікс `VITE_` і не комітьте реальне значення.

## Синхронізація довідників

Структура компанії синхронізується захищеною Edge Function `directory-sync`. URL і ключ зовнішнього API зберігаються лише в Supabase Secrets:

```bash
npx supabase secrets set \
  COMPANY_STRUCTURE_API_URL=https://ipa.apc-service.net/api/service/invoke/powbi \
  COMPANY_STRUCTURE_API_KEY=<rotated-proxy-access-key>
npx supabase functions deploy directory-sync
```

Виклик синхронізації потребує серверного `SUPABASE_SECRET_KEY` у заголовку `apikey`. Функція завантажує актуальні управління, підрозділи, кущі та населені пункти, оновлює перейменовані записи й позначає відсутні як неактивні без фізичного видалення.

Кадровий JSON не комітиться в репозиторій. Для імпорту передайте шлях до локального файлу:

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SECRET_KEY=<server-secret-key> \
npm run sync:employees -- /absolute/path/GetCompanyPersonnal.json
```

Імпортер передає лише табельний ID, ПІБ і дату завершення роботи. Телефони, email, ІПН, посади та інші поля джерела не завантажуються.

## Перевірки

```bash
npm run test
npm run tsc
npm run lint
npm run build
```
