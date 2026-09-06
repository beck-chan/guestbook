-- Guestbook shared schema (paste once into the Supabase SQL Editor).
-- Identical copy ships in guestbook and y2k-guestbook; do not run twice.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
as $fn$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$fn$;

-- ---------------------------------------------------------------------------
-- comments + public view (email hidden from anon)
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_created_at_idx on public.comments (created_at desc);

create or replace function public.set_comments_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create trigger comments_set_updated_at
  before update on public.comments
  for each row
  execute function public.set_comments_updated_at();

create view public.comments_public as
  select id, display_name, body, created_at, updated_at
  from public.comments;

alter table public.comments enable row level security;

create policy "anon_insert_comments"
  on public.comments
  for insert
  to anon
  with check (true);

create policy "admin_select_comments"
  on public.comments
  for select
  to authenticated
  using (public.is_admin());

create policy "admin_insert_comments"
  on public.comments
  for insert
  to authenticated
  with check (public.is_admin());

create policy "admin_update_comments"
  on public.comments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_delete_comments"
  on public.comments
  for delete
  to authenticated
  using (public.is_admin());

grant select on public.comments_public to anon, authenticated;
grant insert on public.comments to anon;
grant select, insert, update, delete on public.comments to authenticated;

-- ---------------------------------------------------------------------------
-- admin allowlist + Before User Created hook + promote trigger
-- ---------------------------------------------------------------------------

create table public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_allowlist_email_lowercase check (email = lower(email))
);

alter table public.admin_allowlist enable row level security;
-- No policies: anon/authenticated cannot read or write.
-- service_role bypasses RLS but still needs table grants (auto-expose was off).
grant select, insert, update, delete on table public.admin_allowlist to service_role;

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

  return '{}'::jsonb;
end;
$fn$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;
grant usage on schema public to supabase_auth_admin;
grant select on table public.admin_allowlist to supabase_auth_admin;

create or replace function public.set_admin_role_from_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.email is not null
     and exists (
       select 1 from public.admin_allowlist where email = lower(new.email)
     ) then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb;
  end if;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created_set_admin on auth.users;
create trigger on_auth_user_created_set_admin
  before insert on auth.users
  for each row
  execute function public.set_admin_role_from_allowlist();

-- ---------------------------------------------------------------------------
-- guestbook_settings (singleton id = 1)
-- ---------------------------------------------------------------------------

create table public.guestbook_settings (
  id integer primary key check (id = 1),
  title text not null default '',
  placeholder text not null default '',
  marquee boolean not null default true,
  capture_email boolean not null default true,
  main_font text not null default 'futura-pt',
  main_font_size text not null default 'regular',
  accent_font text not null default 'peony',
  accent_font_size text not null default 'regular',
  page_size integer not null default 10,
  rate_limit_count integer not null default 1,
  rate_limit_minutes integer not null default 5,
  rate_limit_daily integer not null default 2,
  profanity_allow_list text not null default '',
  custom_theme text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.guestbook_settings (
  id,
  title,
  placeholder,
  marquee,
  capture_email,
  main_font,
  main_font_size,
  accent_font,
  accent_font_size,
  page_size,
  rate_limit_count,
  rate_limit_minutes,
  rate_limit_daily,
  profanity_allow_list,
  custom_theme
) values (
  1,
  '',
  E'Sign the guestbook! Yes, just like it''s 2001.\nNo editing, no deleting, just thoughts into the void.\n\n(Please be kind.)',
  true,
  true,
  'futura-pt',
  'regular',
  'peony',
  'regular',
  10,
  1,
  5,
  2,
  '',
  ''
);

alter table public.guestbook_settings enable row level security;

create policy "anon_select_guestbook_settings"
  on public.guestbook_settings
  for select
  to anon, authenticated
  using (true);

create policy "admin_update_guestbook_settings"
  on public.guestbook_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.guestbook_settings to anon, authenticated;
grant update on public.guestbook_settings to authenticated;

-- ---------------------------------------------------------------------------
-- poem_hearts (guestbook poetry desk; y2k does not use this table)
-- ---------------------------------------------------------------------------

create table public.poem_hearts (
  id uuid primary key default gen_random_uuid(),
  poem_id text not null,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  unique (poem_id, visitor_key)
);

create index poem_hearts_poem_id_idx on public.poem_hearts (poem_id);

create view public.poem_heart_counts as
  select poem_id, count(*)::bigint as heart_count
  from public.poem_hearts
  group by poem_id;

create view public.poem_heart_total as
  select count(*)::bigint as total_hearts
  from public.poem_hearts;

alter table public.poem_hearts enable row level security;
-- No direct table policies for anon/authenticated — use RPCs + count views.

grant select on public.poem_heart_counts to anon, authenticated;
grant select on public.poem_heart_total to anon, authenticated;

create or replace function public.toggle_poem_heart(p_poem_id text, p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_liked boolean;
  v_heart_count bigint;
  v_total_hearts bigint;
begin
  if p_poem_id is null or length(trim(p_poem_id)) = 0 then
    raise exception 'poem_id required';
  end if;
  if p_visitor_key is null or length(trim(p_visitor_key)) = 0 then
    raise exception 'visitor_key required';
  end if;

  if exists (
    select 1
    from public.poem_hearts
    where poem_id = p_poem_id
      and visitor_key = p_visitor_key
  ) then
    delete from public.poem_hearts
    where poem_id = p_poem_id
      and visitor_key = p_visitor_key;
    v_liked := false;
  else
    insert into public.poem_hearts (poem_id, visitor_key)
    values (p_poem_id, p_visitor_key);
    v_liked := true;
  end if;

  select count(*) into v_heart_count
  from public.poem_hearts
  where poem_id = p_poem_id;

  select count(*) into v_total_hearts
  from public.poem_hearts;

  return jsonb_build_object(
    'liked', v_liked,
    'heart_count', v_heart_count,
    'total_hearts', v_total_hearts
  );
end;
$fn$;

create or replace function public.poem_heart_state(p_poem_id text, p_visitor_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_liked boolean;
  v_heart_count bigint;
  v_total_hearts bigint;
begin
  if p_poem_id is null or length(trim(p_poem_id)) = 0 then
    raise exception 'poem_id required';
  end if;

  v_liked := p_visitor_key is not null
    and length(trim(p_visitor_key)) > 0
    and exists (
      select 1
      from public.poem_hearts
      where poem_id = p_poem_id
        and visitor_key = p_visitor_key
    );

  select count(*) into v_heart_count
  from public.poem_hearts
  where poem_id = p_poem_id;

  select count(*) into v_total_hearts
  from public.poem_hearts;

  return jsonb_build_object(
    'liked', coalesce(v_liked, false),
    'heart_count', v_heart_count,
    'total_hearts', v_total_hearts
  );
end;
$fn$;

grant execute on function public.toggle_poem_heart(text, text) to anon, authenticated;
grant execute on function public.poem_heart_state(text, text) to anon, authenticated;
