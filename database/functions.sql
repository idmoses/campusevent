-- Run second. Helpers, role protection, signup trigger, and RPCs.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','organizer') and is_active);
$$;

-- New auth users always become students; role is never read from client metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, student_id, faculty, department, level, phone, role)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''), new.email,
    nullif(new.raw_user_meta_data->>'student_id', ''),
    new.raw_user_meta_data->>'faculty', new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'level', new.raw_user_meta_data->>'phone', 'student');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block role / active-flag changes by non-admins (SQL editor, where auth.uid() is null, is allowed).
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Not allowed to change role or status';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- Capacity-safe registration: row lock on the event serialises concurrent sign-ups.
create or replace function public.register_for_event(p_event_id uuid)
returns public.registrations language plpgsql security definer set search_path = public as $$
declare ev events; cnt int; reg registrations;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and is_active) then
    raise exception 'Account is deactivated'; end if;
  select * into ev from events where id = p_event_id for update;
  if not found or ev.status <> 'published' then raise exception 'Event is not available'; end if;
  if now() > coalesce(ev.registration_deadline, ev.start_date) then
    raise exception 'Registration is closed'; end if;
  select count(*) into cnt from registrations where event_id = p_event_id and status = 'registered';
  if cnt >= ev.capacity then raise exception 'Event is full'; end if;
  insert into registrations (event_id, student_id) values (p_event_id, auth.uid())
  on conflict (event_id, student_id) do update set status = 'registered', registered_at = now()
    where registrations.status = 'cancelled'
  returning * into reg;
  if reg.id is null then raise exception 'You are already registered'; end if;
  return reg;
end $$;

create or replace function public.cancel_registration(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update registrations r set status = 'cancelled'
  from events e
  where r.event_id = e.id and e.id = p_event_id and r.student_id = auth.uid()
    and r.status = 'registered' and e.start_date > now();
  if not found then raise exception 'Registration cannot be cancelled'; end if;
end $$;

-- Staff-only check-in by registration code; duplicates are rejected.
create or replace function public.check_in(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare reg registrations; who text;
begin
  if not is_staff() then raise exception 'Not authorised'; end if;
  select * into reg from registrations where registration_code = upper(trim(p_code)) and status = 'registered';
  if not found then raise exception 'Invalid or cancelled registration code'; end if;
  insert into attendance (event_id, student_id, checked_in_by)
  values (reg.event_id, reg.student_id, auth.uid())
  on conflict (event_id, student_id) do nothing;
  if not found then raise exception 'Already checked in'; end if;
  select full_name into who from profiles where id = reg.student_id;
  return json_build_object('student', who, 'event_id', reg.event_id);
end $$;

revoke all on function public.register_for_event(uuid), public.cancel_registration(uuid), public.check_in(text) from public, anon;
grant execute on function public.register_for_event(uuid), public.cancel_registration(uuid), public.check_in(text) to authenticated;
