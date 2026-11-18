-- Run after patch_stage4.sql. Admin tooling: image storage, manual attendance, analytics.
insert into storage.buckets (id, name, public) values ('event-images', 'event-images', true) on conflict do nothing;
drop policy if exists "event images public read" on storage.objects;
drop policy if exists "event images staff write" on storage.objects;
create policy "event images public read" on storage.objects for select using (bucket_id = 'event-images');
create policy "event images staff write" on storage.objects for all to authenticated
  using (bucket_id = 'event-images' and public.is_staff()) with check (bucket_id = 'event-images' and public.is_staff());

create or replace function public.mark_attendance(p_event_id uuid, p_student_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Not authorised'; end if;
  if not exists (select 1 from registrations where event_id = p_event_id and student_id = p_student_id and status = 'registered') then
    raise exception 'Student is not registered for this event'; end if;
  insert into attendance (event_id, student_id, checked_in_by) values (p_event_id, p_student_id, auth.uid())
  on conflict (event_id, student_id) do nothing;
  if not found then raise exception 'Already marked present'; end if;
end $$;
revoke all on function public.mark_attendance(uuid, uuid) from public, anon;
grant execute on function public.mark_attendance(uuid, uuid) to authenticated;

-- Definitions: registrations = non-cancelled, registered_at in range.
-- Eligible = those registrations whose event has already ended. Attendance rate = present / eligible; no-show = 1 - rate.
create or replace function public.analytics_summary(p_from timestamptz, p_to timestamptz)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Not authorised'; end if;
  return (
    with reg as (
      select r.event_id, r.student_id, r.registered_at, e.title, e.category_id, e.end_date
      from registrations r join events e on e.id = r.event_id
      where r.status = 'registered' and r.registered_at between p_from and p_to),
    elig as (select * from reg where end_date < now())
    select json_build_object(
      'events', (select count(*) from events where start_date between p_from and p_to),
      'registrations', (select count(*) from reg),
      'eligible', (select count(*) from elig),
      'attended', (select count(*) from elig x join attendance a on a.event_id = x.event_id and a.student_id = x.student_id and a.status = 'present'),
      'avg_rating', (select round(avg(rating)::numeric, 2) from event_reviews where created_at between p_from and p_to),
      'daily', (select coalesce(json_agg(d order by d.day), '[]'::json) from (select registered_at::date as day, count(*) as n from reg group by 1) d),
      'categories', (select coalesce(json_agg(c), '[]'::json) from (select coalesce(ct.name, 'Uncategorised') as name, count(*) as n from reg left join categories ct on ct.id = reg.category_id group by 1 order by 2 desc) c),
      'top_events', (select coalesce(json_agg(t), '[]'::json) from (
        select reg.title, count(*) as regs, count(a.id) as attended,
          (select round(avg(v.rating)::numeric, 2) from event_reviews v where v.event_id = reg.event_id) as rating
        from reg left join attendance a on a.event_id = reg.event_id and a.student_id = reg.student_id and a.status = 'present'
        group by reg.event_id, reg.title order by regs desc limit 5) t),
      'faculties', (select coalesce(json_agg(f), '[]'::json) from (select coalesce(p.faculty, 'Unknown') as name, count(*) as n from reg join profiles p on p.id = reg.student_id group by 1 order by 2 desc limit 8) f),
      'departments', (select coalesce(json_agg(f), '[]'::json) from (select coalesce(p.department, 'Unknown') as name, count(*) as n from reg join profiles p on p.id = reg.student_id group by 1 order by 2 desc limit 8) f),
      'top_students', (select coalesce(json_agg(s), '[]'::json) from (select p.full_name as name, count(*) as n from reg join profiles p on p.id = reg.student_id group by p.id, p.full_name order by 2 desc limit 5) s),
      'ratings', (select coalesce(json_agg(x), '[]'::json) from (select rating, count(*) as n from event_reviews where created_at between p_from and p_to group by rating order by rating) x)
    )
  );
end $$;
revoke all on function public.analytics_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.analytics_summary(timestamptz, timestamptz) to authenticated;
