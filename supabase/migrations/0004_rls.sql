create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.prizes enable row level security;
alter table public.wins enable row level security;
alter table public.ticket_transactions enable row level security;

create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "prizes_select_active" on public.prizes
  for select using (is_active = true or public.is_admin());

create policy "prizes_admin_write" on public.prizes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "wins_select" on public.wins
  for select using (user_id = auth.uid() or public.is_admin());

create policy "ticket_transactions_select" on public.ticket_transactions
  for select using (user_id = auth.uid() or public.is_admin());
