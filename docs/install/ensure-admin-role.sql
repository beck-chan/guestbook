-- Run once in the Supabase SQL Editor (shared project for guestbook + y2k).
-- Fixes allowlisted admins who can sign in but lack app_metadata.role (sent to /?admin_error=1).

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  user_email text;
begin
  user_email := lower(event->'user'->>'email');

  if user_email is null
     or user_email = ''
     or not exists (
       select 1 from public.admin_allowlist where email = user_email
     ) then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'message', 'Not authorized',
        'http_code', 403
      )
    );
  end if;

  return jsonb_build_object(
    'user',
    jsonb_build_object(
      'app_metadata',
      jsonb_build_object('role', 'admin')
    )
  );
end;
$fn$;

create or replace function public.ensure_admin_role()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  uid uuid := auth.uid();
  user_email text;
begin
  if uid is null then
    return false;
  end if;

  select lower(email) into user_email from auth.users where id = uid;

  if user_email is null
     or not exists (
       select 1 from public.admin_allowlist where email = user_email
     ) then
    return false;
  end if;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = uid
    and coalesce(raw_app_meta_data->>'role', '') is distinct from 'admin';

  return true;
end;
$fn$;

revoke all on function public.ensure_admin_role() from public, anon;
grant execute on function public.ensure_admin_role() to authenticated;

-- One-shot: stamp role on every allowlisted user who already exists.
update auth.users u
set raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
from public.admin_allowlist a
where lower(u.email) = a.email
  and coalesce(u.raw_app_meta_data->>'role', '') is distinct from 'admin';
