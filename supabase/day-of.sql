-- Day-of helper link: lets anyone with the secret link read the schedule, church program,
-- day-of contacts, booked vendors, venues and the seating list. Nothing else, and read only.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

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
