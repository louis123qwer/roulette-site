create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  ticket_price numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "settings_select_admin" on public.settings;
create policy "settings_select_admin" on public.settings
  for select using (public.is_admin());

drop policy if exists "settings_update_admin" on public.settings;
create policy "settings_update_admin" on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

alter table public.prizes add column if not exists market_price numeric not null default 0;
alter table public.wins add column if not exists prize_market_price_snapshot numeric not null default 0;
alter table public.ticket_transactions add column if not exists unit_price_snapshot numeric;

create or replace view public.daily_ledger
with (security_invoker = true) as
select
  d.day,
  coalesce(r.revenue, 0) as revenue,
  coalesce(p.payout, 0) as payout,
  coalesce(r.revenue, 0) - coalesce(p.payout, 0) as net_profit
from (
  select distinct date_trunc('day', created_at)::date as day from public.ticket_transactions
  union
  select distinct date_trunc('day', created_at)::date as day from public.wins
) d
left join (
  select date_trunc('day', created_at)::date as day,
         sum(abs(delta) * coalesce(unit_price_snapshot, 0)) as revenue
  from public.ticket_transactions
  where reason = 'spin_consume'
  group by 1
) r on r.day = d.day
left join (
  select date_trunc('day', created_at)::date as day,
         sum(prize_market_price_snapshot) as payout
  from public.wins
  group by 1
) p on p.day = d.day
order by d.day desc;

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
  v_ticket_price numeric;
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

  select coalesce(ticket_price, 0) into v_ticket_price from public.settings where id = 1;

  v_roll := random() * v_total_weight;

  select id, name, weight, market_price into v_prize
  from (
    select id, name, weight, market_price, sum(weight) over (order by id) as cum_weight
    from public.prizes
    where is_active
  ) t
  where cum_weight >= v_roll
  order by cum_weight asc
  limit 1;

  insert into public.wins (
    user_id, prize_id, prize_name_snapshot, prize_weight_snapshot,
    prize_market_price_snapshot, roll, status
  )
  values (
    v_user_id, v_prize.id, v_prize.name, v_prize.weight,
    v_prize.market_price, v_roll, 'pending'
  )
  returning id into v_win_id;

  insert into public.ticket_transactions (user_id, delta, reason, related_win_id, created_by, unit_price_snapshot)
  values (v_user_id, -1, 'spin_consume', v_win_id, v_user_id, v_ticket_price);

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
  v_ticket_price numeric;
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

  select coalesce(ticket_price, 0) into v_ticket_price from public.settings where id = 1;

  insert into public.ticket_transactions (user_id, delta, reason, created_by, unit_price_snapshot)
  values (v_user_id, -v_paid_draws, 'spin_consume', v_user_id, v_ticket_price);

  for i in 1..v_total_draws loop
    v_roll := random() * v_total_weight;

    select id, name, weight, market_price into v_prize
    from (
      select id, name, weight, market_price, sum(weight) over (order by id) as cum_weight
      from public.prizes
      where is_active
    ) t
    where cum_weight >= v_roll
    order by cum_weight asc
    limit 1;

    insert into public.wins (
      user_id, prize_id, prize_name_snapshot, prize_weight_snapshot,
      prize_market_price_snapshot, roll, status
    )
    values (
      v_user_id, v_prize.id, v_prize.name, v_prize.weight,
      v_prize.market_price, v_roll, 'pending'
    )
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

notify pgrst, 'reload schema';
