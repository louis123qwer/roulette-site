create or replace function public.delete_my_paid_wins()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.wins where user_id = v_user_id and status = 'paid';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.delete_my_paid_wins() from public;
grant execute on function public.delete_my_paid_wins() to authenticated;

notify pgrst, 'reload schema';
