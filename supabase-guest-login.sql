-- ГОСТЕВОЙ ВХОД (без почты)
-- Обновляем функцию создания профиля, чтобы гости получали ник из метаданных (Guest123456),
-- а обычные пользователи — из почты. Запусти это один раз в SQL Editor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

-- ПОСЛЕ этого включи в дашборде:
-- Authentication -> Sign In / Providers -> Anonymous Sign-ins -> Enable
