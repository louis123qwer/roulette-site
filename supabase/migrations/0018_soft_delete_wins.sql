alter table public.wins add column if not exists hidden_at timestamptz;

-- "Delete" now soft-hides rows instead of removing them, so historical
-- ledger payout totals (daily_ledger sums prize_market_price_snapshot from
-- public.wins) stay accurate even after a user or admin clears their list.

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

  update public.wins
    set hidden_at = now()
    where id = any(p_win_ids) and hidden_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

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

  update public.wins
    set hidden_at = now()
    where status = 'paid' and hidden_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.delete_my_paid_wins()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.wins
    set hidden_at = now()
    where user_id = v_user_id and status = 'paid' and hidden_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

notify pgrst, 'reload schema';
