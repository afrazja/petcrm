-- Service presets table for customizable services with default prices
create table public.service_presets (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  default_price numeric(10,2) default 0 not null,
  sort_order int default 0 not null,
  created_at timestamptz default now() not null
);

-- Index for fast lookups by groomer
create index idx_service_presets_profile on public.service_presets(profile_id);

-- RLS
alter table public.service_presets enable row level security;

create policy "Users can manage their own service presets"
  on public.service_presets for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
