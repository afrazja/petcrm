-- Pet photos table for gallery feature
create table public.pet_photos (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  profile_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  created_at timestamptz default now() not null
);

-- Index for fast lookups by pet
create index idx_pet_photos_pet_id on public.pet_photos(pet_id);

-- RLS
alter table public.pet_photos enable row level security;

create policy "Users can view their own pet photos"
  on public.pet_photos for select
  using (profile_id = auth.uid());

create policy "Users can insert their own pet photos"
  on public.pet_photos for insert
  with check (profile_id = auth.uid());

create policy "Users can delete their own pet photos"
  on public.pet_photos for delete
  using (profile_id = auth.uid());
