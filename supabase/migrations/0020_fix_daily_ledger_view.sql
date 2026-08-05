drop view if exists public.daily_ledger;

create view public.daily_ledger
with (security_invoker = true) as
select
  d.day,
  coalesce(r.revenue, 0) as revenue,
  coalesce(p.payout, 0) as payout,
  coalesce(a.adjustment, 0) as adjustment,
  coalesce(r.revenue, 0) - coalesce(p.payout, 0) + coalesce(a.adjustment, 0) as net_profit
from (
  select day from (
    select distinct date_trunc('day', created_at)::date as day from public.ticket_transactions
    union
    select distinct date_trunc('day', created_at)::date as day from public.wins
    union
    select distinct day from public.ledger_adjustments
  ) t
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
left join (
  select day, sum(amount) as adjustment
  from public.ledger_adjustments
  group by day
) a on a.day = d.day
order by d.day desc;

notify pgrst, 'reload schema';
