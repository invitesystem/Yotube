-- ЧИНИМ ТИП youtube_id
-- char(11) — фиксированная длина, дополняет значения пробелами и может ломать сравнения.
-- Переводим на text во всех таблицах. Запусти это один раз в SQL Editor.

alter table public.room_state    alter column youtube_id type text using trim(youtube_id);
alter table public.messages      alter column youtube_id type text using trim(youtube_id);
alter table public.yt_shares     alter column youtube_id type text using trim(youtube_id);
alter table public.notifications alter column youtube_id type text using trim(youtube_id);

-- Сбрасываем возможное битое значение в комнате (потом просто выбери видео заново):
update public.room_state set youtube_id = null where id = 1;
