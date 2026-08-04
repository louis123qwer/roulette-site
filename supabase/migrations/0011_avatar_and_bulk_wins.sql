alter table public.profiles add column if not exists avatar_url text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_signup_tickets int := 1;
  v_avatar text;
begin
  v_role := case when new.email = 'louis123qwer@gmail.com' then 'admin' else 'user' end;
  v_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (id, email, role, ticket_balance, avatar_url)
  values (new.id, new.email, v_role, v_signup_tickets, v_avatar)
  on conflict (id) do nothing;

  insert into public.ticket_transactions (user_id, delta, reason, created_by)
  values (new.id, v_signup_tickets, 'signup_grant', new.id);

  return new;
end;
$$;

create or replace function public.set_avatar_url(p_avatar_url text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_url text;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  v_url := nullif(trim(p_avatar_url), '');
  if v_url is not null and char_length(v_url) > 2000 then
    raise exception 'invalid_avatar_url';
  end if;

  update public.profiles
    set avatar_url = v_url
    where id = v_user_id
    returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.set_avatar_url(text) from public;
grant execute on function public.set_avatar_url(text) to authenticated;

create or replace function public.admin_mark_wins_paid(p_win_ids uuid[])
returns setof public.wins
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
    update public.wins
      set status = 'paid', fulfilled_at = now(), fulfilled_by = auth.uid()
      where id = any(p_win_ids) and status = 'pending'
      returning *;
end;
$$;

revoke all on function public.admin_mark_wins_paid(uuid[]) from public;
grant execute on function public.admin_mark_wins_paid(uuid[]) to authenticated;

create or replace function public.admin_mark_all_pending_paid()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.wins
    set status = 'paid', fulfilled_at = now(), fulfilled_by = auth.uid()
    where status = 'pending';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_mark_all_pending_paid() from public;
grant execute on function public.admin_mark_all_pending_paid() to authenticated;

create or replace function public.admin_delete_wins(p_win_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.wins where id = any(p_win_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_delete_wins(uuid[]) from public;
grant execute on function public.admin_delete_wins(uuid[]) to authenticated;

create or replace function public.admin_delete_paid_wins()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.wins where status = 'paid';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_delete_paid_wins() from public;
grant execute on function public.admin_delete_paid_wins() to authenticated;

notify pgrst, 'reload schema';
