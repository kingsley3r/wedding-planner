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

-- Day-of helper link (read only, for whoever has the secret link). Also in day-of.sql.

create or replace function public.day_of(tok text)
returns table (id uuid, kind text, data jsonb)
language sql stable security definer set search_path = public as $$
  select i.id, i.kind,
    jsonb_strip_nulls(case i.kind
      when 'guest' then jsonb_build_object('name', i.data->'name', 'tableId', i.data->'tableId', 'rsvp', i.data->'rsvp')
      when 'settings' then jsonb_build_object('partner1', i.data->'partner1', 'partner2', i.data->'partner2', 'date', i.data->'date')
      when 'vendor' then jsonb_build_object('name', i.data->'name', 'category', i.data->'category', 'contact', i.data->'contact',
                                            'phone', i.data->'phone', 'email', i.data->'email', 'status', i.data->'status')
      when 'contact' then i.data - 'notes'
      else i.data
    end)
  from public.items i
  where length(tok) >= 24
    and exists (select 1 from public.items s where s.kind = 'settings' and s.data->>'helperToken' = tok)
    and (i.kind in ('schedule', 'venue', 'table', 'program', 'settings', 'guest')
         or (i.kind = 'contact' and i.data->>'dayOf' = 'true')
         or (i.kind = 'vendor' and i.data->>'status' = 'booked'));
$$;

revoke all on function public.day_of(text) from public;
grant execute on function public.day_of(text) to anon, authenticated;

-- Replace these with your two email addresses, then run the file.
insert into public.allowed_users (email) values
  ('you@example.com'),
  ('partner@example.com')
on conflict do nothing;
