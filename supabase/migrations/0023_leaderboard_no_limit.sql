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
  join public.wins w on w.user_id = p.id
  group by p.id, p.display_name, p.avatar_url
  order by spin_count desc, p.id
  limit p_limit;
$$;

notify pgrst, 'reload schema';
