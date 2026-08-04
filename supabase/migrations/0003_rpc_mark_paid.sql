create or replace function public.mark_win_paid(p_win_id uuid)
returns public.wins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_win public.wins;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.wins
    set status = 'paid', fulfilled_at = now(), fulfilled_by = auth.uid()
    where id = p_win_id and status = 'pending'
    returning * into v_win;

  if not found then
    raise exception 'win_not_found_or_already_paid';
  end if;

  return v_win;
end;
$$;

revoke all on function public.mark_win_paid(uuid) from public;
grant execute on function public.mark_win_paid(uuid) to authenticated;
