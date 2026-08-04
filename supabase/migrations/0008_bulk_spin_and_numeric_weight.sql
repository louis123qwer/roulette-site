alter table public.prizes alter column weight type numeric using weight::numeric;
alter table public.wins alter column prize_weight_snapshot type numeric using prize_weight_snapshot::numeric;

create or replace function public.spin_roulette()
returns table (win_id uuid, prize_id uuid, prize_name text, remaining_tickets int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_balance int;
  v_total_weight numeric;
  v_roll numeric;
  v_prize record;
  v_win_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
    set ticket_balance = ticket_balance - 1
    where id = v_user_id and ticket_balance > 0
    returning ticket_balance into v_new_balance;

  if not found then
    raise exception 'insufficient_tickets';
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

  insert into public.wins (user_id, prize_id, prize_name_snapshot, prize_weight_snapshot, roll, status)
  values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending')
  returning id into v_win_id;

  insert into public.ticket_transactions (user_id, delta, reason, related_win_id, created_by)
  values (v_user_id, -1, 'spin_consume', v_win_id, v_user_id);

  return query select v_win_id, v_prize.id, v_prize.name, v_new_balance;
end;
$$;

create or replace function public.spin_roulette_bulk()
returns table (win_id uuid, prize_id uuid, prize_name text, draw_index int, remaining_tickets int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_balance int;
  v_total_weight numeric;
  v_roll numeric;
  v_prize record;
  v_win_id uuid;
  v_paid_draws constant int := 10;
  v_total_draws constant int := 11;
  i int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
    set ticket_balance = ticket_balance - v_paid_draws
    where id = v_user_id and ticket_balance >= v_paid_draws
    returning ticket_balance into v_new_balance;

  if not found then
    raise exception 'insufficient_tickets';
  end if;

  select sum(weight) into v_total_weight from public.prizes where is_active;
  if v_total_weight is null or v_total_weight <= 0 then
    raise exception 'no_active_prizes';
  end if;

  insert into public.ticket_transactions (user_id, delta, reason, created_by)
  values (v_user_id, -v_paid_draws, 'spin_consume', v_user_id);

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

    insert into public.wins (user_id, prize_id, prize_name_snapshot, prize_weight_snapshot, roll, status)
    values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending')
    returning id into v_win_id;

    win_id := v_win_id;
    prize_id := v_prize.id;
    prize_name := v_prize.name;
    draw_index := i;
    remaining_tickets := v_new_balance;
    return next;
  end loop;
end;
$$;

revoke all on function public.spin_roulette_bulk() from public;
grant execute on function public.spin_roulette_bulk() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_signup_tickets int := 1;
begin
  v_role := case when new.email = 'louis123qwer@gmail.com' then 'admin' else 'user' end;

  insert into public.profiles (id, email, role, ticket_balance)
  values (new.id, new.email, v_role, v_signup_tickets)
  on conflict (id) do nothing;

  insert into public.ticket_transactions (user_id, delta, reason, created_by)
  values (new.id, v_signup_tickets, 'signup_grant', new.id);

  return new;
end;
$$;

notify pgrst, 'reload schema';
