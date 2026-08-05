-- Admin "test mode" becomes an explicit, client-controlled toggle instead of
-- being always-on for admin accounts, so an admin can also spin "for real"
-- (real tickets, real records) to test the genuine end-user flow. The old
-- zero-arg overloads are dropped so only the new p_test_mode signature exists.

drop function if exists public.spin_roulette();

create or replace function public.spin_roulette(p_test_mode boolean default true)
returns table (win_id uuid, prize_id uuid, prize_name text, remaining_tickets int, lucky_gauge int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_use_test boolean;
  v_new_balance int;
  v_total_weight numeric;
  v_roll numeric;
  v_prize record;
  v_win_id uuid;
  v_gauge int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  v_use_test := public.is_admin() and coalesce(p_test_mode, true);

  if v_use_test then
    select ticket_balance into v_new_balance from public.profiles where id = v_user_id;
  else
    update public.profiles
      set ticket_balance = ticket_balance - 1
      where id = v_user_id and ticket_balance > 0
      returning ticket_balance into v_new_balance;

    if not found then
      raise exception 'insufficient_tickets';
    end if;
  end if;

  select sum(weight) into v_total_weight from public.prizes where is_active;
  if v_total_weight is null or v_total_weight <= 0 then
    raise exception 'no_active_prizes';
  end if;

  v_roll := random() * v_total_weight;

  select id, name, weight into v_prize
  from (
    select id, name, weight, sum(weight) over (order by id) as cum_weight
    from public.prizes
    where is_active
  ) t
  where cum_weight >= v_roll
  order by cum_weight asc
  limit 1;

  insert into public.wins (user_id, prize_id, prize_name_snapshot, prize_weight_snapshot, roll, status, is_test)
  values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending', v_use_test)
  returning id into v_win_id;

  if v_use_test then
    v_gauge := 0;
  else
    update public.profiles
      set lucky_gauge = least(lucky_gauge + 1, 100)
      where id = v_user_id
      returning lucky_gauge into v_gauge;

    insert into public.ticket_transactions (user_id, delta, reason, related_win_id, created_by)
    values (v_user_id, -1, 'spin_consume', v_win_id, v_user_id);
  end if;

  return query select v_win_id, v_prize.id, v_prize.name, v_new_balance, v_gauge;
end;
$$;

revoke all on function public.spin_roulette(boolean) from public;
grant execute on function public.spin_roulette(boolean) to authenticated;

drop function if exists public.spin_roulette_bulk();

create or replace function public.spin_roulette_bulk(p_test_mode boolean default true)
returns table (win_id uuid, prize_id uuid, prize_name text, draw_index int, remaining_tickets int, lucky_gauge int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_use_test boolean;
  v_new_balance int;
  v_total_weight numeric;
  v_roll numeric;
  v_prize record;
  v_win_id uuid;
  v_gauge int;
  v_paid_draws constant int := 10;
  v_total_draws constant int := 11;
  i int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  v_use_test := public.is_admin() and coalesce(p_test_mode, true);

  if v_use_test then
    select ticket_balance into v_new_balance from public.profiles where id = v_user_id;
  else
    update public.profiles
      set ticket_balance = ticket_balance - v_paid_draws
      where id = v_user_id and ticket_balance >= v_paid_draws
      returning ticket_balance into v_new_balance;

    if not found then
      raise exception 'insufficient_tickets';
    end if;
  end if;

  select sum(weight) into v_total_weight from public.prizes where is_active;
  if v_total_weight is null or v_total_weight <= 0 then
    raise exception 'no_active_prizes';
  end if;

  if not v_use_test then
    insert into public.ticket_transactions (user_id, delta, reason, created_by)
    values (v_user_id, -v_paid_draws, 'spin_consume', v_user_id);
  end if;

  select lucky_gauge into v_gauge from public.profiles where id = v_user_id;

  for i in 1..v_total_draws loop
    v_roll := random() * v_total_weight;

    select id, name, weight into v_prize
    from (
      select id, name, weight, sum(weight) over (order by id) as cum_weight
      from public.prizes
      where is_active
    ) t
    where cum_weight >= v_roll
    order by cum_weight asc
    limit 1;

    insert into public.wins (user_id, prize_id, prize_name_snapshot, prize_weight_snapshot, roll, status, is_test)
    values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending', v_use_test)
    returning id into v_win_id;

    if v_use_test then
      v_gauge := 0;
    else
      v_gauge := least(coalesce(v_gauge, 0) + 1, 100);
    end if;

    win_id := v_win_id;
    prize_id := v_prize.id;
    prize_name := v_prize.name;
    draw_index := i;
    remaining_tickets := v_new_balance;
    lucky_gauge := v_gauge;
    return next;
  end loop;

  if not v_use_test then
    update public.profiles set lucky_gauge = v_gauge where id = v_user_id;
  end if;
end;
$$;

revoke all on function public.spin_roulette_bulk(boolean) from public;
grant execute on function public.spin_roulette_bulk(boolean) to authenticated;

drop function if exists public.spin_roulette_lucky();

create or replace function public.spin_roulette_lucky(p_test_mode boolean default true)
returns table (win_id uuid, prize_id uuid, prize_name text, remaining_tickets int, lucky_gauge int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_use_test boolean;
  v_new_balance int;
  v_gauge int;
  v_total_weight numeric;
  v_roll numeric;
  v_prize record;
  v_win_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  v_use_test := public.is_admin() and coalesce(p_test_mode, true);

  if v_use_test then
    select ticket_balance into v_new_balance from public.profiles where id = v_user_id;
  else
    select lucky_gauge into v_gauge from public.profiles where id = v_user_id;
    if v_gauge is null or v_gauge < 100 then
      raise exception 'lucky_gauge_not_ready';
    end if;

    update public.profiles
      set ticket_balance = ticket_balance - 1
      where id = v_user_id and ticket_balance > 0
      returning ticket_balance into v_new_balance;

    if not found then
      raise exception 'insufficient_tickets';
    end if;
  end if;

  select sum(
    case
      when tier in ('purple', 'gold', 'legendary', 'mythic') then weight * 10
      when tier = 'blue' then weight * 20
      else weight
    end
  )
  into v_total_weight
  from public.prizes
  where is_active and not is_blank;

  if v_total_weight is null or v_total_weight <= 0 then
    raise exception 'no_active_prizes';
  end if;

  v_roll := random() * v_total_weight;

  select id, name, weight into v_prize
  from (
    select id, name, weight,
      sum(
        case
          when tier in ('purple', 'gold', 'legendary', 'mythic') then weight * 10
          when tier = 'blue' then weight * 20
          else weight
        end
      ) over (order by id) as cum_weight
    from public.prizes
    where is_active and not is_blank
  ) t
  where cum_weight >= v_roll
  order by cum_weight asc
  limit 1;

  insert into public.wins (user_id, prize_id, prize_name_snapshot, prize_weight_snapshot, roll, status, is_test)
  values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending', v_use_test)
  returning id into v_win_id;

  if v_use_test then
    v_gauge := 0;
  else
    update public.profiles set lucky_gauge = 0 where id = v_user_id;
    v_gauge := 0;

    insert into public.ticket_transactions (user_id, delta, reason, related_win_id, created_by)
    values (v_user_id, -1, 'spin_consume', v_win_id, v_user_id);
  end if;

  return query select v_win_id, v_prize.id, v_prize.name, v_new_balance, v_gauge;
end;
$$;

revoke all on function public.spin_roulette_lucky(boolean) from public;
grant execute on function public.spin_roulette_lucky(boolean) to authenticated;

notify pgrst, 'reload schema';
