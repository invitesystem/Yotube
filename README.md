# 🎬 Вечная приватная комната просмотра

Закрытый сайт для совместного просмотра YouTube с друзьями: идеальная синхронизация, чат с @упоминаниями, расшаривание нативных комментариев YouTube, PWA.

---

## ⚠️ СНАЧАЛА ПРОЧТИ ПРО КЛЮЧ

Твой ключ YouTube уже лежит в `.env.local`. Этот файл ИСКЛЮЧЁН из Git (`.gitignore`), поэтому на GitHub он не попадёт. НО ты уже присылал ключ в чат — обязательно зайди в Google Cloud Console и **ограничь ключ** (только YouTube Data API v3) или **пересоздай его**.

---

## 🚀 Быстрый запуск (локально, необязательно)

```bash
npm install
npm run dev
# открой http://localhost:3000
```

Перед этим впиши в `.env.local` свои ключи Supabase (URL + anon).

---

## 🧭 ПОШАГОВАЯ ИНСТРУКЦИЯ (куда кликать)

Делай строго по порядку. ~40–60 минут.

### Шаг 1. GitHub (хранилище кода)
1. Зайди на **github.com -> Sign up**, зарегистрируйся, подтверди почту.
2. Нажми зелёную кнопку **New** (или `+` справа вверху -> **New repository**).
3. Имя: `eternal-watch-room`. Выбери **Private**. Нажми **Create repository**.
4. На странице репозитория нажми **uploading an existing file** и перетащи туда ВСЕ файлы из этой папки (кроме `node_modules` и `.next`, их и нет) -> **Commit changes**.

### Шаг 2. Supabase (база, вход, реалтайм)
1. Зайди на **supabase.com -> Start your project**, войди через GitHub.
2. **New project**: имя `watch-room`, придумай пароль БД (запиши его!), регион — ближайший (Frankfurt). **Create new project** (~2 мин).
3. **Вставить SQL:** слева **SQL Editor** -> **New query** -> вставь весь файл `supabase.sql` -> **Run**. Должно быть «Success».
4. **Проверь Realtime:** **Database -> Replication** — таблицы `room_state`, `messages`, `notifications`, `yt_share_messages` включены (SQL это уже сделал).
5. **Вход:** **Authentication -> Providers -> Email** — включи **Email**. Затем в настройках Auth **ОТКЛЮЧИ** «Allow new users to sign up» — так в комнату попадут только добавленные тобой друзья.
6. **Добавь друзей:** **Authentication -> Users -> Add user -> Create new user**. Введи почту друга, поставь галочку **Auto Confirm User**. Повтори для каждого (и себя).
7. **Ключи:** **Project Settings -> API**. Скопируй:
   - **Project URL** -> это `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** -> это `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Шаг 3. YouTube Data API v3 (у тебя ключ уже есть)
Если нужен новый:
1. **console.cloud.google.com** -> войди гугл-аккаунтом.
2. Вверху **Select a project -> New Project**, имя `watch-room` -> **Create**.
3. **APIs & Services -> Library**, найди **YouTube Data API v3** -> **Enable**.
4. **APIs & Services -> Credentials -> Create Credentials -> API key**. Это `YOUTUBE_API_KEY`.
5. (желательно) **API restrictions -> Restrict key -> YouTube Data API v3 -> Save**.

### Шаг 4. Vercel (запуск сайта)
1. **vercel.com -> Sign up**, войди через GitHub.
2. **Add New -> Project**, найди `eternal-watch-room` -> **Import**.
3. Разверни **Environment Variables** и добавь три (имя -> значение):
   - `NEXT_PUBLIC_SUPABASE_URL` -> твой Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> твой anon ключ
   - `YOUTUBE_API_KEY` -> твой ключ YouTube
4. Нажми **Deploy**. Через ~2 мин получишь ссылку вида `https://eternal-watch-room.vercel.app`.

### Шаг 5. Связать вход с адресом сайта
1. **Supabase -> Authentication -> URL Configuration**.
2. **Site URL**: вставь адрес с Vercel.
3. **Redirect URLs**: добавь тот же адрес. **Save**.

### Шаг 6. Назначь себя хостом
В Supabase -> **SQL Editor** выполни (подставь свой ник — это часть e-mail до `@`):
```sql
update public.profiles set is_host = true where username = 'твой_ник';
```

### Шаг 7. Готово 🎉
Открой ссылку -> введи почту -> перейди по ссылке из письма. На телефоне: меню браузера -> **«Добавить на главный экран»** (PWA).

---

## 🛠️ «Вечность»
- Supabase Free усыпляет проект после 7 дней простоя. Если друзья заходят раз в неделю — не уснёт. Иначе поставь бесплатный пинг на cron-job.org (раз в 3 дня открывать ссылку).
- База хранит только текст и короткие ID — 10 друзей за 10 лет уложатся в десятки МБ из 500 МБ.

## 🎁 Фишки
- Идеальная синхронизация (управляет только хост).
- Чат с @упоминаниями и уведомлениями.
- Расшаривание нативных комментариев YouTube с подсветкой и личным тредом.
- Кликабельные таймстампы, эмодзи-реакции, «кто онлайн».
- Красивый UI: glassmorphism, блум-свечение, размытие по Гауссу, плавные анимации.
