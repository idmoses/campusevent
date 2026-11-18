-- CampusConnect schema. Run first in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  student_id text unique,
  faculty text, department text, level text, phone text,
  role text not null default 'student' check (role in ('student','organizer','admin')),
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  venue text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  registration_deadline timestamptz,
  capacity int not null check (capacity > 0),
  organizer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','archived','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  registration_code text not null unique default upper(encode(gen_random_bytes(5), 'hex')),
  status text not null default 'registered' check (status in ('registered','cancelled')),
  registered_at timestamptz not null default now(),
  unique (event_id, student_id)
);

create table public.saved_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, student_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  check_in_time timestamptz not null default now(),
  checked_in_by uuid references public.profiles(id) on delete set null,
  status text not null default 'present' check (status in ('present','absent')),
  unique (event_id, student_id)
);

create table public.event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (event_id, student_id)
);

create index on public.events (status, start_date);
create index on public.events (category_id);
create index on public.registrations (student_id);
create index on public.registrations (event_id, status);
create index on public.registrations (registered_at);
create index on public.saved_events (student_id);
create index on public.attendance (event_id);
create index on public.event_reviews (event_id);
create index on public.profiles (faculty, department);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger events_updated before update on public.events
  for each row execute function public.set_updated_at();

insert into public.categories (name) values
  ('Seminar'),('Workshop'),('Tech Event'),('Sports'),('Club'),
  ('Competition'),('Conference'),('Cultural Event');
