-- Run after schema/functions/policies. Safe to re-run.
-- 1) Seat counts visible to students without exposing other students' registrations.
create or replace view public.event_seats as
  select event_id, count(*) filter (where status = 'registered') as taken
  from public.registrations group by event_id;
grant select on public.event_seats to authenticated;

-- 2) Create profiles for anyone who signed up before the signup trigger existed.
insert into public.profiles (id, full_name, email, student_id, faculty, department, level, phone)
select u.id, coalesce(u.raw_user_meta_data->>'full_name',''), u.email,
       nullif(u.raw_user_meta_data->>'student_id',''), u.raw_user_meta_data->>'faculty',
       u.raw_user_meta_data->>'department', u.raw_user_meta_data->>'level', u.raw_user_meta_data->>'phone'
from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);
