alter table public.prizes drop constraint if exists prizes_tier_check;
alter table public.prizes
  add constraint prizes_tier_check
  check (tier in ('mythic','legendary','gold','purple','blue','basic'));

notify pgrst, 'reload schema';
