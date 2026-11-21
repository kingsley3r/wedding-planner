-- Wedding website and guest photo upload. Run once in Supabase: SQL Editor > New query > paste > Run.

-- 1. Wedding website: anyone with the secret link sees the names, date, site texts, venues,
--    the schedule items you mark "show on website", and the hotels if you choose. Nothing else.
create or replace function public.wedding_site(tok text)
returns table (id uuid, kind text, data jsonb)
language sql stable security definer set search_path = public as $$
  with s as (select data from public.items where kind = 'settings' and data->>'siteToken' = tok and length(tok) >= 24 limit 1)
  select i.id, i.kind,
    jsonb_strip_nulls(case i.kind
      when 'settings' then jsonb_build_object(
        'partner1', i.data->'partner1', 'partner2', i.data->'partner2', 'date', i.data->'date', 'palette', i.data->'palette',
        'siteWelcome', i.data->'siteWelcome', 'siteParking', i.data->'siteParking', 'siteDress', i.data->'siteDress',
        'siteKids', i.data->'siteKids', 'siteGifts', i.data->'siteGifts', 'siteContact', i.data->'siteContact',
        'siteFaq', i.data->'siteFaq', 'photoToken', i.data->'photoToken')
      when 'venue' then jsonb_build_object('name', i.data->'name', 'role', i.data->'role', 'address', i.data->'address',
        'startTime', i.data->'startTime', 'endTime', i.data->'endTime')
      when 'schedule' then jsonb_build_object('time', i.data->'time', 'title', i.data->'title', 'place', i.data->'place')
      when 'stay' then jsonb_build_object('hotel', i.data->'hotel', 'address', i.data->'address', 'phone', i.data->'phone', 'website', i.data->'website')
    end)
  from public.items i, s
  where i.kind in ('settings', 'venue')
     or (i.kind = 'schedule' and i.data->>'public' = 'true')
     or (i.kind = 'stay' and s.data->>'siteStays' = 'true');
$$;
revoke all on function public.wedding_site(text) from public;
grant execute on function public.wedding_site(text) to anon, authenticated;

-- 2. Guest photos: guests with the secret link can upload photos, and see and download the shared ones.
--    Photos you mark "Only us" move to a second, private bucket that only the two of you can open.
--    Files are stored as the originals (full size), up to 50 MB each, the most the free plan allows.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-photos', 'guest-photos', true, 52428800, array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-photos-private', 'guest-photos-private', false, 52428800, array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.photo_token_ok(tok text) returns boolean
language sql stable security definer set search_path = public as $$
  select length(tok) >= 24 and exists (select 1 from public.items where kind = 'settings' and data->>'photoToken' = tok);
$$;
grant execute on function public.photo_token_ok(text) to anon, authenticated;

create or replace function public.guest_photo_info(tok text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('partner1', data->'partner1', 'partner2', data->'partner2', 'date', data->'date')
  from public.items where kind = 'settings' and data->>'photoToken' = tok and length(tok) >= 24 limit 1;
$$;
revoke all on function public.guest_photo_info(text) from public;
grant execute on function public.guest_photo_info(text) to anon, authenticated;

-- The shared photos, for guests with the link (unless you turned sharing off in the app).
create or replace function public.guest_photo_list(tok text)
returns table (name text, created_at timestamptz)
language sql stable security definer set search_path = public, storage as $$
  select o.name, o.created_at
  from storage.objects o, public.items s
  where s.kind = 'settings' and s.data->>'photoToken' = tok and length(tok) >= 24
    and coalesce(s.data->>'photoShareOff', 'false') <> 'true'
    and o.bucket_id = 'guest-photos'
    and (storage.foldername(o.name))[1] in (select jsonb_array_elements_text(coalesce(s.data->'photoFolders', '[]'::jsonb)))
  order by o.created_at desc;
$$;
revoke all on function public.guest_photo_list(text) from public;
grant execute on function public.guest_photo_list(text) to anon, authenticated;

drop policy if exists "guests upload with the link" on storage.objects;
create policy "guests upload with the link" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'guest-photos' and public.photo_token_ok((storage.foldername(name))[1]));

drop policy if exists "couple sees guest photos" on storage.objects;
drop policy if exists "couple deletes guest photos" on storage.objects;
drop policy if exists "couple manages guest photos" on storage.objects;
create policy "couple manages guest photos" on storage.objects for all to authenticated
  using (bucket_id in ('guest-photos', 'guest-photos-private') and public.is_allowed())
  with check (bucket_id in ('guest-photos', 'guest-photos-private') and public.is_allowed());
