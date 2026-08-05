-- "Lucky Chance" mechanic: a gauge that fills 1 per real draw, and at 100
-- unlocks a single bonus spin with boosted odds (blank excluded, purple～mythic
-- x10, blue x20). Also introduces admin "test mode" spins that never touch
-- tickets, the ledger, or the leaderboard.

alter table public.prizes add column if not exists is_blank boolean not null default false;
update public.prizes set is_blank = true where name = '꽝' and not is_blank;

alter table public.profiles add column if not exists lucky_gauge int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_lucky_gauge_range'
  ) then
    alter table public.profiles
      add constraint profiles_lucky_gauge_range check (lucky_gauge >= 0 and lucky_gauge <= 100);
  end if;
end $$;

alter table public.wins add column if not exists is_test boolean not null default false;

-- Admin accounts spin for free with fake results (is_test = true) that never
-- touch ticket_balance, ticket_transactions, or the lucky gauge. Everyone
-- else advances their gauge by 1 per draw, capped at 100.
create or replace function public.spin_roulette()
returns table (win_id uuid, prize_id uuid, prize_name text, remaining_tickets int, lucky_gauge int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
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

  v_is_admin := public.is_admin();

  if v_is_admin then
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
  values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending', v_is_admin)
  returning id into v_win_id;

  if v_is_admin then
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

create or replace function public.spin_roulette_bulk()
returns table (win_id uuid, prize_id uuid, prize_name text, draw_index int, remaining_tickets int, lucky_gauge int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
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

  v_is_admin := public.is_admin();

  if v_is_admin then
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

  if not v_is_admin then
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
    values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending', v_is_admin)
    returning id into v_win_id;

    if v_is_admin then
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

  if not v_is_admin then
    update public.profiles set lucky_gauge = v_gauge where id = v_user_id;
  end if;
end;
$$;

-- One-time bonus spin unlocked at gauge = 100: blank prizes are excluded,
-- purple/gold/legendary/mythic weight x10, blue weight x20, everything else
-- (basic, non-blank) keeps its normal weight. Admin accounts can trigger
-- this anytime (test mode) without needing a full gauge.
create or replace function public.spin_roulette_lucky()
returns table (win_id uuid, prize_id uuid, prize_name text, remaining_tickets int, lucky_gauge int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
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

  v_is_admin := public.is_admin();

  if v_is_admin then
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
  values (v_user_id, v_prize.id, v_prize.name, v_prize.weight, v_roll, 'pending', v_is_admin)
  returning id into v_win_id;

  if v_is_admin then
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

revoke all on function public.spin_roulette_lucky() from public;
grant execute on function public.spin_roulette_lucky() to authenticated;

-- Ledger and leaderboard must ignore admin test spins.
drop view if exists public.daily_ledger;

create view public.daily_ledger
with (security_invoker = true) as
with reset as (
  select coalesce(
    (select ledger_reset_at from public.settings where id = 1),
    'epoch'::timestamptz
  ) as at
)
select
  d.day,
  coalesce(r.revenue, 0) as revenue,
  coalesce(p.payout, 0) as payout,
  coalesce(a.adjustment, 0) as adjustment,
  coalesce(r.revenue, 0) - coalesce(p.payout, 0) + coalesce(a.adjustment, 0) as net_profit
from (
  select day from (
    select distinct date_trunc('day', created_at)::date as day
    from public.ticket_transactions, reset
    where created_at > reset.at
    union
    select distinct date_trunc('day', created_at)::date as day
    from public.wins, reset
    where created_at > reset.at and not is_test
    union
    select distinct day
    from public.ledger_adjustments, reset
    where created_at > reset.at
  ) t
) d
left join (
  select date_trunc('day', created_at)::date as day,
         sum(abs(delta) * coalesce(unit_price_snapshot, 0)) as revenue
  from public.ticket_transactions, reset
  where reason = 'spin_consume'
    and created_at > reset.at
  group by 1
) r on r.day = d.day
left join (
  select date_trunc('day', created_at)::date as day,
         sum(prize_market_price_snapshot) as payout
  from public.wins, reset
  where created_at > reset.at and not is_test
  group by 1
) p on p.day = d.day
left join (
  select day, sum(amount) as adjustment
  from public.ledger_adjustments, reset
  where created_at > reset.at
  group by day
) a on a.day = d.day
order by d.day desc;

create or replace function public.get_spin_leaderboard(p_limit int default null)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  spin_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_url, count(w.id) as spin_count
  from public.profiles p
  join public.wins w on w.user_id = p.id and not w.is_test
  group by p.id, p.display_name, p.avatar_url
  order by spin_count desc, p.id
  limit p_limit;
$$;

notify pgrst, 'reload schema';
