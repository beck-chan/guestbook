create extension if not exists vector with schema extensions;

create table public.docs_section (
id text primary key,          -- existing chunk id, e.g. admin#settings
href text not null,
title text not null,
heading text not null,
section text not null default '',
body text not null,
public boolean not null,
content_hash text not null,
embedding extensions.vector(768) not null,
search_vector tsvector generated always as (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', heading), 'B') ||
    setweight(to_tsvector('english', body), 'C')
) stored
);

-- cosine distance; <=> matches the current Elasticsearch cosine index
create function public.match_docs_sections(
query_embedding extensions.vector(768),
match_count int,
only_public boolean
) returns setof public.docs_section ...
order by embedding <=> query_embedding
limit least(match_count, 50);

create function public.search_docs_sections(
query tsquery,
match_count int,
only_public boolean
) returns setof public.docs_section ...
order by ts_rank_cd(search_vector, query) desc
limit least(match_count, 50);