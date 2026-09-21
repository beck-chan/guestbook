-- Docs chatbot history and chat IP quotas (paste once into the Supabase SQL Editor).
-- Guestbook only. Do not merge into schema.sql. Do not copy to y2k-guestbook.
-- History: /docs/chat uses the service_role client + cookie docs_chat_id.
-- Quotas: /docs/chat uses DATABASE_URL (pg pooler) against docs_chat_limits.
-- Same-browser resume / debug / abuse traces. Not login. Not cross-device.

-- ---------------------------------------------------------------------------
-- docs_chat_session
-- ---------------------------------------------------------------------------

create table public.docs_chat_session (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_docs_chat_session_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create trigger docs_chat_session_set_updated_at
  before update on public.docs_chat_session
  for each row
  execute function public.set_docs_chat_session_updated_at();

alter table public.docs_chat_session enable row level security;
-- No anon/authenticated policies. Browser never talks to these tables.
revoke all on table public.docs_chat_session from anon, authenticated, public;
grant select, insert, update, delete on table public.docs_chat_session to service_role;

-- ---------------------------------------------------------------------------
-- docs_chat_message
-- ---------------------------------------------------------------------------

create table public.docs_chat_message (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.docs_chat_session (id) on delete cascade,
  role text not null,
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now(),
  constraint docs_chat_message_role_check check (role in ('user', 'assistant'))
);

create index docs_chat_message_session_id_created_at_idx
  on public.docs_chat_message (session_id, created_at);

alter table public.docs_chat_message enable row level security;
revoke all on table public.docs_chat_message from anon, authenticated, public;
grant select, insert, update, delete on table public.docs_chat_message to service_role;

-- Optional retention (no cron in v1). Run by hand if the table grows:
-- delete from public.docs_chat_message where created_at < now() - interval '90 days';
-- delete from public.docs_chat_session s
--   where not exists (
--     select 1 from public.docs_chat_message m where m.session_id = s.id
--   );

-- ---------------------------------------------------------------------------
-- docs_chat_limits
-- ---------------------------------------------------------------------------
-- Chat IP quotas (5/hour, 10/day). Same shape as guestbook_rate_limits so
-- rate-limiter-flexible can use it. Next.js writes this through DATABASE_URL
-- (pg pooler), not the service_role client. Comment quotas stay on
-- guestbook_rate_limits.

create table public.docs_chat_limits (
  key varchar(255) primary key,
  points integer not null default 0,
  expire bigint
);

alter table public.docs_chat_limits enable row level security;
revoke all on table public.docs_chat_limits from anon, authenticated, public;
grant select, insert, update, delete on table public.docs_chat_limits to postgres, service_role;

-- Optional: drop leftover chat buckets from the comment table after this exists.
-- delete from public.guestbook_rate_limits
-- where key like 'docs_chat_%';
