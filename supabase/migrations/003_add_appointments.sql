-- ============================================
-- Appointments table for tracking visits & revenue
-- Run this in your Supabase SQL Editor
-- ============================================

create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  service text not null default 'Grooming',
  price numeric(10,2) default 0,
  notes text,
  completed_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Index for fast lookups by client and profile
create index idx_appointments_client_id on public.appointments(client_id);
create index idx_appointments_profile_id on public.appointments(profile_id);
create index idx_appointments_pet_id on public.appointments(pet_id);

-- Row Level Security
alter table public.appointments enable row level security;

create policy "Users can view their own appointments"
  on public.appointments for select
  using (profile_id = auth.uid());

create policy "Users can insert their own appointments"
  on public.appointments for insert
  with check (profile_id = auth.uid());

create policy "Users can update their own appointments"
  on public.appointments for update
  using (profile_id = auth.uid());

create policy "Users can delete their own appointments"
  on public.appointments for delete
  using (profile_id = auth.uid());
