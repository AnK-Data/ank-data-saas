create table if not exists public.vd_query_cache (
  id               uuid default gen_random_uuid() primary key,
  tenant_id        uuid not null,
  cache_key        text not null,
  result           jsonb not null,
  file_modified_at text not null,
  computed_at      timestamptz default now() not null,
  constraint vd_query_cache_uq unique (tenant_id, cache_key)
);

create index if not exists idx_vd_query_cache_lookup
  on public.vd_query_cache (tenant_id, cache_key, file_modified_at);
