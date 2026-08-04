do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.prizes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%tier%'
  loop
    execute format('alter table public.prizes drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.prizes
  add constraint prizes_tier_check
  check (tier in ('mythic','legendary','gold','purple','blue','basic'));

notify pgrst, 'reload schema';
