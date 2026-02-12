-- ============================================
-- Atomic health map operations via RPC
-- Eliminates read-modify-write race conditions
-- Run this in your Supabase SQL Editor
-- ============================================

-- Upsert a marker into the health_map JSONB array atomically
create or replace function public.upsert_health_map_marker(
  p_pet_id uuid,
  p_user_id uuid,
  p_marker jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_owner_id uuid;
  v_existing jsonb;
  v_marker_id text;
  v_updated jsonb;
  v_found boolean := false;
  v_i integer;
begin
  -- Verify ownership: pet -> client -> profile_id must match user
  select p.profile_id into v_owner_id
  from clients p
  inner join pets pt on pt.client_id = p.id
  where pt.id = p_pet_id;

  if v_owner_id is null or v_owner_id != p_user_id then
    raise exception 'Unauthorized';
  end if;

  v_marker_id := p_marker->>'id';

  -- Lock the row to prevent concurrent modifications
  select coalesce(health_map, '[]'::jsonb) into v_existing
  from pets
  where id = p_pet_id
  for update;

  -- Check if marker with this id already exists
  for v_i in 0..jsonb_array_length(v_existing) - 1 loop
    if v_existing->v_i->>'id' = v_marker_id then
      v_found := true;
      v_updated := v_existing;
      v_updated := jsonb_set(v_updated, array[v_i::text], p_marker);
      exit;
    end if;
  end loop;

  if not v_found then
    v_updated := v_existing || jsonb_build_array(p_marker);
  end if;

  update pets set health_map = v_updated where id = p_pet_id;
end;
$$;

-- Delete a marker from the health_map JSONB array atomically
create or replace function public.delete_health_map_marker(
  p_pet_id uuid,
  p_user_id uuid,
  p_marker_id text
)
returns void
language plpgsql
security definer
as $$
declare
  v_owner_id uuid;
  v_existing jsonb;
  v_updated jsonb := '[]'::jsonb;
  v_i integer;
begin
  -- Verify ownership
  select p.profile_id into v_owner_id
  from clients p
  inner join pets pt on pt.client_id = p.id
  where pt.id = p_pet_id;

  if v_owner_id is null or v_owner_id != p_user_id then
    raise exception 'Unauthorized';
  end if;

  -- Lock the row
  select coalesce(health_map, '[]'::jsonb) into v_existing
  from pets
  where id = p_pet_id
  for update;

  -- Rebuild array without the target marker
  for v_i in 0..jsonb_array_length(v_existing) - 1 loop
    if v_existing->v_i->>'id' != p_marker_id then
      v_updated := v_updated || jsonb_build_array(v_existing->v_i);
    end if;
  end loop;

  -- Set to null if empty, otherwise update
  if jsonb_array_length(v_updated) = 0 then
    update pets set health_map = null where id = p_pet_id;
  else
    update pets set health_map = v_updated where id = p_pet_id;
  end if;
end;
$$;
