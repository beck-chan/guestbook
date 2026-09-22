-- Docs chatbot retrieval index (paste once into the Supabase SQL Editor).
-- Guestbook only. Do not merge into schema.sql. Do not copy to y2k-guestbook.
-- Sync: scripts/sync-docs.ts upserts chunks with the service_role client.
-- Query: /docs/chat calls match_docs_sections and search_docs_sections.
-- The browser never talks to this table.

-- ---------------------------------------------------------------------------
-- vector
-- ---------------------------------------------------------------------------
-- pgvector's extension name is vector. Supabase keeps it in the extensions schema.
-- Safe to run again.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- docs_section
-- ---------------------------------------------------------------------------
-- One row per indexed docs chunk (page overview or heading).
-- id is the existing chunk id, for example admin#settings.
-- embedding is 768 dimensions to match Gemini gemini-embedding-001
-- (outputDimensionality 768) in sync-docs.ts and /docs/chat.
-- A second paste fails if this table already exists.

create table public.docs_section (
  id text primary key,
  href text not null,
  title text not null,
  heading text not null,
  section text not null default '',
  body text not null,
  public boolean not null,
  content_hash text not null,
  embedding extensions.vector(768) not null,
  -- A = title, B = heading, C = body, so a title match outranks a heading,
  -- and a heading outranks the body. Generated; sync does not write this column.
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', heading), 'B') ||
    setweight(to_tsvector('english', body), 'C')
  ) stored
);

alter table public.docs_section enable row level security;
-- No anon/authenticated policies. Browser never talks to this table.
revoke all on table public.docs_section from anon, authenticated, public;
grant select, insert, update, delete on table public.docs_section to service_role;

-- ---------------------------------------------------------------------------
-- match_docs_sections
-- ---------------------------------------------------------------------------
-- Meaning search. <=> is cosine distance, the same similarity the old
-- Elasticsearch dense_vector index used. only_public is applied before limit
-- so a public build does not fill the top rows with private chunks and then
-- drop them. New functions are executable by public unless revoked.

create or replace function public.match_docs_sections(
  query_embedding extensions.vector(768),
  match_count int,
  only_public boolean
)
returns setof public.docs_section
language sql
stable
as $$
  select *
  from public.docs_section
  where (not only_public or public)
  order by embedding <=> query_embedding
  limit least(match_count, 50);
$$;

revoke all on function public.match_docs_sections(extensions.vector, int, boolean)
  from public, anon, authenticated;
grant execute on function public.match_docs_sections(extensions.vector, int, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- search_docs_sections
-- ---------------------------------------------------------------------------
-- Wording search. query is a to_tsquery('english') expression built in
-- /docs/chat (inflected terms joined with |). Rank uses the title/heading/body
-- weights on search_vector. only_public is applied before limit, same as
-- match_docs_sections. execute is service_role only.

create or replace function public.search_docs_sections(
  query text,
  match_count int,
  only_public boolean
)
returns setof public.docs_section
language plpgsql
stable
as $$
begin
  if query is null or btrim(query) = '' then
    return;
  end if;

  return query
    select *
    from public.docs_section
    where (not only_public or public)
      and search_vector @@ to_tsquery('english', query)
    order by ts_rank_cd(search_vector, to_tsquery('english', query)) desc
    limit least(match_count, 50);
end;
$$;

revoke all on function public.search_docs_sections(text, int, boolean)
  from public, anon, authenticated;
grant execute on function public.search_docs_sections(text, int, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- docs_query_embedding
-- ---------------------------------------------------------------------------
-- Shared cache of question embeddings for /docs/chat. The key is a hash of
-- the question, so the question text is not stored. Safe to run again.
-- A statement trigger keeps the newest 200 rows.

create table if not exists public.docs_query_embedding (
  id text primary key,
  model text not null,
  dims int not null,
  task_type text not null,
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now()
);

alter table public.docs_query_embedding enable row level security;
revoke all on table public.docs_query_embedding from anon, authenticated, public;
grant select, insert, update, delete on table public.docs_query_embedding to service_role;

create or replace function public.trim_docs_query_embedding()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.docs_query_embedding
  where id in (
    select id
    from public.docs_query_embedding
    order by created_at desc
    offset 200
  );
  return null;
end;
$$;

revoke all on function public.trim_docs_query_embedding()
  from public, anon, authenticated;
grant execute on function public.trim_docs_query_embedding() to service_role;

drop trigger if exists docs_query_embedding_trim on public.docs_query_embedding;
create trigger docs_query_embedding_trim
  after insert or update on public.docs_query_embedding
  for each statement
  execute function public.trim_docs_query_embedding();
