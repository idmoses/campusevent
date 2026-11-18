-- Run third. Students write registrations/attendance only through RPCs.
alter table profiles enable row level security;
alter table categories enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table saved_events enable row level security;
alter table attendance enable row level security;
alter table event_reviews enable row level security;

create policy "profiles read own or staff" on profiles for select to authenticated
  using (id = auth.uid() or is_staff());
create policy "profiles update own" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin update" on profiles for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "categories read" on categories for select to authenticated using (true);
create policy "categories admin write" on categories for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "events read published or staff" on events for select to authenticated
  using (status = 'published' or is_staff());
create policy "events staff write" on events for all to authenticated
  using (is_staff()) with check (is_staff());

create policy "registrations read own or staff" on registrations for select to authenticated
  using (student_id = auth.uid() or is_staff());
create policy "registrations admin cancel" on registrations for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "saved own" on saved_events for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "attendance read own or staff" on attendance for select to authenticated
  using (student_id = auth.uid() or is_staff());
create policy "attendance staff update" on attendance for update to authenticated
  using (is_staff()) with check (is_staff());

create policy "reviews read" on event_reviews for select to authenticated using (true);
create policy "reviews insert if attended" on event_reviews for insert to authenticated
  with check (student_id = auth.uid() and exists (
    select 1 from attendance a where a.event_id = event_reviews.event_id
      and a.student_id = auth.uid() and a.status = 'present'));
create policy "reviews update own" on event_reviews for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
