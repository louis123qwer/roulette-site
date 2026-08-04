create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_signup_tickets int := 3;
begin
  v_role := case when new.email = 'louis123qwer@gmail.com' then 'admin' else 'user' end;

  insert into public.profiles (id, email, role, ticket_balance)
  values (new.id, new.email, v_role, v_signup_tickets);

  insert into public.ticket_transactions (user_id, delta, reason, created_by)
  values (new.id, v_signup_tickets, 'signup_grant', new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
