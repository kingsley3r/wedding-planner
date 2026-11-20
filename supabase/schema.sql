-- Wedding planner: one table holds every record (guests, budget lines, vendors, tables, ...).
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.items (
  id uuid primary key,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists items_kind_idx on public.items (kind);

-- Only the people listed here can read or change anything.
create table if not exists public.allowed_users (
  email text primary key
);

alter table public.items enable row level security;
alter table public.allowed_users enable row level security;

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

drop policy if exists "couple can do everything" on public.items;
create policy "couple can do everything" on public.items
  for all to authenticated using (public.is_allowed()) with check (public.is_allowed());

-- Live sync between both phones.
do $$ begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null; end $$;

-- Replace these with your two email addresses, then run the file.
insert into public.allowed_users (email) values
  ('you@example.com'),
  ('partner@example.com')
on conflict do nothing;
