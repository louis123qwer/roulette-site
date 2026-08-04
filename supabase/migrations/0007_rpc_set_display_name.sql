create or replace function public.set_display_name(p_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  v_name := trim(p_display_name);
  if v_name = '' or char_length(v_name) > 20 then
    raise exception 'invalid_display_name';
  end if;

  update public.profiles
    set display_name = v_name
    where id = v_user_id
    returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.set_display_name(text) from public;
grant execute on function public.set_display_name(text) to authenticated;
