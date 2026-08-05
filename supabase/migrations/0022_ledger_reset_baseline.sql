alter table public.settings add column if not exists ledger_reset_at timestamptz;

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
    where created_at > reset.at
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
  where created_at > reset.at
  group by 1
) p on p.day = d.day
left join (
  select day, sum(amount) as adjustment
  from public.ledger_adjustments, reset
  where created_at > reset.at
  group by day
) a on a.day = d.day
order by d.day desc;

notify pgrst, 'reload schema';
