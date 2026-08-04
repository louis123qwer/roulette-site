alter table public.prizes
  add column if not exists tier text not null default 'basic'
  check (tier in ('legendary','gold','purple','blue','basic'));

notify pgrst, 'reload schema';
