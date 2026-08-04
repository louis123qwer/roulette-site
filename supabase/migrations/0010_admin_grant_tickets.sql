create or replace function public.admin_grant_tickets(p_user_id uuid, p_amount int)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_amount = 0 then
    raise exception 'invalid_amount';
  end if;

  update public.profiles
    set ticket_balance = ticket_balance + p_amount
    where id = p_user_id and ticket_balance + p_amount >= 0
    returning * into v_profile;

  if not found then
    raise exception 'invalid_amount_or_user_not_found';
  end if;

  insert into public.ticket_transactions (user_id, delta, reason, created_by)
  values (p_user_id, p_amount, 'admin_adjust', auth.uid());

  return v_profile;
end;
$$;

revoke all on function public.admin_grant_tickets(uuid, int) from public;
grant execute on function public.admin_grant_tickets(uuid, int) to authenticated;

notify pgrst, 'reload schema';
