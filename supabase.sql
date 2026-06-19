-- ============================================================
--  «Вечная приватная комната» — схема БД (оптимизирована под вес)
--  Вставь целиком в Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- 1. Профили друзей (1 строка на человека)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  is_host    boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Состояние комнаты — ВСЕГДА одна строка (id = 1), перезаписывается
create table public.room_state (
  id           smallint primary key default 1,
  youtube_id   char(11),
  position_sec integer not null default 0,
  is_playing   boolean not null default false,
  updated_by   uuid references public.profiles(id),
  updated_at   timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.room_state (id) values (1);

-- 3. Сообщения нашего чата
create table public.messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  youtube_id char(11) not null,
  body       text not null,
  ts_sec     integer,   -- таймстамп, если в тексте есть mm:ss (клик = перемотка)
  created_at timestamptz not null default now()
);
create index messages_video_idx on public.messages (youtube_id, created_at);

-- 4. Расшаренные нативные комментарии YouTube
create table public.yt_shares (
  id            bigint generated always as identity primary key,
  youtube_id    char(11) not null,
  yt_comment_id text not null,
  yt_text       text not null,
  yt_author     text,
  shared_by     uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (youtube_id, yt_comment_id)
);

-- 5. Тред-обсуждение под конкретным расшаренным YT-комментом
create table public.yt_share_messages (
  id         bigint generated always as identity primary key,
  share_id   bigint not null references public.yt_shares(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- 6. Эмодзи-реакции на сообщения
create table public.reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  primary key (message_id, user_id, emoji)
);

-- 7. Уведомления (колокольчик)
create table public.notifications (
  id         bigint generated always as identity primary key,
  recipient  uuid not null references public.profiles(id) on delete cascade,
  actor      uuid references public.profiles(id) on delete set null,
  kind       smallint not null,   -- 1 = упоминание (@), 2 = поделились YT-комментом
  youtube_id char(11) not null,
  message_id bigint references public.messages(id) on delete cascade,
  share_id   bigint references public.yt_shares(id) on delete cascade,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index notif_recipient_idx on public.notifications (recipient, is_read);

-- ============================================================
--  Авто-создание профиля при добавлении друга в Auth
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  ROW LEVEL SECURITY — доступ только авторизованным друзьям
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.room_state        enable row level security;
alter table public.messages          enable row level security;
alter table public.yt_shares         enable row level security;
alter table public.yt_share_messages enable row level security;
alter table public.reactions         enable row level security;
alter table public.notifications     enable row level security;

-- профили
create policy "friends read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- состояние комнаты: читают все друзья, МЕНЯЕТ ТОЛЬКО ХОСТ
create policy "friends read room" on public.room_state
  for select using (auth.role() = 'authenticated');
create policy "host controls room" on public.room_state
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_host)
  );

-- сообщения
create policy "friends read messages" on public.messages
  for select using (auth.role() = 'authenticated');
create policy "insert own messages" on public.messages
  for insert with check (auth.uid() = user_id);
create policy "delete own messages" on public.messages
  for delete using (auth.uid() = user_id);

-- расшаренные YT-комменты
create policy "friends read shares" on public.yt_shares
  for select using (auth.role() = 'authenticated');
create policy "insert own shares" on public.yt_shares
  for insert with check (auth.uid() = shared_by);

-- треды под YT-комментами
create policy "friends read share msgs" on public.yt_share_messages
  for select using (auth.role() = 'authenticated');
create policy "insert own share msgs" on public.yt_share_messages
  for insert with check (auth.uid() = user_id);

-- реакции
create policy "friends read reactions" on public.reactions
  for select using (auth.role() = 'authenticated');
create policy "manage own reactions" on public.reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- уведомления: вижу только свои, создавать может любой друг
create policy "read own notifications" on public.notifications
  for select using (auth.uid() = recipient);
create policy "friends create notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');
create policy "update own notifications" on public.notifications
  for update using (auth.uid() = recipient);

-- ============================================================
--  REALTIME — включаем трансляцию изменений
-- ============================================================
alter publication supabase_realtime add table public.room_state;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.yt_share_messages;
