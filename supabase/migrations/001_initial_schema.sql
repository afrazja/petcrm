-- ============================================
-- PetCRM Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. TABLES
-- -----------------------------------------

-- Profiles: one per groomer, linked 1:1 to auth.users
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  business_name text,
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Clients: pet owners belonging to a groomer
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Pets: belong to a client
create table public.pets (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  breed text,
  vaccine_expiry_date date,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. INDEXES
-- -----------------------------------------
create index idx_clients_profile_id on public.clients(profile_id);
create index idx_pets_client_id on public.pets(client_id);

-- 3. ROW LEVEL SECURITY
-- -----------------------------------------

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.pets enable row level security;

-- Profiles: users can only access their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Clients: users can CRUD only their own clients
create policy "Users can view their own clients"
  on public.clients for select
  using (profile_id = auth.uid());

create policy "Users can insert their own clients"
  on public.clients for insert
  with check (profile_id = auth.uid());

create policy "Users can update their own clients"
  on public.clients for update
  using (profile_id = auth.uid());

create policy "Users can delete their own clients"
  on public.clients for delete
  using (profile_id = auth.uid());

-- Pets: users can CRUD pets belonging to their clients
create policy "Users can view their own pets"
  on public.pets for select
  using (
    client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );

create policy "Users can insert their own pets"
  on public.pets for insert
  with check (
    client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );

create policy "Users can update their own pets"
  on public.pets for update
  using (
    client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );

create policy "Users can delete their own pets"
  on public.pets for delete
  using (
    client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );

-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- -----------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
